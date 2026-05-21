const axios = require('axios');
const { getToken } = require('./teamsAuth');

// ─────────────────────────────────────────────
// CONFIGURATION
// Set TEAMS_SYNC_USER_ID in your .env file to the
// Azure AD Object ID (or UPN) of the primary sync user.
// This is used as fallback when delegated token is unavailable.
// ─────────────────────────────────────────────
const FALLBACK_USER_ID = process.env.TEAMS_SYNC_USER_ID || null;

// ─────────────────────────────────────────────
// TOKEN HELPER
// ─────────────────────────────────────────────
async function getAccessToken(forceAppToken = false) {
  return await getToken(forceAppToken);
}

// ─────────────────────────────────────────────
// RESOLVE CURRENT USER
// For manual sync: try /me first (delegated token).
// If that fails (e.g. app token is returned), fallback
// to FALLBACK_USER_ID from env.
// ─────────────────────────────────────────────
async function resolveCurrentUser(token) {
  try {
    const res = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const email = res.data.mail || res.data.userPrincipalName || '';
    const id = res.data.id || '';
    console.log(`[teamsHelper] Resolved /me → ${email} (${id})`);
    return { id, email, displayName: res.data.displayName };
  } catch (err) {
    console.warn(`[teamsHelper] /me failed (likely app token): ${err.message}`);
    if (FALLBACK_USER_ID) {
      console.log(`[teamsHelper] Using FALLBACK_USER_ID from env: ${FALLBACK_USER_ID}`);
      return { id: FALLBACK_USER_ID, email: null, displayName: null };
    }
    throw new Error(
      '[teamsHelper] Cannot resolve user for manual sync. ' +
      'Set TEAMS_SYNC_USER_ID in your .env or configure delegated auth in teamsAuth.js.'
    );
  }
}

// ─────────────────────────────────────────────
// FETCH TRANSCRIPT
// ─────────────────────────────────────────────
async function fetchTranscript(meetingId) {
  try {
    const token = await getAccessToken(true); // transcripts need app token
    const res = await axios.get(
      `https://graph.microsoft.com/v1.0/communications/onlineMeetings/${meetingId}/transcripts`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.data.value?.length > 0) {
      const transcriptId = res.data.value[0].id;
      const text = await axios.get(
        `https://graph.microsoft.com/v1.0/communications/onlineMeetings/${meetingId}/transcripts/${transcriptId}/content?$format=text/vtt`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return text.data;
    }
  } catch (e) {
    console.warn(`[teamsHelper] fetchTranscript failed for ${meetingId}: ${e.message}`);
  }
  return null;
}

// ─────────────────────────────────────────────
// CONSTRUCT SHAREPOINT STREAM URL
// ─────────────────────────────────────────────
function constructSharePointUrl(record, organizerEmail) {
  if (!organizerEmail) return null;
  try {
    const userSlug = organizerEmail.replace(/[@.]/g, '_');
    const start = new Date(record.startDateTime);
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}_${pad(start.getHours())}${pad(start.getMinutes())}${pad(start.getSeconds())}`;

    let subject = record.subject || 'Meeting';
    if (subject === 'Meeting' && record.organizer_v2?.identity?.user?.displayName) {
      subject = `${record.organizer_v2.identity.user.displayName}'s Meeting`;
    }

    const personalPath = encodeURIComponent(
      `/personal/${userSlug}/Documents/Recordings/${subject}-${dateStr}-Meeting Recording.mp4`
    );

    const domain = process.env.SHAREPOINT_DOMAIN || 'orairoboticspvtltd-my.sharepoint.com';
    return `https://${domain}/personal/${userSlug}/_layouts/15/stream.aspx?id=${personalPath}&referrer=Teams.TEAMS-ELECTRON&referrerScenario=RecapOpenInStreamButton.view`;
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────────────────────
// FETCH ALL RECORDINGS (unchanged logic, minor cleanup)
// ─────────────────────────────────────────────
async function fetchAllRecordings() {
  try {
    const token = await getAccessToken(true);
    const since = new Date();
    since.setDate(since.getDate() - 25);
    const sinceISO = since.toISOString();

    const url = `https://graph.microsoft.com/v1.0/communications/callRecords?$filter=startDateTime ge ${sinceISO}`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    const records = res.data.value || [];

    const enrichedRecords = [];
    for (const record of records) {
      const organizer = record.organizer_v2?.identity?.user || record.organizer?.user;
      const organizerId = organizer?.id;
      const organizerEmail = organizer?.userPrincipalName || 'unknown';
      const organizerName = organizer?.displayName || 'Unknown';

      let header = `Meeting on ${new Date(record.startDateTime).toLocaleDateString('en-IN')}`;
      let transcript = null;
      let clientName = 'N/A';
      let recordingUrl = constructSharePointUrl(record, organizerEmail);

      if (organizerId && record.joinWebUrl) {
        try {
          // Fix: Proper lowercase 'joinWebUrl' for Graph API OData filter
          // Also escape single quotes for safety
          const escapedUrl = record.joinWebUrl.replace(/'/g, "''");
          
          let mRes = await axios.get(
            `https://graph.microsoft.com/v1.0/users/${organizerId}/onlineMeetings?$filter=joinWebUrl eq '${escapedUrl}'`,
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(() => ({ data: { value: [] } }));

          let meeting = mRes.data.value?.[0];

          // Fallback: If onlineMeeting lookup fails, try searching Calendar events
          // Sometimes calendar events are easier to find and contain the same subject
          if (!meeting) {
            const cRes = await axios.get(
              `https://graph.microsoft.com/v1.0/users/${organizerId}/events?$filter=onlineMeeting/joinUrl eq '${escapedUrl}'`,
              { headers: { Authorization: `Bearer ${token}` } }
            ).catch(() => ({ data: { value: [] } }));
            meeting = cRes.data.value?.[0];
          }

          if (meeting) {
            const rawSubject = meeting.subject || 'Untitled Meeting';
            const meetingId = meeting.id;

            record.subject = rawSubject;
            recordingUrl = constructSharePointUrl(record, organizerEmail);
            
            // Format header: Preserve original title EXACTLY as requested
            header = rawSubject;

            if (rawSubject.startsWith('[ORAI]')) {
              // Still detect client name for filtering purposes, but DON'T modify the header/title
              const cleanPart = rawSubject.replace(/^\[ORAI\]\s*/i, '').trim();
              const firstPart = cleanPart.split(' ')[0];
              if (!clientName || clientName === 'N/A') clientName = firstPart;
            }

            if (rawSubject.includes(' - ')) {
              const parts = rawSubject.split(' - ');
              clientName = parts[parts.length - 1].trim();
            } else if (rawSubject.includes(': ')) {
              const parts = rawSubject.split(': ');
              clientName = parts[0].trim();
            }

            transcript = await fetchTranscript(meetingId);
            console.log(`[teamsHelper] Enriched title: "${header}" for call: ${record.id}`);
          } else {
            console.warn(`[teamsHelper] No title found for call ${record.id} via joinWebUrl`);
          }
        } catch (e) {
          console.warn(`[teamsHelper] Enrichment failed for record ${record.id}: ${e.message}`);
        }
      }

      enrichedRecords.push({
        ...record,
        header,
        startTime: record.startDateTime,
        endTime: record.endDateTime,
        recordingUrl,
        transcript,
        organizerName,
        organizerEmail,
        clientNameDetected: clientName
      });
    }

    return enrichedRecords;
  } catch (err) {
    console.error('[teamsHelper] fetchAllRecordings failed:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// FETCH TEAMS MEETINGS (online meetings list)
// ─────────────────────────────────────────────
async function fetchTeamsMeetings() {
  try {
    const token = await getAccessToken();
    const res = await axios.get('https://graph.microsoft.com/v1.0/communications/onlineMeetings', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data.value || [];
  } catch (error) {
    console.warn('[teamsHelper] fetchTeamsMeetings failed:', error.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// FORMAT ENRICHED CALENDAR EVENT
// ─────────────────────────────────────────────
function formatCalendarEvent(ev, fallbackUserName, fallbackUserEmail) {
  const subject = ev.subject || 'Untitled Meeting';
  const organizerName = ev.organizer?.emailAddress?.name || fallbackUserName || 'Unknown';
  const organizerEmail = ev.organizer?.emailAddress?.address || fallbackUserEmail || 'unknown';
  const location = ev.location?.displayName || '';

  // Detect client from subject: "[ORAI] Client Name - Topic", "Topic - ClientName" or "ClientName: Topic"
  let clientName = null;
  let cleanSubject = subject;

  if (subject.startsWith('[ORAI]')) {
    cleanSubject = subject.replace(/^\[ORAI\]\s*/i, '').trim();
    // Common pattern: [ORAI] ClientName Topic
    const parts = cleanSubject.split(' ');
    if (parts.length > 0) clientName = parts[0]; 
  }

  if (cleanSubject.includes(' - ')) {
    const parts = cleanSubject.split(' - ');
    clientName = parts[parts.length - 1].trim();
    cleanSubject = parts.slice(0, -1).join(' - ').trim();
  } else if (cleanSubject.includes(': ')) {
    const parts = cleanSubject.split(': ');
    clientName = parts[0].trim();
    cleanSubject = parts.slice(1).join(': ').trim();
  }

  const header = subject;

  console.log(`[MEETING FOUND] Title: "${subject}" | Header: "${header}" | Client: "${clientName || 'N/A'}" | Organizer: ${organizerEmail}`);

  return {
    calendarEventId: ev.id,
    title: subject,
    header,
    clientName,
    organizerName,
    organizerEmail,
    location,
    startTime: ev.start?.dateTime ? new Date(ev.start.dateTime) : null,
    endTime: ev.end?.dateTime ? new Date(ev.end.dateTime) : null,
    scheduledDate: ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date(),
    isAllDay: ev.isAllDay || false,
    isOnlineMeeting: ev.isOnlineMeeting || false,
    joinUrl: ev.onlineMeeting?.joinUrl || ev.onlineMeetingUrl || null,
    bodyPreview: ev.bodyPreview || null,
    webLink: ev.webLink || null
  };
}

// ─────────────────────────────────────────────
// FETCH CALENDAR EVENTS FOR A USER BY ID
// Works with both app token and delegated token
// ─────────────────────────────────────────────
async function fetchCalendarForUser(token, userId, startISO, endISO, userDisplayName, userEmail) {
  const url =
    `https://graph.microsoft.com/v1.0/users/${userId}/calendarView` +
    `?startDateTime=${startISO}&endDateTime=${endISO}` +
    `&$select=id,subject,bodyPreview,start,end,location,attendees,organizer,isOnlineMeeting,onlineMeetingUrl,onlineMeeting,isAllDay,webLink` +
    `&$top=100&$orderby=start/dateTime`;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="Asia/Kolkata"'
    }
  });

  return (res.data.value || []).map(ev => ({
    ...ev,
    _fetchedForUser: userId,
    _fetchedForUserName: userDisplayName,
    _fetchedForUserEmail: userEmail
  }));
}

// ─────────────────────────────────────────────
// MAIN: FETCH DAILY CALENDAR EVENTS
//
// useAppToken = true  → Cron job: fetch all users via /users/{id}/calendarView
// useAppToken = false → Manual sync: resolve current user, then /users/{id}/calendarView
//                       (avoids the /me + app-token 400 error entirely)
//
// filterOrganizerOnly:
//   true  → only return meetings where the calendar owner IS the organizer
//   false → return ALL meetings the user is invited to (useful for attendee view)
// ─────────────────────────────────────────────
async function fetchDailyCalendarEvents(useAppToken = false, startDate = null, endDate = null, filterOrganizerOnly = true) {
  try {
    const token = await getAccessToken(useAppToken);

    // Build date range — default to today in server local time
    const now = new Date();
    if (!startDate) {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    }
    if (!endDate) {
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    console.log(`[teamsHelper] Fetching calendar events from ${startISO} to ${endISO}`);

    let allEvents = [];

    if (useAppToken) {
      // ── CRON SYNC: Fetch calendars for all users in the org ──────────────
      console.log('[teamsHelper] Cron sync triggered — fetching all org users...');
      try {
        const usersRes = await axios.get(
          'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName&$top=50',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const users = usersRes.data.value || [];
        console.log(`[teamsHelper] Found ${users.length} users in org`);

        for (const user of users) {
          const userEmail = user.mail || user.userPrincipalName || '';
          try {
            const events = await fetchCalendarForUser(token, user.id, startISO, endISO, user.displayName, userEmail);
            const filtered = filterOrganizerOnly
              ? events.filter(ev => {
                  const orgEmail = ev.organizer?.emailAddress?.address || '';
                  return orgEmail.toLowerCase() === userEmail.toLowerCase();
                })
              : events;
            allEvents.push(...filtered);
            console.log(`[teamsHelper] ${user.displayName}: ${filtered.length} event(s)`);
          } catch (userErr) {
            console.log(`[teamsHelper] Skipping ${user.displayName}: ${userErr.message}`);
          }
        }
      } catch (usersErr) {
        console.error('[teamsHelper] Could not list org users:', usersErr.message);
      }

    } else {
      // ── MANUAL SYNC: Resolve the current user, then fetch their calendar ──
      console.log('[teamsHelper] Manual sync triggered — resolving current user...');

      // KEY FIX: resolveCurrentUser gracefully falls back to FALLBACK_USER_ID
      // if /me returns 400 (app token scenario). No more silent empty result.
      const currentUser = await resolveCurrentUser(token);

      try {
        const events = await fetchCalendarForUser(
          token,
          currentUser.id,
          startISO,
          endISO,
          currentUser.displayName,
          currentUser.email
        );

        console.log(`[GRAPH API] Raw events returned: ${events.length}`);
        console.log('[RAW TEAMS API RESPONSE]', JSON.stringify(events, null, 2));

        // Optionally filter to only meetings this user organised
        allEvents = filterOrganizerOnly
          ? events.filter(ev => {
              const orgEmail = ev.organizer?.emailAddress?.address || '';
              const myEmail = currentUser.email || '';
              // If we don't know the email (fallback user), skip the organizer filter
              if (!myEmail) return true;
              return orgEmail.toLowerCase() === myEmail.toLowerCase();
            })
          : events;

        console.log(`[teamsHelper] After organizer filter: ${allEvents.length} event(s)`);

        // ── DIAGNOSTIC: Warn if organizer filter is dropping everything ──
        if (events.length > 0 && allEvents.length === 0) {
          console.warn(
            '[teamsHelper] ⚠️  All events were dropped by the organizer filter. ' +
            'This usually means the synced user is an ATTENDEE, not the organizer. ' +
            'Set filterOrganizerOnly=false in the sync controller to include all events.'
          );
        }
      } catch (calErr) {
        console.error(`[teamsHelper] calendarView failed for user ${currentUser.id}: ${calErr.message}`);
        if (calErr.response) {
          console.error('[teamsHelper] Graph error detail:', JSON.stringify(calErr.response.data));
        }
      }
    }

    // ── DEDUPLICATE by event ID ───────────────────────────────────────────
    const uniqueEvents = [];
    const seenIds = new Set();
    for (const ev of allEvents) {
      if (!seenIds.has(ev.id)) {
        seenIds.add(ev.id);
        uniqueEvents.push(ev);
      }
    }

    console.log(`[teamsHelper] Found ${uniqueEvents.length} unique calendar event(s)`);

    // ── FORMAT AND RETURN ────────────────────────────────────────────────
    return uniqueEvents.map(ev =>
      formatCalendarEvent(ev, ev._fetchedForUserName, ev._fetchedForUserEmail)
    );

  } catch (err) {
    console.error('[teamsHelper] fetchDailyCalendarEvents failed:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────
// FETCH MEETING RECORDINGS FOR A SPECIFIC MEETING
// Call this after a meeting ends to auto-update the recording URL
// Usage: await fetchMeetingRecordings(userId, joinWebUrl)
// ─────────────────────────────────────────────
async function fetchMeetingRecordings(userId, joinWebUrl) {
  try {
    const token = await getAccessToken(true);

    // Step 1: Resolve the meeting object from joinWebUrl
    const mRes = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings?$filter=JoinWebUrl eq '${joinWebUrl}'`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!mRes.data.value?.length) {
      console.warn('[teamsHelper] fetchMeetingRecordings: No meeting found for joinWebUrl');
      return null;
    }

    const meetingId = mRes.data.value[0].id;

    // Step 2: Fetch recordings for this meeting
    const rRes = await axios.get(
      `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings/${meetingId}/recordings`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const recordings = rRes.data.value || [];
    if (!recordings.length) {
      console.log('[teamsHelper] No recordings available yet (may still be processing)');
      return null;
    }

    // Return the most recent recording
    const latest = recordings[recordings.length - 1];
    console.log(`[teamsHelper] Recording found: ${latest.id}`);
    return {
      recordingId: latest.id,
      recordingContentUrl: latest.recordingContentUrl || null,
      createdDateTime: latest.createdDateTime || null,
      meetingId
    };
  } catch (err) {
    console.error('[teamsHelper] fetchMeetingRecordings failed:', err.message);
    if (err.response) {
      console.error('[teamsHelper] Graph error:', JSON.stringify(err.response.data));
    }
    return null;
  }
}

module.exports = {
  fetchTeamsMeetings,
  fetchTranscript,
  fetchAllRecordings,
  fetchDailyCalendarEvents,
  fetchMeetingRecordings   // ← NEW: use in sync controller for auto recording update
};