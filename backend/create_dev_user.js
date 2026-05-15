require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    const userData = {
      username: 'dev_team_access',
      password: 'devteam123',
      department: 'Dev Team',
      fullName: 'Dev Access User',
      email: 'dev_access@orai.com'
    };
    
    const existing = await User.findOne({ username: userData.username });
    if (existing) {
      console.log('User already exists');
      process.exit(0);
    }
    
    await User.create(userData);
    console.log('User created successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
createUser();
