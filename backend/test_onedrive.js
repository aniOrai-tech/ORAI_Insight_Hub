require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testOneDriveSearch() {
  try {
    const token = await getApplicationToken();
    console.log('✅ Token Fetched.');

    const userId = "e5a2a53b-3cb1-4939-a4ca-f6e1c58d712c";
    console.log(`📡 Searching OneDrive for recordings of user: ${userId}...`);

    // Search for mp4 files in the "Recordings" folder of the user
    // In Teams, recordings go to "Recordings" folder in OneDrive
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/search(q='.mp4')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Success! Files found:', res.data.value?.length);
    if (res.data.value?.length > 0) {
      console.log('Sample Recording Name:', res.data.value[0].name);
      console.log('Web URL:', res.data.value[0].webUrl);
    }
  } catch (err) {
    console.error('❌ OneDrive Test Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}

testOneDriveSearch();
