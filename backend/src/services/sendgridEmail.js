const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTPEmail = async (email, otp) => {
  try {
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_SENDER_EMAIL,
        name: 'MyMart'
      },
      subject: 'MyMart Verification Code - ' + otp,
      text: `Your verification code for MyMart is: ${otp}

This code expires in 15 minutes.

If you didn't request this code, please ignore this email.

- MyMart Team`,
      html: `
        <p>Your verification code for MyMart is:</p>
        <h1 style="font-size:32px;letter-spacing:8px;color:#70C85A;">${otp}</h1>
        <p>This code expires in 15 minutes.</p>
        <hr>
        <p style="color:#666;font-size:12px;">If you didn't request this code, please ignore this email.</p>
      `
    };

    const [response] = await sgMail.send(msg);
    console.log(`✅ SendGrid: Email sent to ${email}, Status: ${response.statusCode}`);
    return { success: true, statusCode: response.statusCode };

  } catch (error) {
    console.error('❌ SendGrid error:', error?.response?.body || error.message);
    return { success: false, error: error?.response?.body?.errors?.[0]?.message || error.message };
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
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
    console.log(`✅ SendGrid: Email sent to ${to}, Status: ${response.statusCode}`);
    return { success: true, statusCode: response.statusCode };

  } catch (error) {
    console.error('❌ SendGrid error:', error?.response?.body || error.message);
    return { success: false, error: error?.response?.body?.errors?.[0]?.message || error.message };
  }
};

module.exports = { sendOTPEmail, sendEmail };
