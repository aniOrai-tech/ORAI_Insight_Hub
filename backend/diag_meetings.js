const mongoose = require('mongoose');
require('dotenv').config();
const Meeting = require('./models/Meeting');

async function checkMeetings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    const count = await Meeting.countDocuments();
    console.log(`Total Meetings: ${count}`);
    if (count > 0) {
      const samples = await Meeting.find().limit(2);
      console.log('Sample Meetings:', samples.map(s => s.header));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkMeetings();
