// ==================== NOTIFICATION SERVICE ====================
// Email, SMS & WhatsApp Notifications using SendGrid

const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
      console.log('📧 SendGrid not configured - would send to:', to);
      console.log('   Subject:', subject);
      return { success: true, mock: true };
    }

    const msg = {
      to: to,
      from: {
        email: process.env.SENDGRID_SENDER_EMAIL,
        name: process.env.SENDGRID_SENDER_NAME || 'MyMart'
      },
      subject: subject,
      text: text || '',
      html: html || ''
    };

    const [response] = await sgMail.send(msg);
    console.log(`✅ Email sent to ${to}: ${response.statusCode}`);
    return { success: true, messageId: response.messageId };

  } catch (error) {
    console.error('❌ Email error:', error?.response?.body || error.message);
    return { success: false, error: error?.response?.body?.errors?.[0]?.message || error.message };
  }
};

const sendEmailWithTemplate = async ({ to, subject, html }) => {
  return sendEmail({ to, subject, html, text: '' });
};

const verifyEmailConfig = async () => {
  try {
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
      console.log('⚠️ SendGrid not configured. Set SENDGRID_API_KEY and SENDGRID_SENDER_EMAIL in .env');
      return false;
    }
    console.log('✅ SendGrid configured successfully');
    return true;
  } catch (error) {
    console.error('❌ SendGrid error:', error.message);
    return false;
  }
};

const sendSMS = async ({ to, message }) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('📱 SMS not configured - would send to:', to);
      console.log('   Message:', message);
      return { success: true, mock: true };
    }

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const https = require('https');
    const data = JSON.stringify({
      To: to,
      From: process.env.TWILIO_PHONE_NUMBER,
      Body: message
    });

    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        console.log(`📱 SMS sent to ${to}, Status: ${res.statusCode}`);
        resolve({ success: res.statusCode === 201, statusCode: res.statusCode });
      });
      req.on('error', (e) => {
        console.error('SMS error:', e.message);
        resolve({ success: false, error: e.message });
      });
      req.write(data);
      req.end();
    });

  } catch (error) {
    console.error('SMS service error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendWhatsApp = async ({ to, message }) => {
  try {
    if (!process.env.TWILIO_WHATSAPP_FROM) {
      console.log('💬 WhatsApp not configured - would send to:', to);
      console.log('   Message:', message);
      return { success: true, mock: true };
    }

    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const https = require('https');
    const data = JSON.stringify({
      From: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      To: `whatsapp:${to}`,
      ContentSid: process.env.TWILIO_TEMPLATE_SID || '',
      ContentVariables: JSON.stringify({ '1': message }),
      Body: message
    });

    const options = {
      hostname: 'api.twilio.com',
      path: `/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        console.log(`💬 WhatsApp sent to ${to}, Status: ${res.statusCode}`);
        resolve({ success: res.statusCode === 201, statusCode: res.statusCode });
      });
      req.on('error', (e) => {
        console.error('WhatsApp error:', e.message);
        resolve({ success: false, error: e.message });
      });
      req.write(data);
      req.end();
    });

  } catch (error) {
    console.error('WhatsApp service error:', error.message);
    return { success: false, error: error.message };
  }
};

const notifyOrderConfirmation = async (user, order) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Order Confirmed! 🎉</h2>
      <p>Hi ${user.first_name},</p>
      <p>Your order <strong>#${order.order_number}</strong> has been placed successfully!</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Total Amount:</strong> ₹${order.total_amount}</p>
        <p><strong>Payment Status:</strong> ${order.payment_status}</p>
      </div>
      <p>We'll notify you when your order ships.</p>
      <p>Thank you for shopping with <strong>MyMart</strong>!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Order Confirmed - #${order.order_number}`,
    html: emailHtml,
    text: `Order ${order.order_number} confirmed. Total: ₹${order.total_amount}. Thank you for shopping with MyMart!`
  });
  
  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `MyMart: Order #${order.order_number} confirmed! Total: ₹${order.total_amount}. Thank you!`
    });
  }
};

const notifyOrderShipped = async (user, order, trackingNumber) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2196F3;">Your Order is On the Way! 📦</h2>
      <p>Hi ${user.first_name},</p>
      <p>Great news! Your order <strong>#${order.order_number}</strong> has been shipped.</p>
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
      </div>
      <p>Track your package in real-time using the tracking number above!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Order Shipped - #${order.order_number}`,
    html: emailHtml
  });
  
  if (user.phone) {
    await sendSMS({
      to: user.phone,
      message: `MyMart: Your order #${order.order_number} is shipped! Tracking: ${trackingNumber}`
    });
  }
};

const notifyOrderDelivered = async (user, order) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Order Delivered! ✅</h2>
      <p>Hi ${user.first_name},</p>
      <p>Your order <strong>#${order.order_number}</strong> has been delivered!</p>
      <p>We hope you love your purchase. Please leave a review!</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Order Delivered - #${order.order_number}`,
    html: emailHtml
  });
};

const notifyPaymentReceived = async (vendor, amount, orderNumber) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Payment Received! 💰</h2>
      <p>Hi ${vendor.store_name},</p>
      <p>You've received a payment of <strong>₹${amount}</strong> for order #${orderNumber}.</p>
      <p>Amount will be credited to your account after commission deduction.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: vendor.email,
    subject: `Payment Received - ₹${amount}`,
    html: emailHtml
  });
};

const notifyVendorNewOrder = async (vendor, order) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF9800;">New Order Received! 🛒</h2>
      <p>Hi ${vendor.store_name},</p>
      <p>You have a new order <strong>#${order.order_number}</strong>.</p>
      <p>Please process it quickly!</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: vendor.email,
    subject: `New Order - #${order.order_number}`,
    html: emailHtml
  });
};

const notifyVendorReview = async (vendor, product, rating) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FFC107;">New Review! ⭐</h2>
      <p>Hi ${vendor.store_name},</p>
      <p>You received a ${rating}-star review for "${product}".</p>
      <p>Login to respond to the review.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: vendor.email,
    subject: `New ${rating}-Star Review`,
    html: emailHtml
  });
};

const notifyPasswordReset = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>Hi ${user.first_name},</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Reset Password</a>
      </div>
      <p><strong>Important:</strong> This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Password Reset - MyMart',
    html: emailHtml
  });
};

const notifyReturnRequested = async (user, order, product) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #FF9800;">Return Request Submitted 📦</h2>
      <p>Hi ${user.first_name},</p>
      <p>Your return request for "${product}" in order #${order.order_number} has been submitted.</p>
      <p>We'll process it within 2-3 business days.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Return Request Submitted',
    html: emailHtml
  });
};

const notifyRefundProcessed = async (user, amount, orderNumber) => {
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Refund Processed! 💵</h2>
      <p>Hi ${user.first_name},</p>
      <p>Your refund of <strong>₹${amount}</strong> for order #${orderNumber} has been processed.</p>
      <p>Amount will be credited to your account within 5-7 business days.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: `Refund Processed - ₹${amount}`,
    html: emailHtml
  });
};

const notifyAccountVerification = async (user, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
  
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to MyMart! 🎉</h2>
      <p>Hi ${user.first_name},</p>
      <p>Thank you for registering with MyMart. Please verify your email address:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Verify Email</a>
      </div>
      <p>If you didn't create an account, please ignore this email.</p>
      <p style="color: #666; font-size: 12px;">This is an automated email from MyMart.</p>
    </div>
  `;
  
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email - MyMart',
    html: emailHtml
  });
};

module.exports = {
  sendEmail,
  sendEmailWithTemplate,
  verifyEmailConfig,
  sendSMS,
  sendWhatsApp,
  notifyOrderConfirmation,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyPaymentReceived,
  notifyVendorNewOrder,
  notifyVendorReview,
  notifyPasswordReset,
  notifyReturnRequested,
  notifyRefundProcessed,
  notifyAccountVerification
};

console.log('✅ Notification Service Loaded - SendGrid + Twilio (SMS/WhatsApp)');
