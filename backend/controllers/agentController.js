const { Bot, Client, Upsell, Requirement } = require('../models/index');
const Meeting = require('../models/Meeting');
const WhatsApp = require('../models/WhatsAppDetails');
const HealthCheck = require('../models/HealthCheck');

exports.handleQuery = async (req, res) => {
  try {
    const { query, department } = req.body;
    if (!query) return res.status(400).json({ message: 'Query is required' });

    const q = query.toLowerCase();
    let response = "";
    let data = null;

    // 1. Determine Intent
    if (q.includes('bot') || q.includes('waba')) {
      const bots = await Bot.find(department !== 'Admin' ? { department } : {});
      const match = bots.find(b => q.includes(b.clientName.toLowerCase()) || q.includes(b.accountId.toLowerCase()));
      if (match) {
        response = `Here are the details for ${match.clientName}'s bot. Account ID is ${match.accountId}, Status is ${match.isActive ? 'Active' : 'Inactive'}. It is live since ${new Date(match.goLiveDate).toLocaleDateString()}.`;
        data = match;
      } else {
        response = "I couldn't find a specific bot matching that description. Can you please provide the Client Name or Account ID?";
      }
    } 
    else if (q.includes('meeting') || q.includes('recording')) {
      const meetings = await Meeting.find(department !== 'Admin' ? { department } : {});
      const match = meetings.find(m => q.includes(m.clientName.toLowerCase()) || q.includes(m.meetingHeader.toLowerCase()));
      if (match) {
        response = `I found a meeting for ${match.clientName}: "${match.meetingHeader}". It was scheduled on ${new Date(match.scheduledDate).toLocaleDateString()} and is currently ${match.status}.`;
        data = match;
      } else {
        response = "No matching meetings found. Try searching by Client Name or Meeting Header.";
      }
    }
    else if (q.includes('whatsapp') || q.includes('login') || q.includes('credential')) {
      const accounts = await WhatsApp.find(department !== 'Admin' ? { department } : {});
      const match = accounts.find(a => q.includes(a.companyLegalName.toLowerCase()) || (a.whatsAppNumber && q.includes(a.whatsAppNumber)));
      if (match) {
        response = `WhatsApp details for ${match.companyLegalName}: The number is ${match.whatsAppNumber || 'not set'}. Status is ${match.status}. Hosting Platform: ${match.hostingPlatformType}.`;
        data = match;
      } else {
        response = "I couldn't find those WhatsApp login details. Please specify the Company Name or Number.";
      }
    }
    else if (q.includes('client') || q.includes('spoc')) {
      const clients = await Client.find(department !== 'Admin' ? { department } : {});
      const match = clients.find(c => q.includes(c.companyName.toLowerCase()) || q.includes(c.spocName.toLowerCase()));
      if (match) {
        response = `${match.companyName}'s primary SPOC is ${match.spocName}. You can reach them at ${match.email} or ${match.contactNumber}.`;
        data = match;
      } else {
        response = "Client not found. Please provide a Company Name or SPOC Name.";
      }
    }
    else {
      response = "I'm your ORAI Insight Assistant. I can help you find details about Bots, Meetings, WhatsApp Logins, Clients, and Health Trackers. Just ask me something like 'Get details for account [Name]' or 'Tell me about the meeting with [Client]'.";
    }

    res.json({ response, data });
  } catch (error) {
    console.error('Agent Error:', error);
    res.status(500).json({ message: 'Error processing your request' });
  }
};
