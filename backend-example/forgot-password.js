const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');
require('dotenv').config();

const router = express.Router();

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Mock WhatsApp clients (replace with your actual WhatsApp implementation)
const whatsappClients = {
  "0210": {
    isReady: true,
    sendMessage: async (to, message) => {
      // Mock implementation - replace with your actual WhatsApp client
      console.log(`WhatsApp message to ${to}:`, message);
      return Promise.resolve();
    }
  }
};

// Forgot Password Endpoint - Send reset code via WhatsApp
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Check if user exists
    const userQuery = 'SELECT * FROM users WHERE email = $1 AND active = true';
    const userResult = await pool.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's phone number from employees table
    const employeeQuery = 'SELECT phone_number FROM employees WHERE email = $1 AND company_id = $2';
    const employeeResult = await pool.query(employeeQuery, [email, userResult.rows[0].company_id]);

    if (employeeResult.rows.length === 0 || !employeeResult.rows[0].phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number not found for this user'
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code in database
    const insertQuery = `
      INSERT INTO password_resets (email, reset_code, expires_at, created_at) 
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (email) 
      DO UPDATE SET reset_code = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP
    `;
    
    await pool.query(insertQuery, [email, resetCode, expiresAt]);

    // Format phone number for WhatsApp (remove + and add country code if needed)
    let phoneNumber = employeeResult.rows[0].phone_number.toString();
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }
    if (phoneNumber.startsWith('60')) {
      phoneNumber = phoneNumber;
    } else if (phoneNumber.startsWith('0')) {
      phoneNumber = '60' + phoneNumber.substring(1);
    } else {
      phoneNumber = '60' + phoneNumber;
    }

    // Send WhatsApp message with reset code using company 0210
    const message = `🔐 Password Reset Request

Your password reset code is: *${resetCode}*

This code will expire in 15 minutes.

If you didn't request this reset, please ignore this message.

Best regards,
Juta Team`;

    // Use company 0210 WhatsApp client
    const whatsappClient = whatsappClients["0210"];
    
    if (!whatsappClient || !whatsappClient.isReady) {
      return res.status(500).json({
        success: false,
        error: 'WhatsApp service not available'
      });
    }

    // Send the message
    await whatsappClient.sendMessage(`${phoneNumber}@c.us`, message);

    res.json({
      success: true,
      message: 'Password reset code sent to your WhatsApp number',
      phoneNumber: phoneNumber.replace('60', '+60-') // Format for display
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request'
    });
  }
});

// Reset Password Endpoint - Verify code and update password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email, reset code, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Verify reset code
    const resetQuery = `
      SELECT * FROM password_resets 
      WHERE email = $1 AND reset_code = $2 AND expires_at > CURRENT_TIMESTAMP
    `;
    
    const resetResult = await pool.query(resetQuery, [email, resetCode]);

    if (resetResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset code'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateUserQuery = 'UPDATE users SET password = $1, last_updated = CURRENT_TIMESTAMP WHERE email = $2';
    await pool.query(updateUserQuery, [hashedPassword, email]);

    // Delete the used reset code
    const deleteResetQuery = 'DELETE FROM password_resets WHERE email = $1';
    await pool.query(deleteResetQuery, [email]);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

module.exports = router;
