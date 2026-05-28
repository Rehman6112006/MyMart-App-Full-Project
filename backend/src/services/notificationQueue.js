// Notification Queue Processor
// Processes queued notifications asynchronously

const pool = require('../config/database');
const { sendEmail } = require('./emailService');
const { sendSMS } = require('./smsService');
const { sendWhatsApp } = require('./whatsappService');

let isProcessing = false;
let processorInterval = null;

// Start the queue processor
function startProcessor(intervalMs = 5000) {
    if (processorInterval) {
        console.log('⚠️ Queue processor already running');
        return;
    }

    console.log(`🚀 Starting notification queue processor (interval: ${intervalMs}ms)`);
    
    // Process immediately, then on interval
    processQueue();
    processorInterval = setInterval(processQueue, intervalMs);
}

// Stop the queue processor
function stopProcessor() {
    if (processorInterval) {
        clearInterval(processorInterval);
        processorInterval = null;
        console.log('🛑 Notification queue processor stopped');
    }
}

// Process pending notifications
async function processQueue() {
    if (isProcessing) {
        return; // Skip if already processing
    }

    isProcessing = true;

    try {
        // Get pending notifications (prioritize high priority first)
        const result = await pool.query(`
            SELECT * FROM notification_queue 
            WHERE status = 'pending' 
            AND attempts < max_attempts
            AND (scheduled_at IS NULL OR scheduled_at <= NOW())
            ORDER BY 
                CASE priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                created_at ASC
            LIMIT 10
        `);

        if (result.rows.length === 0) {
            isProcessing = false;
            return;
        }

        console.log(`📬 Processing ${result.rows.length} notifications...`);

        for (const item of result.rows) {
            await processNotification(item);
        }

    } catch (error) {
        console.error('❌ Queue processing error:', error);
    } finally {
        isProcessing = false;
    }
}

// Process single notification
async function processNotification(item) {
    const client = await pool.connect();
    const variables = item.variables || {};

    try {
        // Update status to processing
        await client.query(
            'UPDATE notification_queue SET status = $1, attempts = attempts + 1 WHERE id = $2',
            ['processing', item.id]
        );

        let result;
        const messageBody = replaceVariables(item.message_body, variables);

        switch (item.notification_type) {
            case 'email':
                result = await sendEmail(
                    item.recipient_email,
                    replaceVariables(item.subject, variables),
                    messageBody
                );
                break;

            case 'sms':
                result = await sendSMS(
                    item.recipient_phone,
                    messageBody
                );
                break;

            case 'whatsapp':
                result = await sendWhatsApp(
                    item.recipient_phone,
                    messageBody
                );
                break;

            default:
                throw new Error(`Unknown notification type: ${item.notification_type}`);
        }

        // Success - mark as sent
        await client.query(
            `UPDATE notification_queue 
             SET status = $1, sent_at = NOW(), external_id = $2 
             WHERE id = $3`,
            ['sent', result.sid || result.messageId || result.id, item.id]
        );

        // Log the notification
        await client.query(
            `INSERT INTO notification_logs 
             (notification_type, recipient_id, recipient_email, recipient_phone,
              template_name, subject, message_body, status, external_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', $8)`,
            [
                item.notification_type,
                item.recipient_id,
                item.recipient_email,
                item.recipient_phone,
                item.template_name,
                item.subject,
                messageBody,
                result.sid || result.messageId || result.id
            ]
        );

        console.log(`✅ Notification ${item.id} sent successfully`);

    } catch (error) {
        console.error(`❌ Notification ${item.id} failed:`, error.message);

        try {
            await client.query('BEGIN');
            
            // Check if max attempts reached
            const result = await client.query(
                'SELECT attempts, max_attempts FROM notification_queue WHERE id = $1',
                [item.id]
            );

            const newStatus = result.rows[0].attempts >= result.rows[0].max_attempts ? 'failed' : 'pending';

            await client.query(
                `UPDATE notification_queue 
                 SET status = $1, error_message = $2 
                 WHERE id = $3`,
                [newStatus, error.message, item.id]
            );

            await client.query('COMMIT');
        } catch (dbError) {
            await client.query('ROLLBACK');
            console.error('❌ Database error in queue processing:', dbError.message);
        }
    } finally {
        client.release();
    }
}

// Schedule notification for later
async function scheduleNotification(data, scheduledAt) {
    const result = await pool.query(
        `INSERT INTO notification_queue 
         (notification_type, recipient_id, recipient_email, recipient_phone,
          template_name, subject, message_body, variables, priority, scheduled_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending') RETURNING id`,
        [
            data.type,
            data.recipient_id,
            data.recipient_email,
            data.recipient_phone,
            data.template_name,
            data.subject,
            data.message,
            JSON.stringify(data.variables || {}),
            data.priority || 'normal',
            scheduledAt
        ]
    );

    return result.rows[0].id;
}

// Retry failed notifications
async function retryFailedNotifications(maxAgeHours = 24) {
    const result = await pool.query(`
        UPDATE notification_queue 
        SET status = 'pending', attempts = 0, error_message = NULL
        WHERE status = 'failed' 
        AND attempts < max_attempts
        AND updated_at >= NOW() - INTERVAL '${maxAgeHours} hours'
    `);

    console.log(`🔄 Reset ${result.rowCount} failed notifications for retry`);
    return result.rowCount;
}

// Get queue statistics
async function getQueueStats() {
    const statusResult = await pool.query(`
        SELECT status, COUNT(*) as count, 
               SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent
        FROM notification_queue
        GROUP BY status
    `);

    const totalsResult = await pool.query(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN attempts > 0 THEN 1 ELSE 0 END) as attempted,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM notification_queue
        WHERE created_at >= NOW() - INTERVAL '24 hours'
    `);

    const recentLogsResult = await pool.query(`
        SELECT notification_type, status, COUNT(*) as count
        FROM notification_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY notification_type, status
    `);

    return {
        queueStatus: statusResult.rows,
        totals24h: totalsResult.rows[0],
        recentLogs: recentLogsResult.rows
    };
}

// Clean up old processed notifications
async function cleanupOldNotifications(daysToKeep = 30) {
    const result = await pool.query(`
        DELETE FROM notification_queue 
        WHERE status IN ('sent', 'failed')
        AND updated_at < NOW() - INTERVAL '${daysToKeep} days'
    `);

    console.log(`🗑️ Cleaned up ${result.rowCount} old queue items`);
    return result.rowCount;
}

// Helper function
function replaceVariables(template, variables) {
    if (!template || !variables) return template;
    
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    return result;
}

module.exports = {
    startProcessor,
    stopProcessor,
    processQueue,
    processNotification,
    scheduleNotification,
    retryFailedNotifications,
    getQueueStats,
    cleanupOldNotifications
};
