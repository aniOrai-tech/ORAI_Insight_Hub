/**
 * Seed Script — Creates demo users for all departments
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = [
  { username: 'admin',      password: 'admin123', department: 'CS Team',             fullName: 'Admin User',         email: 'admin@orai.com' },
  { username: 'cs_user',   password: 'orai123',  department: 'CS Team',             fullName: 'CS Team User',       email: 'cs@orai.com' },
  { username: 'impl_user', password: 'orai123',  department: 'Implementation Team', fullName: 'Impl Team User',     email: 'impl@orai.com' },
  { username: 'dev_user',  password: 'orai123',  department: 'Dev Team',            fullName: 'Dev Team User',      email: 'dev@orai.com' },
  { username: 'sales_user',password: 'orai123',  department: 'Sales Team',          fullName: 'Sales Team User',    email: 'sales@orai.com' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
    console.log('✅ Connected to MongoDB');

    for (const userData of seedUsers) {
      const existing = await User.findOne({ username: userData.username });
      if (existing) {
        console.log(`⏭  User already exists: ${userData.username}`);
        continue;
      }
      await User.create(userData);
      console.log(`✅ Created user: ${userData.username} (${userData.department})`);
    }

    console.log('\n🎉 Seed complete! Demo credentials:');
    seedUsers.forEach(u => console.log(`   ${u.department.padEnd(22)} → username: ${u.username.padEnd(12)} password: ${u.password}`));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
