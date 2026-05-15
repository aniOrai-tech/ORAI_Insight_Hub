const mongoose = require('mongoose');
require('dotenv').config();
const Ticket = require('./models/Ticket');

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    const count = await Ticket.countDocuments();
    const depts = await Ticket.distinct('department');
    console.log(`Total Tickets: ${count}`);
    console.log(`Departments: ${depts.join(', ')}`);
    
    if (count > 0) {
      const samples = await Ticket.find().limit(2);
      console.log('Sample Ticket Departments:', samples.map(s => s.department));
    }
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

checkData();
