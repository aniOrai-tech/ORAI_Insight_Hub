require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function getDriveInfo() {
  try {
    const token = await getApplicationToken();
    const userId = "e5a2a53b-3cb1-4939-a4ca-f6e1c58d712c";
    
    console.log(`📡 Fetching Drive info for ${userId}...`);
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/drive`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Drive Found:', res.data.id);
    console.log('Drive Type:', res.data.driveType);
  } catch (err) {
    console.error('❌ Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}
getDriveInfo();
