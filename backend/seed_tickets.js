const mongoose = require('mongoose');
require('dotenv').config();
const Ticket = require('./models/Ticket');
const User = require('./models/User');

async function seedTickets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    
    const user = await User.findOne({ username: 'admin' }) || await User.findOne();
    if (!user) {
      console.error('No user found.');
      return;
    }

    console.log(`Using user: ${user.username}, dept: ${user.department}, role: ${user.role}`);

    // Get current ticket count for unique IDs
    const count = await Ticket.countDocuments();
    console.log(`Current ticket count: ${count}`);

    const tickets = [
      {
        ticketId: `TKT-${String(count + 2001).padStart(6, '0')}`,
        subject: 'Bot connection failing for Acme Corp',
        description: 'The WhatsApp bot is not responding to messages since this morning. Client reports no replies on any channel.',
        status: 'open',
        priority: 'critical',
        category: 'bug',
        clientName: 'Acme Corp',
        contactEmail: 'support@acme.com',
        department: user.department,
        createdBy: user._id
      },
      {
        ticketId: `TKT-${String(count + 2002).padStart(6, '0')}`,
        subject: 'Feature request: Voice notes support',
        description: 'Client Global Tech wants to be able to send voice notes to the bot and receive voice responses.',
        status: 'in_progress',
        priority: 'medium',
        category: 'feature_request',
        clientName: 'Global Tech',
        contactEmail: 'it@globaltech.com',
        department: user.department,
        createdBy: user._id
      },
      {
        ticketId: `TKT-${String(count + 2003).padStart(6, '0')}`,
        subject: 'Billing query - Invoice #INV-0042',
        description: 'Client has raised a query regarding their latest invoice amount. Needs clarification on additional charges.',
        status: 'pending',
        priority: 'low',
        category: 'billing',
        clientName: 'TechStart Inc',
        contactEmail: 'accounts@techstart.io',
        department: user.department,
        createdBy: user._id
      }
    ];

    const result = await Ticket.insertMany(tickets);
    console.log(`✅ Seeded ${result.length} tickets for department: ${user.department}`);
    result.forEach(t => console.log(`  - ${t.ticketId}: ${t.subject}`));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

seedTickets();
