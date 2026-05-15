require('dotenv').config();
const axios = require('axios');
const { getApplicationToken } = require('./utils/teamsAuth');

async function debugCallRecords() {
  try {
    const token = await getApplicationToken();
    const since = new Date("2026-05-01"); // Search around the CRM discussion date
    const sinceISO = since.toISOString();

    console.log(`📡 Fetching callRecords since ${sinceISO}...`);
    const url = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${sinceISO}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const records = res.data.value || [];

    console.log(`📊 Found ${records.length} records.`);
    
    // Look for anything on May 2nd
    const may2Records = records.filter(r => r.startDateTime.includes("2026-05-02"));
    console.log(`🔎 Found ${may2Records.length} records on May 2nd.`);

    may2Records.forEach((r, idx) => {
      console.log(`\n--- Record #${idx + 1} ---`);
      console.log(`ID: ${r.id}`);
      console.log(`Start: ${r.startDateTime}`);
      console.log(`Organizer: ${r.organizer_v2?.identity?.user?.displayName || 'Unknown'}`);
      console.log(`Join URL: ${r.joinWebUrl ? 'PRESENT' : 'MISSING'}`);
      if (r.joinWebUrl) console.log(`URL: ${r.joinWebUrl}`);
    });

  } catch (err) {
    console.error('❌ Debug Failed:', err.message);
  }
}

debugCallRecords();
