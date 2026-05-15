require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testSharePointSearch() {
  try {
    const token = await getApplicationToken();
    console.log('✅ Token Fetched.');

    // User from the URL provided by the user
    // anita_s_orai-robotics_com -> anita.s@orai-robotics.com
    // I'll search for Anita's ID if I can find it, or use the one I found earlier for test.
    const userId = "e5a2a53b-3cb1-4939-a4ca-f6e1c58d712c"; 
    
    console.log(`📡 Searching OneDrive for ${userId}...`);

    // In Teams, recordings are often in "Recordings" folder
    // Let's try to list the root items to find the "Recordings" folder
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/children`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('✅ Success! Root items found:', res.data.value?.length);
    res.data.value.forEach(item => {
      console.log(`- ${item.name} (${item.folder ? 'Folder' : 'File'})`);
    });

  } catch (err) {
    console.error('❌ Search Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}

testSharePointSearch();
