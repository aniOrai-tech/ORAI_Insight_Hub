require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function searchAnitaDrive() {
  try {
    const token = await getApplicationToken();
    const userId = "6d11de25-7063-4027-8453-173c3a769ce5";
    
    console.log(`📡 Searching Anita's Drive for .mp4...`);
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/search(q='.mp4')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Success! Files found:', res.data.value?.length);
    if (res.data.value?.length > 0) {
      res.data.value.slice(0, 5).forEach(f => {
        console.log(`- ${f.name} -> ${f.webUrl}`);
      });
    }
  } catch (err) {
    console.error('❌ Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}
searchAnitaDrive();
