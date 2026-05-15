/**
 * One-time migration: Enrich manual meetings with proper titles
 * Run: node scripts/enrichManual.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Meeting = require('../models/Meeting');
const User = require('../models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/orai_insight_hub');
  console.log('✅ Connected to MongoDB');

  // Find all meetings with generic "Meeting on" titles
  const rawMeetings = await Meeting.find({
    $or: [
      { header: { $regex: /^Meeting on /i } },
      { title: { $regex: /^Meeting on /i } },
      { title: null },
      { title: { $exists: false } }
    ]
  }).populate('createdBy', 'username fullName email department');

  console.log(`Found ${rawMeetings.length} raw/manual meetings to update`);

  let updated = 0, skipped = 0;

  for (const meeting of rawMeetings) {
    let changed = false;
    const creator = meeting.createdBy;

    // Update organizer info from createdBy user
    if (creator) {
      if (!meeting.organizerName && creator.fullName) {
        meeting.organizerName = creator.fullName;
        changed = true;
      }
      if (!meeting.ownerEmail && creator.email) {
        meeting.ownerEmail = creator.email;
        changed = true;
      }
    }

    // Improve the title — use clientName + date if available
    if (meeting.header && meeting.header.startsWith('Meeting on ')) {
      const date = new Date(meeting.scheduledDate);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

      if (meeting.clientName && meeting.clientName !== 'N/A') {
        meeting.header = `${meeting.clientName} — ${dateStr}`;
        meeting.title = `Meeting with ${meeting.clientName}`;
      } else if (creator && creator.fullName) {
        meeting.header = `${creator.fullName} — ${dateStr}`;
        meeting.title = `${creator.fullName}'s Meeting`;
      } else {
        meeting.header = `Manual Entry — ${dateStr}`;
        meeting.title = `Manual Meeting — ${dateStr}`;
      }
      changed = true;
    }

    // Also fix title if it says "Meeting on ..."
    if (meeting.title && meeting.title.startsWith('Meeting on ')) {
      const date = new Date(meeting.scheduledDate);
      const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      if (meeting.clientName && meeting.clientName !== 'N/A') {
        meeting.title = `Meeting with ${meeting.clientName}`;
      } else if (creator && creator.fullName) {
        meeting.title = `${creator.fullName}'s Meeting`;
      } else {
        meeting.title = `Manual Meeting — ${dateStr}`;
      }
      changed = true;
    }

    // Set title if completely missing
    if (!meeting.title) {
      meeting.title = meeting.header;
      changed = true;
    }

    if (changed) {
      await meeting.save({ validateBeforeSave: false });
      updated++;
      console.log(`  ✏️  ${meeting._id} → Title: "${meeting.title}" | Header: "${meeting.header}"`);
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}, Total: ${rawMeetings.length}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('❌ Error:', err); process.exit(1); });
