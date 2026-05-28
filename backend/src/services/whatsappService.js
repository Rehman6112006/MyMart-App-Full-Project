// WhatsApp Service - Twilio WhatsApp / Meta Cloud API / Custom Gateway

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    const twilio = require('twilio');
    twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Send WhatsApp message via Twilio
async function sendWhatsAppViaTwilio(to, body, header = null, headerType = 'text') {
    if (!twilioClient) {
        throw new Error('Twilio client not configured');
    }

    try {
        const from = `whatsapp:${process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER}`;
        const toFormatted = `whatsapp:${formatPhoneNumber(to)}`;

        let messageContent = body;
        
        // Handle media if header_type is image/video/document
        if (headerType !== 'none' && headerType !== 'text' && header) {
            // For Twilio WhatsApp with media, use a template
            // Note: Twilio WhatsApp requires pre-approved templates for media
            const mediaUrl = headerType === 'image' ? header : null;
            
            const result = await twilioClient.messages.create({
                body: body,
                from: from,
                to: toFormatted,
                mediaUrl: mediaUrl ? [mediaUrl] : undefined
            });

            console.log(`✅ WhatsApp sent via Twilio to ${to}: ${result.sid}`);
            
            return {
                success: true,
                sid: result.sid,
                status: result.status,
                provider: 'twilio-whatsapp'
            };
        }

        const result = await twilioClient.messages.create({
            body: body,
            from: from,
            to: toFormatted
        });

        console.log(`✅ WhatsApp sent via Twilio to ${to}: ${result.sid}`);
        
        return {
            success: true,
            sid: result.sid,
            status: result.status,
            provider: 'twilio-whatsapp'
        };
    } catch (error) {
        console.error('❌ Twilio WhatsApp error:', error);
        throw error;
    }
}

// Send WhatsApp via Meta Cloud API
async function sendWhatsAppViaMeta(to, body, header = null, headerType = 'text') {
    const fetch = require('node-fetch');
    
    const phoneNumberId = process.env.META_WHATSAPP_PHONE_ID;
    const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
    
    if (!phoneNumberId || !accessToken) {
        throw new Error('Meta WhatsApp not configured');
    }

    try {
        const recipientPhone = formatPhoneNumber(to);
        
        // Build message payload based on header type
        let messagePayload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientPhone,
            type: 'text',
            text: { body: body }
        };

        // Handle different header types
        if (headerType === 'image' && header) {
            messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientPhone,
                type: 'image',
                image: {
                    link: header,
                    caption: body
                }
            };
        } else if (headerType === 'video' && header) {
            messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientPhone,
                type: 'video',
                video: {
                    link: header,
                    caption: body
                }
            };
        } else if (headerType === 'document' && header) {
            messagePayload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: recipientPhone,
                type: 'document',
                document: {
                    link: header,
                    caption: body
                }
            };
        }

        const response = await fetch(
            `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify(messagePayload)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Meta API request failed');
        }

        console.log(`✅ WhatsApp sent via Meta to ${to}: ${data.messages[0].id}`);
        
        return {
            success: true,
            messageId: data.messages[0].id,
            provider: 'meta-whatsapp'
        };
    } catch (error) {
        console.error('❌ Meta WhatsApp error:', error);
        throw error;
    }
}

// Send WhatsApp via custom gateway
async function sendWhatsAppViaGateway(to, body, header = null, headerType = 'none') {
    const fetch = require('node-fetch');
    
    const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL;
    const gatewayApiKey = process.env.WHATSAPP_GATEWAY_API_KEY;
    
    if (!gatewayUrl) {
        throw new Error('WhatsApp gateway not configured');
    }

    try {
        const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gatewayApiKey}`
            },
            body: JSON.stringify({
                to: formatPhoneNumber(to),
                message: body,
                header: header,
                header_type: headerType
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Gateway request failed');
        }

        console.log(`✅ WhatsApp sent via gateway to ${to}`);
        
        return {
            success: true,
            messageId: data.id || data.message_id,
            provider: 'custom-gateway'
        };
    } catch (error) {
        console.error('❌ WhatsApp Gateway error:', error);
        throw error;
    }
}

// Main sendWhatsApp function - auto-selects provider
async function sendWhatsApp(to, body, header = null, headerType = 'none') {
    // Check which provider is configured
    if (process.env.META_WHATSAPP_ACCESS_TOKEN && process.env.META_WHATSAPP_PHONE_ID) {
        return sendWhatsAppViaMeta(to, body, header, headerType);
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return sendWhatsAppViaTwilio(to, body, header, headerType);
    } else if (process.env.WHATSAPP_GATEWAY_URL) {
        return sendWhatsAppViaGateway(to, body, header, headerType);
    } else {
        // Fallback: Log to console (for development)
        console.log(`📱 [DEV] WhatsApp to ${to}: ${body}`);
        return {
            success: true,
            messageId: `dev-${Date.now()}`,
            provider: 'development'
        };
    }
}

// Send bulk WhatsApp messages
async function sendBulkWhatsApp(recipients) {
    const results = {
        sent: [],
        failed: []
    };

    for (const recipient of recipients) {
        try {
            await sendWhatsApp(
                recipient.phone,
                replaceVariables(recipient.message, recipient.variables),
                recipient.header,
                recipient.headerType
            );
            results.sent.push(recipient.phone);
        } catch (error) {
            results.failed.push({ phone: recipient.phone, error: error.message });
        }
    }

    return results;
}

// Format phone number for WhatsApp
function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // Ensure proper format
    if (!phone.startsWith('+')) {
        const countryCode = process.env.WHATSAPP_COUNTRY_CODE || '91';
        if (digits.length === 10) {
            digits = countryCode + digits;
        }
    } else {
        digits = digits.substring(1);
    }
    
    return digits;
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

// Send template message (for pre-approved templates)
async function sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
    if (process.env.META_WHATSAPP_ACCESS_TOKEN) {
        return sendWhatsAppTemplateViaMeta(to, templateName, languageCode, components);
    } else if (process.env.TWILIO_ACCOUNT_SID) {
        return sendWhatsAppTemplateViaTwilio(to, templateName, components);
    }
    
    console.log(`📱 [DEV] Template ${templateName} to ${to}`);
    return { success: true, messageId: `dev-${Date.now()}` };
}

async function sendWhatsAppTemplateViaMeta(to, templateName, languageCode, components) {
    const fetch = require('node-fetch');
    
    const response = await fetch(
        `https://graph.facebook.com/v18.0/${process.env.META_WHATSAPP_PHONE_ID}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: formatPhoneNumber(to),
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: languageCode },
                    components: components
                }
            })
        }
    );

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Template send failed');
    }
    
    return { success: true, messageId: data.messages[0].id };
}

async function sendWhatsAppTemplateViaTwilio(to, templateName, components) {
    // Twilio WhatsApp templates are handled differently
    const body = components[0]?.text || 'Template message';
    return sendWhatsAppViaTwilio(to, body);
}

module.exports = {
    sendWhatsApp,
    sendBulkWhatsApp,
    sendTemplateMessage,
    formatPhoneNumber,
    replaceVariables
};
