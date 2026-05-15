const mongoose = require('mongoose');
require('dotenv').config();
const Meeting = require('./models/Meeting');

async function checkDepts() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
  const depts = await Meeting.aggregate([
    { $group: { _id: '$department', count: { $sum: 1 } } }
  ]);
  console.log('Meetings by Department:', depts);
  process.exit(0);
}

checkDepts();
