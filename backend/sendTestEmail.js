require('dotenv').config();
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Meeting = require('./models/Meeting');

async function sendTestEmail() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('Fetching latest meeting...');
    const latestMeeting = await Meeting.findOne().sort({ updatedAt: -1 });
    
    if (!latestMeeting) {
      console.log('No meetings found in database.');
      process.exit(0);
    }
    
    if (!latestMeeting.ownerEmail) {
      console.log(`The latest meeting ("${latestMeeting.header}") does not have an ownerEmail set.`);
      process.exit(0);
    }

    console.log(`Found meeting: "${latestMeeting.header}" for owner: ${latestMeeting.ownerEmail}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env file.');
      process.exit(1);
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
      },
    });

    const mailOptions = {
      from: '"ORAI Insight Hub" <noreply@orai-insight.com>',
      to: latestMeeting.ownerEmail,
      subject: `Meeting Reminder: ${latestMeeting.header}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #7e22ce; margin-top: 0;">Meeting Notification</h2>
          <p>Hello,</p>
          <p>You have a meeting scheduled in the ORAI Insight Hub.</p>
          
          <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 150px;">Header:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${latestMeeting.header}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Client:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${latestMeeting.clientName || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(latestMeeting.scheduledDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">Expiry Date:</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${new Date(latestMeeting.expiryDate).toDateString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold;">Summary:</td>
              <td style="padding: 10px;">${latestMeeting.summary || 'No summary provided.'}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; font-size: 1.1em; color: #dc2626; font-weight: bold;">
            ⚠️ Notice: Your meeting recording is set to expire on ${new Date(latestMeeting.expiryDate).toDateString()}.
          </p>
          <p>
            This is a reminder to you. If you want to keep this recording, please download it from the dashboard before the expiry date, or contact the Admin to remove the expiry.
          </p>
          
          <p style="margin-top: 30px; font-size: 0.85em; color: #64748b;">This is an automated notification from the ORAI Insight Hub.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    console.log('----------------------------------------------------');
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    console.log('----------------------------------------------------');
    
  } catch (err) {
    console.error('Error sending email:', err);
  } finally {
    mongoose.connection.close();
  }
}

sendTestEmail();
