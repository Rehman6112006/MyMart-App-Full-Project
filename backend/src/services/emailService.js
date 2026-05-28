const notificationService = require('./notificationService');

const sendEmail = async (to, subject, htmlBody, textBody) => {
  try {
    const result = await notificationService.sendEmail({ to, subject, html: htmlBody, text: textBody });
    return { success: true, messageId: result?.messageId || `email-${Date.now()}` };
  } catch (error) {
    console.error('Email service error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
