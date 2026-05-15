require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testPermission() {
  try {
    const token = await getApplicationToken();
    console.log('✅ Token Fetched.');

    // Use the ID from the previous inspection
    const userId = "e5a2a53b-3cb1-4939-a4ca-f6e1c58d712c";
    console.log(`📡 Testing /users/${userId}/onlineMeetings...`);

    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Success! Meetings found:', res.data.value?.length);
    if (res.data.value?.length > 0) {
      console.log('Sample Subject:', res.data.value[0].subject);
    }
  } catch (err) {
    console.error('❌ Permission Test Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
      console.error('Inner Error:', JSON.stringify(err.response.data.error?.innerError));
    }
    
    console.log('\n💡 Tip: If you see "AccessDenied" or "Forbidden", you might need to create an "Application Access Policy" in Teams using PowerShell.');
  }
}

testPermission();
