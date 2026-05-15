require('dotenv').config();
const { sendEmail } = require('./utils/emailService');

async function test() {
  try {
    console.log('Sending test email...');
    await sendEmail({
      to: 'anitasingh365tech@gmail.com',
      subject: 'OTP Service Test',
      html: '<h1>Test</h1><p>If you see this, the email service is working.</p>'
    });
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Failed to send test email:', error.message);
  }
}

test();
