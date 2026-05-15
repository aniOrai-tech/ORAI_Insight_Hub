const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');

const URI = 'mongodb+srv://anitasingh365tech_db_user:Akv5McZZTFZixtkw@cluster0.nm2vkor.mongodb.net/orai_db?appName=Cluster0';

async function check() {
  try {
    await mongoose.connect(URI);
    console.log('Connected to DB');
    
    const ms = await Meeting.find({ 
      $or: [ 
        { ownerEmail: /tarun/i }, 
        { organizerEmail: /tarun/i }
      ] 
    });
    
    console.log(`Found ${ms.length} meetings for Tarun`);
    ms.forEach(m => {
      console.log('---');
      console.log('ID:', m._id);
      console.log('Header:', m.header);
      console.log('Title:', m.title);
      console.log('Source:', m.source);
      console.log('StartTime:', m.startTime);
      console.log('EndTime:', m.endTime);
    });
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
