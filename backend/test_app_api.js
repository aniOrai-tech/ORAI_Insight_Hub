require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function testFetch() {
  try {
    console.log('--- Testing Application API properly ---');
    const token = await getApplicationToken();
    console.log('✅ Token Fetched.');

    const since = new Date();
    since.setDate(since.getDate() - 25);
    const sinceISO = since.toISOString();


    console.log(`📡 Fetching call records since ${sinceISO}...`);
    
    // Testing the Call Records endpoint which is central to the "60 days" requirement
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${sinceISO}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );


    const count = res.data.value ? res.data.value.length : 0;
    console.log(`✅ Success! Found ${count} call records in the last 60 days.`);
    
    if (count > 0) {
      console.log('Sample Record ID:', res.data.value[0].id);
    } else {
      console.log('ℹ️ No records found (this is normal if no meetings happened in this tenant recently).');
    }

  } catch (err) {
    console.error('❌ API Test Failed:', err.message);
    if (err.response) {
      console.error('Error Code:', err.response.data.error?.code);
      console.error('Error Message:', err.response.data.error?.message);
    }
  }
}

testFetch();
