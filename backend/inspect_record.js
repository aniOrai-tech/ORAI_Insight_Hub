require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function inspectRecord() {
  const token = await getApplicationToken();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceISO = since.toISOString();

  const url = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${sinceISO}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.data.value && res.data.value.length > 0) {
    console.log('Sample Record Detailed Structure:');
    console.log(JSON.stringify(res.data.value[0], null, 2));
    
    // Check if we can get meeting info from the record
    const record = res.data.value[0];
    if (record.joinWebUrl) {
       console.log('Join Web URL found! Checking meeting subject...');
       try {
         const mRes = await axios.get(`https://graph.microsoft.com/v1.0/communications/onlineMeetings?$filter=JoinWebUrl eq '${record.joinWebUrl}'`, { headers: { Authorization: `Bearer ${token}` } });
         console.log('Meeting Data:', JSON.stringify(mRes.data, null, 2));
       } catch (e) {
         console.log('Failed to fetch meeting subject by joining:', e.message);
       }
    }
  } else {
    console.log('No recent records found.');
  }
}

inspectRecord();
