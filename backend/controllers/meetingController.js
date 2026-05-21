const Meeting = require('../models/Meeting');
const { 
  fetchTeamsMeetings, 
  fetchTranscript, 
  fetchAllRecordings, 
  fetchDailyCalendarEvents,
  fetchMeetingRecordings 
} = require('../utils/teamsHelper');
const { summarizeMeeting } = require('../utils/claudeHelper');
const { sendExpiryReminders } = require('../utils/emailService');
const teamsAuth = require('../utils/teamsAuth');

exports.getSyncStatus = async (req, res) => {
  res.json({ success: true, authenticated: teamsAuth.isAuthenticated() });
};

// ─── GET ALL: Paginated and Filtered ──────────────────────────────────────────
exports.getMeetings = async (req, res, next) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const filter = req.user.role === 'admin' ? { isDeleted: { $ne: true } } : { department: req.user.department, isDeleted: { $ne: true } };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { header: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { ownerEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Meeting.countDocuments(filter);
    const meetings = await Meeting.find(filter)
      .populate('createdBy', 'username fullName')
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: meetings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET ONE ──────────────────────────────────────────────────────────────────
exports.getMeetingById = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
    const meeting = await Meeting.findOne(query).populate('createdBy', 'username fullName');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE: Manual ───────────────────────────────────────────────────────────
exports.createMeeting = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      source:     'manual',
      createdBy:  req.user._id,
      department: req.user.department
    };

    if (req.file) {
      data.recording = {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        path:         req.file.path,
        size:         req.file.size,
        mimetype:     req.file.mimetype
      };
    }

    const meeting = await Meeting.create(data);
    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      data: meeting
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.updateMeeting = async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      ...(req.user.role !== 'admin' && { department: req.user.department })
    });

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const updates = { ...req.body };

    if (req.file) {
      updates.recording = {
        filename:     req.file.filename,
        originalName: req.file.originalname,
        path:         req.file.path,
        size:         req.file.size,
        mimetype:     req.file.mimetype
      };
    }

    Object.keys(updates).forEach(key => {
      meeting[key] = updates[key];
    });

    await meeting.save();
    res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
exports.deleteMeeting = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? { _id: req.params.id } : { _id: req.params.id, department: req.user.department };
    const meeting = await Meeting.findOneAndDelete(query);

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE LINK (Teams Link) ─────────────────────────────────────────────────
exports.updateMeetingLink = async (req, res, next) => {
  try {
    const { joinUrl, ownerEmail } = req.body;
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, department: req.user.department },
      { joinUrl, ownerEmail },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting });
  } catch (error) {
    next(error);
  }
};

// ─── AUTO SYNC: Pull today's meetings from Calendar ───────────────────────────
exports.syncFromTeams = async (req, res, next) => {
  console.log('[SYNC API HIT]');
  console.log('[SYNC CONTROLLER STARTED]');
  try {
    const calendarEvents = await fetchDailyCalendarEvents(false);
    let added = 0, updated = 0, skipped = 0;

    for (const ev of calendarEvents) {
      try {
        console.log(`[MEETING TITLE FOUND] Field: subject/title, Value: "${ev.title}"`);
        // Check if meeting already exists by calendarEventId
        let meeting = await Meeting.findOne({ calendarEventId: ev.calendarEventId });

        if (!meeting) {
          // Also check by teamsId for backward compatibility
          if (ev.joinUrl) {
            meeting = await Meeting.findOne({ joinUrl: ev.joinUrl });
          }
        }

        if (!meeting) {
          // Create new meeting from calendar event
          const newMeeting = await Meeting.create({
            calendarEventId: ev.calendarEventId,
            source:          'calendar_sync',
            title:           ev.title,
            header:          ev.header,
            clientName:      ev.clientName,
            scheduledDate:   ev.scheduledDate,
            startTime:       ev.startTime,
            endTime:         ev.endTime,
            location:        ev.location,
            isAllDay:        ev.isAllDay,
            ownerEmail:      ev.organizerEmail,
            organizerName:   ev.organizerName,
            joinUrl:         ev.joinUrl,
            summary:         ev.bodyPreview || null,
            createdBy:       req.user._id,
            department:      req.user.department,
            status:          'active'
          });
          console.log(`[MEETING SAVED TO DB] [MEETING TITLE SAVED] Title: ${newMeeting.title}, Header: ${newMeeting.header}`);
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

        // Proactive Enrichment: If we have a joinUrl, try to find a recording/transcript immediately
        if (meeting && meeting.joinUrl && !meeting.recordingUrl) {
          const recordingData = await fetchMeetingRecordings(meeting._fetchedForUser || ev._fetchedForUser, meeting.joinUrl);
          if (recordingData && recordingData.recordingContentUrl) {
            meeting.recordingUrl = recordingData.recordingContentUrl;
            meeting.teamsId = recordingData.recordingId;
            // Also try to get transcript if meetingId is available
            if (recordingData.meetingId) {
              const transcript = await fetchTranscript(recordingData.meetingId);
              if (transcript) meeting.transcript = transcript;
            }
            await meeting.save();
            console.log(`[SYNC ENRICH] Found recording for: ${meeting.title}`);
          }
        }
      } catch (evErr) {
        console.error(`[syncFromTeams] Error processing event "${ev.title}":`, evErr.message);
        skipped++;
      }
    }

    res.json({ success: true, added, updated, skipped, total: calendarEvents.length });
  } catch (error) {
    next(error);
  }
};

// ─── IMPORT ALL: Bulk import all recordings from last 60 days ─────────────────
exports.importAllRecordings = async (req, res, next) => {
  try {
    const callRecords = await fetchAllRecordings();
    let imported = 0, skipped = 0;

    for (const record of callRecords) {
      // Check if already saved
      let meeting = await Meeting.findOne({ teamsId: record.id });
      
      if (meeting) {
        // Update existing if data is missing or generic
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
          console.log(`[MEETING REPAIR] Updated existing: ${meeting._id}`);
          imported++; // Count as updated/imported
        } else {
          skipped++;
        }
        continue;
      }

      try {
        const durationMs  = new Date(record.endDateTime) - new Date(record.startDateTime);
        const durationMin = Math.round(durationMs / 60000);

        let summary = null;
        if (record.transcript) {
          summary = await summarizeMeeting(record.transcript).catch(() => null);
        }

        await Meeting.create({
          teamsId:       record.id,
          source:        'recording_import',
          header:        record.header,
          clientName:    record.clientNameDetected,
          scheduledDate: record.startDateTime,
          ownerEmail:    record.organizerEmail,
          organizerName: record.organizerName,
          recordingUrl:  record.recordingUrl,
          transcript:    record.transcript,
          summary:       summary,
          duration:      durationMin > 0 ? `${durationMin} min` : null,
          department:    req.user.department,
          status:        'active',
          createdBy:     req.user._id
        });
        imported++;
      } catch (e) {
        console.error('Error creating meeting during bulk import:', e.message);
      }
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: imported + skipped,
      message: `Imported ${imported} recordings, skipped ${skipped} already in DB`
    });
  } catch (error) {
    next(error);
  }
};

// ─── ENRICH MANUAL: Update raw manual meetings with proper data ───────────────
exports.enrichManualMeetings = async (req, res, next) => {
  try {
    const User = require('../models/User');

    // Find all meetings that have generic "Meeting on" titles or no title
    const rawMeetings = await Meeting.find({
      $or: [
        { header: { $regex: /^Meeting on /i } },
        { title: { $regex: /^Meeting on /i } },
        { title: null },
        { title: { $exists: false } }
      ],
      calendarEventId: { $exists: false }, // Only manual entries (not Teams Sync)
      teamsId: { $exists: false }          // Only manual entries (not Recording Import)
    }).populate('createdBy', 'username fullName email department');

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
          meeting.title = meeting.title || `Meeting with ${meeting.clientName}`;
        } else if (creator && creator.fullName) {
          meeting.header = `${creator.fullName} — ${dateStr}`;
          meeting.title = meeting.title || `${creator.fullName}'s Meeting`;
        } else {
          meeting.header = `Manual Entry — ${dateStr}`;
          meeting.title = meeting.title || `Manual Meeting — ${dateStr}`;
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
        console.log(`[ENRICH] Updated: ${meeting._id} → "${meeting.header}"`);
      } else {
        skipped++;
      }
    }

    res.json({
      success: true,
      updated,
      skipped,
      total: rawMeetings.length,
      message: `Enriched ${updated} manual meetings, ${skipped} already had proper data`
    });
  } catch (error) {
    next(error);
  }
};