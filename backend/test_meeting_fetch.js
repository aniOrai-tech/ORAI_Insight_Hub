require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testMeetingFetch() {
  try {
    const token = await getApplicationToken();
    const userId = "6d11de25-7063-4027-8453-173c3a769ce5"; // Anita
    
    // An example Join URL from her CRM discussion (if we can find it)
    // For now, let's just try to LIST her onlineMeetings (this usually needs a filter)
    console.log(`📡 Attempting to list meetings for Anita...`);
    
    // We try to find ANY meeting by filtering on a common start date
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings?$filter=startDateTime ge 2026-05-01T00:00:00Z`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log('✅ Found:', res.data.value?.length);
  } catch (err) {
    console.error('❌ Failed:', err.response?.data?.error?.message || err.message);
  }
}
testMeetingFetch();
