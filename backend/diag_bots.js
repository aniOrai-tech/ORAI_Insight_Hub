const mongoose = require('mongoose');
require('dotenv').config();
const { Bot } = require('./models/index');

async function checkBots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    const count = await Bot.countDocuments();
    console.log(`Total Bots: ${count}`);
    if (count > 0) {
      const samples = await Bot.find().limit(2);
      console.log('Sample Bot Clients:', samples.map(s => s.clientName));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkBots();
