const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

const URI = 'mongodb+srv://anitasingh365tech_db_user:Akv5McZZTFZixtkw@cluster0.nm2vkor.mongodb.net/orai_db?appName=Cluster0';

async function update() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to DB');
    
    const patterns = [
      { find: '[ORAI] Kriam Pharma Chatbot flow and Shopify integration discussion', client: 'Kriam Pharma' },
      { find: '[ORAI] Volo TPA API Understanding call', client: 'Volo TPA' }
    ];

    for (const p of patterns) {
      const ms = await Meeting.find({ 
        $or: [
          { header: p.find },
          { title: p.find }
        ]
      });

      console.log(`Found ${ms.length} meetings for "${p.find}"`);
      
      for (const m of ms) {
        m.clientName = p.client;
        // Clean header: remove [ORAI]
        m.header = m.header.replace(/^\[ORAI\]\s*/i, '').trim();
        m.title = m.title.replace(/^\[ORAI\]\s*/i, '').trim();
        await m.save();
        console.log(`Updated ID: ${m._id}`);
      }
    }

    // General cleanup for anything starting with [ORAI]
    const others = await Meeting.find({ 
      $or: [
        { header: /^\[ORAI\]/i },
        { title: /^\[ORAI\]/i }
      ]
    });

    console.log(`Found ${others.length} other [ORAI] meetings to clean up`);
    for (const m of others) {
      if (m.header.startsWith('[ORAI]')) {
        m.header = m.header.replace(/^\[ORAI\]\s*/i, '').trim();
      }
      if (m.title && m.title.startsWith('[ORAI]')) {
        m.title = m.title.replace(/^\[ORAI\]\s*/i, '').trim();
      }
      
      // Basic client detection if not set
      if (!m.clientName || m.clientName === 'N/A') {
        const parts = m.header.split(' ');
        if (parts.length > 0) m.clientName = parts[0];
      }
      
      await m.save();
      console.log(`Cleaned ID: ${m._id} -> New Header: ${m.header}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

update();
