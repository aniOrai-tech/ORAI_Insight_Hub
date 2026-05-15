const cron = require('node-cron');
const { sendExpiryReminders } = require('./emailService');
const Meeting = require('../models/Meeting');
const { fetchAllRecordings, fetchTranscript, fetchDailyCalendarEvents } = require('./teamsHelper');
const { isAuthenticated } = require('./teamsAuth');
const { summarizeMeeting } = require('./claudeHelper');

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  console.log('🕒 Initializing Cron Jobs...');

  // ─── Daily Expiry Reminders (08:00 AM IST) ─────────────────
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ Running daily meeting expiry check...');
    try {
      const result = await sendExpiryReminders();
      console.log(`✅ Daily check complete. Reminders processed: ${result.processed}`);
    } catch (error) {
      console.error('❌ Error in daily meeting check:', error.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  // ─── Automatic Recording Update (Every 6 hours) ──────
  cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ Running automatic meeting recording update...');
    
    if (!isAuthenticated()) {
      console.log('⚠️ Teams not authenticated. Skipping auto-update.');
      return;
    }

    try {
      const enrichedRecords = await fetchAllRecordings();
      let imported = 0;

      for (const record of enrichedRecords) {
        let meeting = await Meeting.findOne({ teamsId: record.id });
        
        if (meeting) {
          // HEALING: Update existing if data is missing or generic
          let changed = false;
          if (!meeting.startTime && record.startDateTime) { meeting.startTime = record.startDateTime; changed = true; }
          if (!meeting.endTime && record.endDateTime) { meeting.endTime = record.endDateTime; changed = true; }
          if (meeting.header.startsWith('Meeting on ') || meeting.header.startsWith('Manual Entry')) {
            if (record.header && !record.header.startsWith('Meeting on ')) {
              meeting.header = record.header;
              meeting.title = record.header;
              meeting.clientName = record.clientNameDetected;
              changed = true;
            }
          }
          if (changed) {
            await meeting.save();
            console.log(`[CRON HEAL] Repaired meeting: ${meeting._id}`);
          }
          continue;
        }

        const durationMs  = new Date(record.endDateTime) - new Date(record.startDateTime);
        const durationMin = Math.round(durationMs / 60000);

        // --- FILTER: Ignore very short calls (< 2 mins) ---
        if (durationMin < 2) {
          console.log(`[cron] Skipping short call: ${record.id} (${durationMin} min)`);
          continue;
        }

        let summary = null;
        if (record.transcript) {
          summary = await summarizeMeeting(record.transcript).catch(() => null);
        }

        await Meeting.create({
          teamsId:       record.id,
          source:        'auto_sync',
          header:        record.header,
          title:         record.header, // Ensure title is also set
          clientName:    record.clientNameDetected,
          scheduledDate: record.startDateTime,
          startTime:     record.startDateTime,
          endTime:       record.endDateTime,
          ownerEmail:    record.organizerEmail,
          organizerName: record.organizerName,
          recordingUrl:  record.recordingUrl,
          transcript:    record.transcript,
          summary:       summary,
          duration:      durationMin > 0 ? `${durationMin} min` : null,
          department:    'General',
          status:        'active'
        });
        imported++;
      }
      console.log(`✅ Auto-update complete. Imported ${imported} new recordings.`);
    } catch (error) {
      console.error('❌ Error in automatic recording update:', error.message);
    }
  });

  // ─── Daily Calendar Sync at 7:00 PM IST ──────────────────────
  // This runs even if user hasn't logged in, using app-level credentials
  cron.schedule('0 19 * * *', async () => {
    console.log('⏰ [7 PM CRON] Running daily calendar sync...');

    try {
      // Fetch today's calendar events using application credentials
      const calendarEvents = await fetchDailyCalendarEvents(true);
      let added = 0, updated = 0, skipped = 0;

      console.log(`[7 PM CRON] Found ${calendarEvents.length} calendar events for today`);

      for (const ev of calendarEvents) {
        try {
          // Check if meeting already exists by calendarEventId
          let meeting = await Meeting.findOne({ calendarEventId: ev.calendarEventId });

          if (!meeting && ev.joinUrl) {
            // Backward compatibility: check by joinUrl
            meeting = await Meeting.findOne({ joinUrl: ev.joinUrl });
          }

          if (!meeting) {
            // Create new meeting from calendar event
            await Meeting.create({
              calendarEventId: ev.calendarEventId,
              source:          'calendar_sync',
              title:           ev.title,
              header:          ev.header,
              clientName:      ev.clientName,
              scheduledDate:   ev.scheduledDate,
              startTime:       ev.startTime,
              endTime:         ev.endTime,
              location:        ev.location,
              attendees:       ev.attendees,
              isAllDay:        ev.isAllDay,
              ownerEmail:      ev.organizerEmail,
              organizerName:   ev.organizerName,
              joinUrl:         ev.joinUrl,
              summary:         ev.bodyPreview || null,
              department:      'General', // Default department for auto-sync
              status:          'active'
            });
            added++;
          } else {
            // Update existing meeting with latest calendar data
            let changed = false;
            if (ev.title && meeting.title !== ev.title) { meeting.title = ev.title; changed = true; }
            if (ev.header && meeting.header !== ev.header) { meeting.header = ev.header; changed = true; }
            if (ev.location && meeting.location !== ev.location) { meeting.location = ev.location; changed = true; }
            if (ev.startTime && (!meeting.startTime || meeting.startTime.getTime() !== ev.startTime.getTime())) {
              meeting.startTime = ev.startTime; changed = true;
            }
            if (ev.endTime && (!meeting.endTime || meeting.endTime.getTime() !== ev.endTime.getTime())) {
              meeting.endTime = ev.endTime; changed = true;
            }
            if (ev.attendees?.length && JSON.stringify(meeting.attendees) !== JSON.stringify(ev.attendees)) {
              meeting.attendees = ev.attendees; changed = true;
            }
            if (ev.joinUrl && !meeting.joinUrl) { meeting.joinUrl = ev.joinUrl; changed = true; }
            if (!meeting.calendarEventId && ev.calendarEventId) {
              meeting.calendarEventId = ev.calendarEventId; changed = true;
            }

            if (changed) {
              await meeting.save();
              updated++;
            } else {
              skipped++;
            }
          }
        } catch (evErr) {
          console.error(`[7 PM CRON] Error processing event "${ev.title}":`, evErr.message);
          skipped++;
        }
      }

      console.log(`✅ [7 PM CRON] Daily calendar sync complete. Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);

      // Also perform recording import if authenticated
      if (isAuthenticated()) {
        try {
          const recordings = await fetchAllRecordings();
          let recImported = 0;
          for (const record of recordings) {
            let meeting = await Meeting.findOne({ teamsId: record.id });
            
            if (meeting) {
              // HEALING: Update existing if data is missing or generic
              let changed = false;
              if (!meeting.startTime && record.startDateTime) { meeting.startTime = record.startDateTime; changed = true; }
              if (!meeting.endTime && record.endDateTime) { meeting.endTime = record.endDateTime; changed = true; }
              if (meeting.header.startsWith('Meeting on ') || meeting.header.startsWith('Manual Entry')) {
                if (record.header && !record.header.startsWith('Meeting on ')) {
                  meeting.header = record.header;
                  meeting.title = record.header;
                  meeting.clientName = record.clientNameDetected;
                  changed = true;
                }
              }
              if (changed) {
                await meeting.save();
                console.log(`[7PM CRON HEAL] Repaired meeting: ${meeting._id}`);
              }
              continue;
            }

            const durationMs  = new Date(record.endDateTime) - new Date(record.startDateTime);
            const durationMin = Math.round(durationMs / 60000);

            let summary = null;
            if (record.transcript) {
              summary = await summarizeMeeting(record.transcript).catch(() => null);
            }

            await Meeting.create({
              teamsId:       record.id,
              source:        'auto_sync',
              header:        record.header,
              title:         record.header,
              clientName:    record.clientNameDetected,
              scheduledDate: record.startDateTime,
              startTime:     record.startDateTime,
              endTime:       record.endDateTime,
              ownerEmail:    record.organizerEmail,
              organizerName: record.organizerName,
              recordingUrl:  record.recordingUrl,
              transcript:    record.transcript,
              summary:       summary,
              duration:      durationMin > 0 ? `${durationMin} min` : null,
              department:    'General',
              status:        'active'
            });
            recImported++;
          }
          console.log(`✅ [7 PM CRON] Recording import complete. Imported ${recImported} new recordings.`);
        } catch (recErr) {
          console.error('❌ [7 PM CRON] Recording import error:', recErr.message);
        }
      }
    } catch (error) {
      console.error('❌ [7 PM CRON] Error in daily calendar sync:', error.message);
    }
  }, { timezone: 'Asia/Kolkata' });

  console.log('🚀 Cron Jobs scheduled: [Daily@08:00 Expiry, Every 6h Recording, Daily@19:00 Calendar Sync]');
};

module.exports = { initCronJobs };
