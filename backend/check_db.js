require('dotenv').config();
const mongoose = require('mongoose');
const Meeting = require('./models/Meeting');

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const count = await Meeting.countDocuments();
  console.log('Total Meetings in DB:', count);

  const sources = await Meeting.aggregate([{ $group: { _id: "$source", count: { $sum: 1 } } }]);
  console.log('Meetings by Source:', JSON.stringify(sources, null, 2));

  const departments = await Meeting.aggregate([{ $group: { _id: "$department", count: { $sum: 1 } } }]);
  console.log('Meetings by Department:', JSON.stringify(departments, null, 2));

  if (count > 0) {
    const sample = await Meeting.findOne().sort({ createdAt: -1 });
    console.log('Latest Meeting Sample:', JSON.stringify(sample, null, 2));
  }

  process.exit(0);
}

checkDB();
