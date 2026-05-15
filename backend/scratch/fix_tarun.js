const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

const URI = 'mongodb+srv://anitasingh365tech_db_user:Akv5McZZTFZixtkw@cluster0.nm2vkor.mongodb.net/orai_db?appName=Cluster0';

async function fixTarun() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to DB');
    
    // Find all meetings for Tarun
    const ms = await Meeting.find({ 
      $or: [ 
        { ownerEmail: /tarun/i }, 
        { organizerEmail: /tarun/i }
      ] 
    });
    
    console.log(`Fixing ${ms.length} meetings for Tarun...`);
    
    for (const m of ms) {
      let changed = false;
      
      // 1. Fix missing times
      if (!m.startTime && m.scheduledDate) {
        m.startTime = m.scheduledDate;
        changed = true;
      }
      if (!m.endTime && m.scheduledDate) {
        // Assume 30 min if missing
        m.endTime = new Date(m.scheduledDate.getTime() + 30 * 60000);
        changed = true;
      }
      
      // 2. Revert "Manual Entry" mislabeling if it was from Teams
      if (m.teamsId && m.header.startsWith('Manual Entry')) {
        // We lost the original subject if Graph enrichment failed, 
        // but we can at least show a better placeholder than "Manual Entry"
        m.header = `[Teams Import] ${m.scheduledDate.toLocaleDateString('en-IN')}`;
        m.title = m.header;
        changed = true;
      }

      // 3. Specifically fix the Kriam Pharma one if it was mislabeled
      // (The user said it WAS "[ORAI] Kriam Pharma...", so maybe it's in the DB under that but I just missed it)
      if (m.header.includes('Kriam') || (m.summary && m.summary.includes('Kriam'))) {
         m.header = "[ORAI] Kriam Pharma Chatbot flow and Shopify integration discussion";
         m.title = m.header;
         m.clientName = "Kriam Pharma";
         changed = true;
      }
      
      if (changed) {
        await m.save();
        console.log(`Updated ID: ${m._id}`);
      }
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixTarun();
