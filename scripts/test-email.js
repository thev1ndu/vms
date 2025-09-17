// Test script for email functionality
// Run with: node scripts/test-email.js

const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    console.log('Testing email functionality...');
    console.log(
      'RESEND_API_KEY:',
      process.env.RESEND_API_KEY ? 'Set' : 'Not set'
    );
    console.log(
      'RESEND_FROM_EMAIL:',
      process.env.RESEND_FROM_EMAIL || 'Not set'
    );

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in environment variables');
      return;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'VMS <noreply@yourdomain.com>',
      to: ['test@example.com'], // Replace with your test email
      subject: 'VMS Email Test',
      html: '<p>This is a test email from VMS to verify email functionality is working.</p>',
    });

    if (error) {
      console.error('❌ Email test failed:', error);
    } else {
      console.log('✅ Email test successful:', data);
    }
  } catch (error) {
    console.error('❌ Email test error:', error);
  }
}

testEmail();
