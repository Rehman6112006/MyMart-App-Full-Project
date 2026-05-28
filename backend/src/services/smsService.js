// SMS Service - Twilio / AWS SNS / Custom Gateway support

// Initialize Twilio client if configured
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    const twilio = require('twilio');
    twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
    );
}

// Send SMS via Twilio
async function sendSMSViaTwilio(to, message) {
    if (!twilioClient) {
        throw new Error('Twilio client not configured');
    }

    try {
        const result = await twilioClient.messages.create({
            body: message,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formatPhoneNumber(to)
        });

        console.log(`✅ SMS sent via Twilio to ${to}: ${result.sid}`);
        
        return {
            success: true,
            sid: result.sid,
            status: result.status,
            provider: 'twilio'
        };
    } catch (error) {
        console.error('❌ Twilio SMS error:', error);
        throw error;
    }
}

// Send SMS via AWS SNS (using REST API)
async function sendSMSViaSNS(to, message) {
    const fetch = require('node-fetch');
    
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    try {
        // AWS SNS REST API endpoint
        const endpoint = `https://sns.${region}.amazonaws.com/`;
        
        // Create signed request (simplified - in production use AWS Signature V4)
        const params = {
            Action: 'Publish',
            Version: '2010-03-31',
            PhoneNumber: formatPhoneNumber(to),
            Message: message,
            MessageType: 'Transactional'
        };

        // Build query string
        const queryString = Object.entries(params)
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');

        const response = await fetch(`${endpoint}?${queryString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${accessKeyId}:${secretAccessKey}`).toString('base64')}`
            }
        });

        const data = await response.text();
        
        // Extract message ID from response
        const messageIdMatch = data.match(/<MessageId>(.*?)<\/MessageId>/);
        const messageId = messageIdMatch ? messageIdMatch[1] : `sns-${Date.now()}`;
        
        console.log(`✅ SMS sent via AWS SNS to ${to}: ${messageId}`);
        
        return {
            success: true,
            messageId: messageId,
            provider: 'aws-sns'
        };
    } catch (error) {
        console.error('❌ AWS SNS SMS error:', error);
        throw error;
    }
}

// Send SMS via custom gateway (generic HTTP API)
async function sendSMSViaGateway(to, message) {
    const fetch = require('node-fetch');
    
    const gatewayUrl = process.env.SMS_GATEWAY_URL;
    const gatewayApiKey = process.env.SMS_GATEWAY_API_KEY;
    
    if (!gatewayUrl) {
        throw new Error('SMS gateway not configured');
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
                message: message,
                type: 'transactional'
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Gateway request failed');
        }

        console.log(`✅ SMS sent via gateway to ${to}`);
        
        return {
            success: true,
            messageId: data.id || data.message_id,
            provider: 'custom-gateway'
        };
    } catch (error) {
        console.error('❌ SMS Gateway error:', error);
        throw error;
    }
}

// Main sendSMS function - auto-selects provider
async function sendSMS(to, message) {
    // Check which provider is configured
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        return sendSMSViaTwilio(to, message);
    } else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return sendSMSViaSNS(to, message);
    } else if (process.env.SMS_GATEWAY_URL) {
        return sendSMSViaGateway(to, message);
    } else {
        // Fallback: Log to console (for development)
        console.log(`📱 [DEV] SMS to ${to}: ${message}`);
        return {
            success: true,
            messageId: `dev-${Date.now()}`,
            provider: 'development'
        };
    }
}

// Send bulk SMS
async function sendBulkSMS(recipients) {
    const results = {
        sent: [],
        failed: []
    };

    for (const recipient of recipients) {
        try {
            await sendSMS(recipient.phone, replaceVariables(recipient.message, recipient.variables));
            results.sent.push(recipient.phone);
        } catch (error) {
            results.failed.push({ phone: recipient.phone, error: error.message });
        }
    }

    return results;
}

// Format phone number to E.164 format
function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let digits = phone.replace(/\D/g, '');
    
    // If doesn't start with +, add appropriate country code
    if (!phone.startsWith('+')) {
        // Default to India (+91) if not specified
        const countryCode = process.env.SMS_COUNTRY_CODE || '91';
        if (digits.length === 10) {
            digits = countryCode + digits;
        } else if (digits.length === 11 && digits.startsWith('0')) {
            digits = countryCode + digits.substring(1);
        }
    } else {
        digits = digits.substring(1);
    }
    
    return '+' + digits;
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

// Verify SMS configuration
async function verifySMSConfig() {
    if (process.env.TWILIO_ACCOUNT_SID) {
        try {
            await twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            console.log('✅ Twilio SMS configuration verified');
            return true;
        } catch (error) {
            console.error('❌ Twilio configuration error:', error);
            return false;
        }
    }
    return true;
}

module.exports = {
    sendSMS,
    sendBulkSMS,
    formatPhoneNumber,
    verifySMSConfig,
    replaceVariables,
    sendSMSViaTwilio,
    sendSMSViaSNS,
    sendSMSViaGateway
};
