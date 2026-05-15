require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function searchVTT() {
  try {
    const token = await getApplicationToken();
    const userId = "6d11de25-7063-4027-8453-173c3a769ce5";
    
    console.log(`📡 Searching for .vtt or .caption files in drive...`);
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/drive/root/search(q='.vtt')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Found:', res.data.value?.length);
    if (res.data.value?.length > 0) {
      res.data.value.forEach(f => console.log(`- ${f.name}`));
    }
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}
searchVTT();
