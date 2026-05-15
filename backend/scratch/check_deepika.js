const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

const URI = 'mongodb+srv://anitasingh365tech_db_user:Akv5McZZTFZixtkw@cluster0.nm2vkor.mongodb.net/orai_db?appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to DB');
    
    const ms = await Meeting.find({ 
      $or: [ 
        { ownerEmail: /deepika/i }, 
        { organizerEmail: /deepika/i },
        { header: /deepika/i }
      ] 
    });
    
    console.log(`Found ${ms.length} meetings for Deepika`);
    ms.forEach(m => {
      console.log('---');
      console.log('ID:', m._id);
      console.log('Header:', m.header);
      console.log('Owner:', m.ownerEmail);
      console.log('Source:', m.source);
      console.log('TeamsID:', m.teamsId);
      console.log('CreatedBy:', m.createdBy);
      console.log('ScheduledDate:', m.scheduledDate);
      console.log('Created At:', m.createdAt);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
