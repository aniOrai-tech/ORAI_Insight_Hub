require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testCalendar() {
  try {
    const token = await getApplicationToken();
    console.log('✅ Token Fetched.');

    const userId = "e5a2a53b-3cb1-4939-a4ca-f6e1c58d712c";
    console.log(`📡 Searching calendar for user: ${userId}...`);

    // Target a specific time from our previous callRecord
    // record.startDateTime was "2026-05-08T05:57:45"
    const startTime = "2026-05-08T05:57:45Z";
    
    // We search for events around that time
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/events?$top=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Success! Events found:', res.data.value?.length);
    if (res.data.value?.length > 0) {
      console.log('Latest Event Subject:', res.data.value[0].subject);
      console.log('Event Body Preview (linking to Teams?):', res.data.value[0].bodyPreview?.substring(0, 50));
    }
  } catch (err) {
    console.error('❌ Calendar Test Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}

testCalendar();
