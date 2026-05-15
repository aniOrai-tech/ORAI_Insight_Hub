/**
 * Email Service
 * Nodemailer setup + meeting expiry reminder automation
 */

const nodemailer = require('nodemailer');
const Meeting = require('../models/Meeting');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

/**
 * Send a single email
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'ORAI Insight Hub <noreply@orai.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, '') // Fallback plain text
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 Email sent: ${info.messageId} → ${to}`);
  return info;
};

/**
 * Generate expiry reminder email HTML
 */
const generateReminderEmail = (meeting) => {
  const expiryDate = new Date(meeting.expiryDate).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const scheduledDate = new Date(meeting.scheduledDate).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0284c7, #38bdf8); padding: 32px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
    .body { padding: 32px; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
    .alert-box p { margin: 0; color: #92400e; font-weight: 600; }
    .section-title { color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .meeting-header { color: #f1f5f9; font-size: 20px; font-weight: 700; margin: 0 0 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-card { background: #0f172a; border-radius: 8px; padding: 12px 16px; }
    .info-card .label { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-card .value { color: #e2e8f0; font-size: 14px; font-weight: 600; margin-top: 4px; }
    .summary-box { background: #0f172a; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .summary-text { color: #cbd5e1; line-height: 1.6; font-size: 14px; }
    .cta-button { display: block; text-align: center; background: linear-gradient(135deg, #0284c7, #38bdf8); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; margin: 24px 0; }
    .footer { background: #0f172a; padding: 20px 32px; text-align: center; }
    .footer p { color: #475569; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Meeting Expiry Notification</h1>
      <p>ORAI Insight Hub — Important Action Required</p>
    </div>
    <div class="body">
      <div class="alert-box">
        <p>🚨 Your scheduled meeting recording is expiring soon!</p>
      </div>
      
      <div class="section-title">Meeting</div>
      <div class="meeting-header">${meeting.header}</div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="label">Scheduled Date</div>
          <div class="value">${scheduledDate}</div>
        </div>
        <div class="info-card">
          <div class="label">Expiry Date</div>
          <div class="value" style="color: #f87171;">${expiryDate}</div>
        </div>
        <div class="info-card">
          <div class="label">Department</div>
          <div class="value">${meeting.department}</div>
        </div>
        <div class="info-card">
          <div class="label">Client</div>
          <div class="value">${meeting.clientName || 'N/A'}</div>
        </div>
      </div>
      
      ${meeting.summary ? `
      <div class="section-title">Meeting Summary</div>
      <div class="summary-box">
        <p class="summary-text">${meeting.summary}</p>
      </div>
      ` : ''}
      
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard" class="cta-button">
        View Meeting in Dashboard →
      </a>
    </div>
    <div class="footer">
      <p>ORAI Insight Hub • Automated notification • Do not reply to this email</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Main cron function: find meetings expiring in 7 days and send reminders
 */
const sendExpiryReminders = async () => {
  const now = new Date();
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  // Find meetings expiring within 7 days that haven't been reminded
  const meetings = await Meeting.find({
    status: 'active',
    reminderSent: false,
    expiryDate: {
      $gte: now,
      $lte: sevenDaysLater
    },
    ownerEmail: { $exists: true, $ne: null }
  }).populate('createdBy', 'email fullName username');

  console.log(`📊 Found ${meetings.length} meetings needing reminders`);

  for (const meeting of meetings) {
    try {
      const recipientEmail = meeting.ownerEmail || meeting.createdBy?.email;
      if (!recipientEmail) {
        console.warn(`⚠️ No email for meeting: ${meeting.header}`);
        continue;
      }

      await sendEmail({
        to: recipientEmail,
        subject: `🚨 IMPORTANT: Meeting Expiry Notification - ${meeting.header}`,
        html: generateReminderEmail(meeting)
      });

      // Mark reminder as sent
      await Meeting.findByIdAndUpdate(meeting._id, {
        reminderSent: true,
        reminderSentAt: new Date()
      });

      console.log(`✅ Reminder sent for: ${meeting.header} → ${recipientEmail}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder for meeting ${meeting._id}:`, error.message);
    }
  }

  // Also mark expired meetings
  await Meeting.updateMany(
    { status: 'active', expiryDate: { $lt: now } },
    { status: 'expired' }
  );

  return { processed: meetings.length };
};

module.exports = { sendEmail, sendExpiryReminders, generateReminderEmail };
