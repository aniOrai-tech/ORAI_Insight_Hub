require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function findAnita() {
  try {
    const token = await getApplicationToken();
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/users?$filter=startsWith(userPrincipalName,'anita.s')`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Found:', res.data.value?.length, 'users');
    if (res.data.value?.length > 0) {
      console.log('ID:', res.data.value[0].id);
      console.log('UPN:', res.data.value[0].userPrincipalName);
    }
  } catch (err) {
    console.error('❌ Failed:', err.message);
  }
}
findAnita();
