// Supabase Auth Routes - Using SendGrid Email System & Twilio SMS
const express = require('express');
const { supabase, successResponse, errorResponse } = require('../config/supabase');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { sendOTPEmail } = require('../services/sendgridEmail');
const { sendSMS } = require('../services/smsService');

const router = express.Router();

router.post('/send-otp', async (req, res) => {
  try {
    const { email, phone, pendingRegistrationData } = req.body;

    // Support both email and phone parameters
    const identifier = email || phone;
    
    if (!identifier) {
      return res.status(400).json(
        errorResponse('Invalid identifier', 'Please provide a valid email or phone number')
      );
    }

    const isEmail = identifier.includes('@');

    console.log(`\n📧 Generating OTP for: ${identifier} (${isEmail ? 'email' : 'phone'})`);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query('DELETE FROM email_verification_otps WHERE email = $1', [identifier]);

    if (pendingRegistrationData) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(pendingRegistrationData.password, 12);
      pendingRegistrationData.password = hashedPassword;
      pendingRegistrationData.email = identifier;
    }

    await db.query(
      'INSERT INTO email_verification_otps (email, otp, expires_at, pending_registration_data) VALUES ($1, $2, $3, $4)',
      [identifier, otp, expiresAt, pendingRegistrationData ? JSON.stringify(pendingRegistrationData) : null]
    );

    console.log(`🔑 Generated OTP: ${otp}`);

    if (isEmail) {
      const emailResult = await sendOTPEmail(identifier, otp);

      if (emailResult.success) {
        return res.status(200).json(
          successResponse('OTP sent successfully! Please check your email.', { email: identifier })
        );
      } else {
        console.log(`⚠️ Email failed, OTP shown in response for testing`);
        return res.status(200).json(
          successResponse('OTP generated! (Email failed - check console for OTP)', { 
            email: identifier,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined 
          })
        );
      }
    } else {
      // Send OTP via SMS
      const smsResult = await sendSMS(identifier, `Your MyMart verification code is: ${otp}`);

      if (smsResult.success) {
        return res.status(200).json(
          successResponse('OTP sent successfully! Please check your phone.', { 
            phone: identifier,
            provider: smsResult.provider 
          })
        );
      } else {
        console.log(`⚠️ SMS failed, OTP shown in response for testing`);
        return res.status(200).json(
          successResponse('OTP generated! (SMS failed - check console for OTP)', { 
            phone: identifier,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            provider: smsResult.provider 
          })
        );
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;

    // Support both email and phone
    const identifier = email || phone;

    if (!identifier) {
      return res.status(400).json(
        errorResponse('Invalid identifier', 'Please provide a valid email or phone number')
      );
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json(
        errorResponse('Invalid OTP', 'OTP must be 6 digits')
      );
    }

    const isPhoneLogin = !!phone;

    console.log(`\n🔐 Verifying OTP for: ${identifier} (${isPhoneLogin ? 'phone' : 'email'})`);

    const result = await db.query(
      'SELECT * FROM email_verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1',
      [identifier, otp]
    );

    if (result.rows.length > 0) {
      console.log(`✅ OTP verified for: ${identifier}`);
      
      const otpData = result.rows[0];
      
      let userResult;
      if (isPhoneLogin) {
        userResult = await db.query(
          'SELECT * FROM users WHERE phone = $1 LIMIT 1',
          [identifier]
        );
      } else {
        userResult = await db.query(
          'SELECT * FROM users WHERE email = $1 LIMIT 1',
          [identifier]
        );
      }

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const token = jwt.sign(
          { id: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        return res.status(200).json(
          successResponse('OTP verified successfully!', {
            id: user.id,
            email: user.email,
            phone: user.phone,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role,
            token,
            emailVerified: true,
            isNewUser: false
          })
        );
      } else if (otpData.pending_registration_data) {
        const regData = otpData.pending_registration_data;
        const newUserResult = await db.query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING id, email, first_name, last_name, phone, role`,
          [
            uuidv4(),
            regData.email,
            regData.password,
            regData.firstName,
            regData.lastName,
            regData.phone || null,
            regData.role || 'customer'
          ]
        );

        const newUser = newUserResult.rows[0];
        const token = jwt.sign(
          { id: newUser.id, email: newUser.email, role: newUser.role },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        // Store will be created by vendor AFTER admin approves their account
        // Admin needs to approve vendor from Admin Portal → Vendors → Approve

        await db.query('DELETE FROM email_verification_otps WHERE email = $1', [identifier]);

        return res.status(200).json(
          successResponse('Account created successfully!', {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            phone: newUser.phone,
            role: newUser.role,
            token,
            emailVerified: true,
            isNewUser: true
          })
        );
      } else {
        return res.status(200).json(
          successResponse('OTP verified!', {
            email: isPhoneLogin ? undefined : identifier,
            phone: isPhoneLogin ? identifier : undefined,
            emailVerified: true,
            isNewUser: true
          })
        );
      }
    }

    return res.status(401).json(
      errorResponse('Invalid OTP', 'The verification code is incorrect or expired')
    );

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email, phone } = req.body;

    const identifier = email || phone;

    if (!identifier) {
      return res.status(400).json(
        errorResponse('Invalid identifier', 'Please provide a valid email or phone number')
      );
    }

    const isEmail = identifier.includes('@');

    console.log(`\n📧 Resending OTP to: ${identifier} (${isEmail ? 'email' : 'phone'})`);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query('DELETE FROM email_verification_otps WHERE email = $1', [identifier]);
    await db.query(
      'INSERT INTO email_verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [identifier, otp, expiresAt]
    );

    if (isEmail) {
      const emailResult = await sendOTPEmail(identifier, otp);

      if (emailResult.success) {
        return res.status(200).json(
          successResponse('OTP resent successfully! Please check your email.')
        );
      } else {
        return res.status(200).json(
          successResponse('OTP generated! (Email failed - check console for OTP)', { 
            email: identifier,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined 
          })
        );
      }
    } else {
      const smsResult = await sendSMS(identifier, `Your MyMart verification code is: ${otp}`);

      if (smsResult.success) {
        return res.status(200).json(
          successResponse('OTP resent successfully! Please check your phone.', { 
            phone: identifier,
            provider: smsResult.provider 
          })
        );
      } else {
        return res.status(200).json(
          successResponse('OTP generated! (SMS failed - check console for OTP)', { 
            phone: identifier,
            otp: process.env.NODE_ENV === 'development' ? otp : undefined,
            provider: smsResult.provider 
          })
        );
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

router.post('/send-forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json(
        errorResponse('Invalid email', 'Please provide a valid email address')
      );
    }

    console.log(`\n🔑 Password reset OTP request for: ${email}`);

    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json(
        errorResponse('User not found', 'No account found with this email')
      );
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await db.query('DELETE FROM email_verification_otps WHERE email = $1', [email]);
    await db.query(
      'INSERT INTO email_verification_otps (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email, otp, expiresAt]
    );

    console.log(`🔑 Generated OTP: ${otp}`);

    const emailResult = await sendOTPEmail(email, otp);

    if (emailResult.success) {
      return res.status(200).json(
        successResponse('OTP sent successfully! Please check your email.', { email })
      );
    } else {
      console.log(`⚠️ Email failed, OTP shown in response for testing`);
      return res.status(200).json(
        successResponse('OTP generated! (Email failed - check console for OTP)', { 
          email,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined 
        })
      );
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

router.post('/verify-forgot-password-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json(
        errorResponse('Invalid email', 'Please provide a valid email address')
      );
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json(
        errorResponse('Invalid OTP', 'OTP must be 6 digits')
      );
    }

    console.log(`\n🔐 Verifying forgot password OTP for: ${email}`);

    const result = await db.query(
      'SELECT * FROM email_verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1',
      [email, otp]
    );

    if (result.rows.length > 0) {
      console.log(`✅ OTP verified for password reset: ${email}`);
      
      return res.status(200).json(
        successResponse('OTP verified!', { email, otpVerified: true })
      );
    }

    return res.status(401).json(
      errorResponse('Invalid OTP', 'The verification code is incorrect or expired')
    );

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json(
        errorResponse('Invalid email', 'Please provide a valid email address')
      );
    }

    if (!otp || otp.length !== 6) {
      return res.status(400).json(
        errorResponse('Invalid OTP', 'OTP must be 6 digits')
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json(
        errorResponse('Invalid password', 'Password must be at least 6 characters')
      );
    }

    console.log(`\n🔐 Resetting password for: ${email}`);

    const otpResult = await db.query(
      'SELECT * FROM email_verification_otps WHERE email = $1 AND otp = $2 AND expires_at > NOW() LIMIT 1',
      [email, otp]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json(
        errorResponse('Invalid OTP', 'The verification code is incorrect or expired')
      );
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
      [hashedPassword, email]
    );

    await db.query('DELETE FROM email_verification_otps WHERE email = $1', [email]);

    return res.status(200).json(
      successResponse('Password reset successfully!', { email })
    );

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    return res.status(500).json(
      errorResponse('Internal server error', 'An unexpected error occurred')
    );
  }
});

module.exports = router;
