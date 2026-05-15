require('dotenv').config();
const mongoose = require('mongoose');
const Meeting = require('./models/Meeting');
const { fetchAllRecordings } = require('./utils/teamsHelper');

async function manualImport() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  try {
    // Clean up previous test imports
    await Meeting.deleteMany({ source: 'recording_import' });
    console.log('🧹 Cleaned up previous imports');

    console.log('📡 Fetching and enriching recordings...');
    const callRecords = await fetchAllRecordings();
    console.log(`📊 Found ${callRecords.length} records from Teams.`);

    let imported = 0, errors = 0;

    for (const record of callRecords) {
      try {
        await Meeting.create({
          teamsId:       record.id,
          source:        'recording_import',
          header:        record.header,
          clientName:    record.clientNameDetected,
          scheduledDate: record.startDateTime,
          ownerEmail:    record.organizerEmail,
          organizerName: record.organizerName,
          recordingUrl:  record.recordingUrl,

          department:    'CS Team',
          status:        'active'
        });
        imported++;
      } catch (e) {
        console.error('Error creating meeting:', e.message);
        errors++;
      }
    }

    console.log(`🎉 Finished. Imported: ${imported}, Errors: ${errors}`);
  } catch (err) {
    console.error('❌ Import failed:', err.message);
  }

  process.exit(0);
}

manualImport();
