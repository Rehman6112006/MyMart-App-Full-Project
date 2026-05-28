const pool = require('../config/database');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');
const { sendWhatsApp } = require('../services/whatsappService');

// Get user notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, unread_only } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT id, type, title, message, is_read, data, created_at
            FROM notifications
            WHERE user_id = $1
        `;
        const params = [userId];

        if (unread_only === 'true') {
            query += ' AND is_read = false';
        }

        query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);

        const result = await pool.query(query, params);

        // Get unread count
        const unreadCount = await pool.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        );

        res.json({
            success: true,
            count: result.rows.length,
            unread_count: parseInt(unreadCount.rows[0].count),
            notifications: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Mark all notifications as read
exports.markAllRead = async (req, res) => {
    try {
        const userId = req.user.id;
        
        await pool.query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1',
            [userId]
        );

        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Get all notification templates
exports.getTemplates = async (req, res) => {
    try {
        const { type } = req.query;
        
        let query = 'SELECT * FROM notification_templates WHERE is_active = true';
        const params = [];
        
        if (type) {
            query += ' AND template_type = $1';
            params.push(type);
        }
        
        query += ' ORDER BY template_name ASC';
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Create notification template
exports.createTemplate = async (req, res) => {
    try {
        const { template_name, template_type, subject, template_body, variables } = req.body;
        
        const result = await pool.query(
            `INSERT INTO notification_templates (template_name, template_type, subject, template_body, variables)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [template_name, template_type, subject, template_body, JSON.stringify(variables || [])]
        );
        
        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            templateId: result.rows[0].id
        });
    } catch (error) {
        console.error('Create template error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Send notification (unified endpoint)
exports.sendNotification = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { type, recipient_id, recipient_email, recipient_phone, template_name, subject, message, variables, priority } = req.body;
        
        await client.query('BEGIN');
        
        // Insert into notification queue
        const result = await client.query(
            `INSERT INTO notification_queue 
             (notification_type, recipient_id, recipient_email, recipient_phone, 
              template_name, subject, message_body, variables, priority, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING id`,
            [type, recipient_id, recipient_email, recipient_phone, template_name, subject, message, JSON.stringify(variables || {}), priority || 'normal']
        );
        
        await client.query('COMMIT');
        
        // Send immediately for high priority
        if (priority === 'urgent' || priority === 'high') {
            await processQueueItem(result.rows[0].id);
        }
        
        res.status(201).json({
            success: true,
            message: 'Notification queued successfully',
            queueId: result.rows[0].id
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Send notification error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
};

// Send email notification
exports.sendEmailNotification = async (req, res) => {
    try {
        const { to, subject, template_name, variables, html, text } = req.body;
        
        let htmlBody = html;
        let textBody = text;
        let emailSubject = subject;
        
        // Get template if provided
        if (template_name) {
            const result = await pool.query(
                'SELECT * FROM email_templates WHERE template_name = $1 AND is_active = true',
                [template_name]
            );
            
            if (result.rows.length > 0) {
                const template = result.rows[0];
                htmlBody = replaceVariables(template.html_body, variables);
                textBody = replaceVariables(template.text_body, variables);
                emailSubject = replaceVariables(subject || template.subject, variables);
            }
        }
        
        const result = await sendEmail(to, emailSubject, htmlBody, textBody);
        
        // Log notification
        await pool.query(
            `INSERT INTO notification_logs 
             (notification_type, recipient_email, template_name, subject, message_body, status, external_id)
             VALUES ('email', $1, $2, $3, $4, 'sent', $5)`,
            [to, template_name, emailSubject, htmlBody, result.messageId]
        );
        
        res.json({
            success: true,
            message: 'Email sent successfully',
            messageId: result.messageId
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Send SMS notification
exports.sendSMSNotification = async (req, res) => {
    try {
        const { to, template_name, variables, message } = req.body;
        
        let smsMessage = message;
        
        // Get template if provided
        if (template_name) {
            const result = await pool.query(
                'SELECT * FROM sms_templates WHERE template_name = $1 AND is_active = true',
                [template_name]
            );
            
            if (result.rows.length > 0) {
                smsMessage = replaceVariables(result.rows[0].message_body, variables);
            }
        }
        
        const result = await sendSMS(to, smsMessage);
        
        // Log notification
        await pool.query(
            `INSERT INTO notification_logs 
             (notification_type, recipient_phone, template_name, message_body, status, external_id)
             VALUES ('sms', $1, $2, $3, 'sent', $4)`,
            [to, template_name, smsMessage, result.sid || result.messageId]
        );
        
        res.json({
            success: true,
            message: 'SMS sent successfully',
            sid: result.sid || result.messageId
        });
    } catch (error) {
        console.error('Send SMS error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Send WhatsApp notification
exports.sendWhatsAppNotification = async (req, res) => {
    try {
        const { to, template_name, variables, message, header_content } = req.body;
        
        let whatsappMessage = message;
        let headerType = 'none';
        let header = header_content;
        
        // Get template if provided
        if (template_name) {
            const result = await pool.query(
                'SELECT * FROM whatsapp_templates WHERE template_name = $1 AND is_active = true',
                [template_name]
            );
            
            if (result.rows.length > 0) {
                const template = result.rows[0];
                headerType = template.header_type;
                header = header_content || template.header_content;
                whatsappMessage = replaceVariables(template.message_body, variables);
            }
        }
        
        const result = await sendWhatsApp(to, whatsappMessage, header, headerType);
        
        // Log notification
        await pool.query(
            `INSERT INTO notification_logs 
             (notification_type, recipient_phone, template_name, message_body, status, external_id)
             VALUES ('whatsapp', $1, $2, $3, 'sent', $4)`,
            [to, template_name, whatsappMessage, result.sid || result.messageId]
        );
        
        res.json({
            success: true,
            message: 'WhatsApp message sent successfully',
            sid: result.sid || result.messageId
        });
    } catch (error) {
        console.error('Send WhatsApp error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Get notification logs
exports.getLogs = async (req, res) => {
    try {
        const { type, status, start_date, end_date, page = 1, limit = 50 } = req.query;
        
        let query = 'SELECT * FROM notification_logs WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        
        if (type) {
            query += ` AND notification_type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        if (start_date) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(start_date);
            paramIndex++;
        }
        
        if (end_date) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(end_date);
            paramIndex++;
        }
        
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);
        
        const result = await pool.query(query, params);
        
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM notification_logs WHERE 1=1';
        const countParams = [];
        let countIndex = 1;
        
        if (type) {
            countQuery += ` AND notification_type = $${countIndex}`;
            countParams.push(type);
            countIndex++;
        }
        if (status) {
            countQuery += ` AND status = $${countIndex}`;
            countParams.push(status);
        }
        
        const countResult = await pool.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Get queue status
exports.getQueueStatus = async (req, res) => {
    try {
        const statusResult = await pool.query(`
            SELECT 
                status,
                COUNT(*) as count,
                SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent
            FROM notification_queue
            GROUP BY status
        `);
        
        const totalsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM notification_queue
        `);
        
        res.json({
            success: true,
            statusCounts: statusResult.rows,
            totals: totalsResult.rows[0]
        });
    } catch (error) {
        console.error('Get queue status error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Get user notification preferences
exports.getPreferences = async (req, res) => {
    try {
        const { user_id } = req.params;
        
        const result = await pool.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [user_id]
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Update user notification preferences
exports.updatePreferences = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { user_id } = req.params;
        const { preferences } = req.body;
        
        await client.query('BEGIN');
        
        // Delete existing preferences
        await client.query(
            'DELETE FROM notification_preferences WHERE user_id = $1',
            [user_id]
        );
        
        // Insert new preferences
        for (const pref of preferences) {
            await client.query(
                `INSERT INTO notification_preferences 
                 (user_id, notification_type, category, enabled)
                 VALUES ($1, $2, $3, $4)`,
                [user_id, pref.notification_type, pref.category, pref.enabled !== false]
            );
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: 'Preferences updated successfully'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update preferences error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
};

// Register push token
exports.registerPushToken = async (req, res) => {
    try {
        const { user_id, device_token, device_type } = req.body;
        
        // Upsert push token
        await pool.query(
            `INSERT INTO push_tokens (user_id, device_token, device_type, last_used_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (device_token) 
             DO UPDATE SET 
                device_type = EXCLUDED.device_type,
                last_used_at = NOW(),
                is_active = true`,
            [user_id, device_token, device_type]
        );
        
        res.json({
            success: true,
            message: 'Push token registered successfully'
        });
    } catch (error) {
        console.error('Register push token error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Send push notification
exports.sendPushNotification = async (req, res) => {
    try {
        const { user_id, title, body, data } = req.body;
        
        // Get user's push tokens
        const tokensResult = await pool.query(
            'SELECT * FROM push_tokens WHERE user_id = $1 AND is_active = true',
            [user_id]
        );
        
        if (tokensResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No push tokens found for user'
            });
        }
        
        const results = [];
        
        for (const token of tokensResult.rows) {
            // Send push notification based on device type
            const result = await sendPush(token.device_token, token.device_type, title, body, data);
            results.push(result);
            
            // Log push notification
            await pool.query(
                `INSERT INTO push_notifications 
                 (user_id, title, body, data, status, external_id)
                 VALUES ($1, $2, $3, $4, 'sent', $5)`,
                [user_id, title, body, JSON.stringify(data), result.id]
            );
        }
        
        res.json({
            success: true,
            message: `Push notification sent to ${results.length} devices`,
            results
        });
    } catch (error) {
        console.error('Send push error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Send push notification (placeholder - implement FCM/APNS)
async function sendPush(deviceToken, deviceType, title, body, data) {
    console.log(`📲 [DEV] Push to ${deviceType}: ${title} - ${body}`);
    return { success: true, id: `push-${Date.now()}` };
}

// Helper function to replace variables in template
function replaceVariables(template, variables) {
    if (!template || !variables) return template;
    
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
}

// Process queue item (internal function)
async function processQueueItem(queueId) {
    try {
        const result = await pool.query(
            'SELECT * FROM notification_queue WHERE id = $1',
            [queueId]
        );
        
        if (result.rows.length === 0) return;
        
        const item = result.rows[0];
        const variables = item.variables || {};
        
        await pool.query(
            'UPDATE notification_queue SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['processing', queueId]
        );
        
        let sendResult;
        
        switch (item.notification_type) {
            case 'email':
                sendResult = await sendEmail(item.recipient_email, item.subject, 
                    replaceVariables(item.message_body, variables));
                break;
            case 'sms':
                sendResult = await sendSMS(item.recipient_phone, 
                    replaceVariables(item.message_body, variables));
                break;
            case 'whatsapp':
                sendResult = await sendWhatsApp(item.recipient_phone, 
                    replaceVariables(item.message_body, variables));
                break;
        }
        
        await pool.query(
            'UPDATE notification_queue SET status = $1, sent_at = NOW() WHERE id = $2',
            ['sent', queueId]
        );
        
    } catch (error) {
        await pool.query(
            `UPDATE notification_queue 
             SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE status END,
                 error_message = $1
             WHERE id = $2`,
            [error.message, queueId]
        );
    }
}

// Send order confirmation notification (convenience function)
exports.sendOrderConfirmation = async (orderId) => {
    try {
        const result = await pool.query(`
            SELECT o.*, u.first_name, u.last_name, u.email, u.phone
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (result.rows.length === 0) return;
        
        const order = result.rows[0];
        const customerName = `${order.first_name} ${order.last_name}`;
        
        const variables = {
            customer_name: customerName,
            order_number: order.order_number,
            total_amount: order.total_amount
        };
        
        // Queue email and SMS
        await exports.sendNotification({
            body: {
                type: 'email',
                recipient_email: order.email,
                template_name: 'order_confirmation',
                subject: 'Order Confirmation',
                variables
            }
        }, { json: () => {} });
        
        await exports.sendSMSNotification({
            body: {
                to: order.phone,
                template_name: 'order_placed',
                variables: {
                    order_number: order.order_number,
                    total: order.total_amount
                }
            }
        }, { json: () => {} });
        
    } catch (error) {
        console.error('Send order confirmation error:', error);
    }
};

// Send order shipped notification
exports.sendOrderShipped = async (orderId, trackingNumber, carrier) => {
    try {
        const result = await pool.query(`
            SELECT o.*, u.first_name, u.last_name, u.email, u.phone
            FROM orders o
            JOIN users u ON o.customer_id = u.id
            WHERE o.id = $1
        `, [orderId]);
        
        if (result.rows.length === 0) return;
        
        const order = result.rows[0];
        const customerName = `${order.first_name} ${order.last_name}`;
        
        // Queue email and SMS
        await exports.sendEmailNotification({
            body: {
                to: order.email,
                template_name: 'order_shipped',
                variables: {
                    customer_name: customerName,
                    order_number: order.order_number,
                    tracking_number: trackingNumber,
                    carrier: carrier
                }
            }
        }, { json: () => {} });
        
        await exports.sendSMSNotification({
            body: {
                to: order.phone,
                template_name: 'order_shipped',
                variables: {
                    order_number: order.order_number,
                    carrier: carrier,
                    tracking: trackingNumber
                }
            }
        }, { json: () => {} });
        
    } catch (error) {
        console.error('Send order shipped error:', error);
    }
};

// ==================== NOTIFICATION HELPERS FOR RETURNS & DISPUTES ====================

exports.notifyAdminReturn = async (adminId, customerName, reason) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'return_request', 'New Return Request',
             $2, $3)`,
            [adminId, `${customerName} submitted a return request: ${reason}`,
             JSON.stringify({ type: 'return', customerName, reason })]
        );
    } catch (error) {
        console.error('notifyAdminReturn error:', error.message);
    }
};

exports.notifyVendorReturn = async (vendorId, reason, orderId) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'return_request', 'Return Request on Your Product',
             $2, $3)`,
            [vendorId, `A customer requested a return on order #${orderId}: ${reason}`,
             JSON.stringify({ type: 'return', orderId, reason })]
        );
    } catch (error) {
        console.error('notifyVendorReturn error:', error.message);
    }
};

exports.notifyAdminDispute = async (adminId, customerId, orderNumber, reason) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'dispute_opened', 'New Dispute Filed',
             $2, $3)`,
            [adminId, `Customer opened a dispute on order #${orderNumber}: ${reason}`,
             JSON.stringify({ type: 'dispute', customerId, orderNumber, reason })]
        );
    } catch (error) {
        console.error('notifyAdminDispute error:', error.message);
    }
};

exports.notifyCustomerDispute = async (customerId, orderNumber) => {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, type, title, message, data)
             VALUES ($1, 'dispute_update', 'Dispute Update',
             $2, $3)`,
            [customerId, `Your dispute on order #${orderNumber} has been received. We will review it shortly.`,
             JSON.stringify({ type: 'dispute', orderNumber })]
        );
    } catch (error) {
        console.error('notifyCustomerDispute error:', error.message);
    }
};
