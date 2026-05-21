/**
 * Meetings Tracker Module
 */

let meetingsData = [];
let meetingsPage = 1;

async function renderMeetings(container) {
  container.innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Meetings Tracker</div>
        <div class="section-sub">Consolidated view of all scheduled calendar events and completed Teams recordings.</div>
      </div>
      <div style="display:flex; align-items:center; gap:12px">
        <div id="teams-status-badge" style="display:flex; align-items:center; gap:6px; font-size:0.75rem; background:var(--bg-body); padding:4px 10px; border-radius:20px; border:1px solid var(--border)">
          <span class="pulse-indicator" style="width:8px; height:8px; border-radius:50%; background:var(--text-muted)"></span>
          <span style="color:var(--text-muted)">Checking Teams...</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window.open('/teams-auth/login', '_blank')" title="Connect Microsoft Teams">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span>Connect Teams</span>
        </button>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost" onclick="toggleAllFilterIcons()" title="Show/Hide Table Filters">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg>
          <span>Filters</span>
        </button>
        <button class="btn btn-ghost" onclick="syncTeamsMeetings()" title="Sync Today's Meetings from Calendar Schedule">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 12c0-4.4 3.6-8 8-8 3.3 0 6.2 2 7.4 4.9M22 12c0 4.4-3.6 8-8 8-3.3 0-6.2-2-7.4-4.9"/></svg>
          <span>Sync Schedule</span>
        </button>
        <button class="btn btn-ghost" onclick="importTeamsRecordings()" title="Import Last 60 Days Recordings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import 60 Days</span>
        </button>
        <button class="btn btn-ghost" onclick="enrichManualMeetings()" title="Update raw manual meeting data with proper titles and organizer info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Update Manual Data</span>
        </button>

        <button class="btn btn-secondary" onclick="openImportModal('Meetings')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Import Excel</span>
        </button>
        <button class="btn btn-primary" onclick="openMeetingForm()">
          ${iconPlus()} Add Meeting
        </button>
      </div>

    </div>

    <!-- Recent Records Section -->
    <div class="charts-grid" style="grid-template-columns: 1fr; margin-bottom: 24px;">
      <div class="table-card" style="margin: 0">
        <div class="table-header" style="padding: 12px 20px; border-bottom: 1px solid var(--border-color)">
          <div class="table-title" style="font-size: 0.9rem">Recent Records</div>
        </div>
        <div id="recent-meetings-list" style="padding: 10px 20px; display: flex; gap: 12px; overflow-x: auto;">
          <!-- Populated by loadRecentMeetings() -->
          <div class="skeleton" style="height: 60px; width: 200px; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 60px; width: 200px; border-radius: 8px;"></div>
          <div class="skeleton" style="height: 60px; width: 200px; border-radius: 8px;"></div>
        </div>
      </div>
    </div>

    <div class="table-card">
      <div class="table-header">
        <div class="table-title">All Meetings</div>
        <div class="table-actions">
          <select class="search-input" style="width:130px" onchange="filterMeetings(this.value)">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <input type="text" class="search-input" placeholder="Search meetings..." data-module="Meetings" oninput="SearchManager.search('Meetings', this.value, loadMeetings)" />
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th><div class="th-content"><span>Meeting Title / Header</span><button class="filter-trigger" onclick="openMeetingColumnFilter(this, 'meetingHeader')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Client</span><button class="filter-trigger" onclick="openMeetingColumnFilter(this, 'clientName')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Scheduled</span><button class="filter-trigger" onclick="openMeetingColumnFilter(this, 'scheduledDate')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Expiry</span><button class="filter-trigger" onclick="openMeetingColumnFilter(this, 'expiryDate')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th><div class="th-content"><span>Status</span><button class="filter-trigger" onclick="openMeetingColumnFilter(this, 'status')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9v6l4 2v-8L22 3z"/></svg></button></div></th>
              <th>Recording</th>
              <th>Actions</th>
            </tr>



          </thead>
          <tbody id="meetings-list">
            <tr><td colspan="7"><div class="empty-table"><p>Loading...</p></div></td></tr>
          </tbody>
        </table>
      </div>
      <div id="meetings-pagination" class="pagination"></div>
    </div>
  `;

  await Promise.all([
    loadMeetings(),
    checkTeamsStatus()
  ]);
}

async function checkTeamsStatus() {
  const badge = document.getElementById('teams-status-badge');
  if (!badge) return;

  const res = await api.get('/meetings/sync-status'); // New endpoint needed
  if (res.ok && res.data.authenticated) {
    badge.innerHTML = `
      <span style="width:8px; height:8px; border-radius:50%; background:var(--green); box-shadow:0 0 8px var(--green)"></span>
      <span style="color:var(--green); font-weight:600">Teams Connected</span>
    `;
  } else {
    badge.innerHTML = `
      <span style="width:8px; height:8px; border-radius:50%; background:var(--red)"></span>
      <span style="color:var(--text-muted)">Teams Disconnected</span>
    `;
  }
}

async function loadMeetings(options = {}) {
  const params = { page: meetingsPage, limit: 15, ...options };
  const res = await api.meetings.list(params);
  
  const tbody = document.getElementById('meetings-list');
  const recentSection = document.getElementById('recent-meetings-list')?.closest('.charts-grid');

  if (res.ok) {
    meetingsData = res.data.data;
    
    // Hide recent records if searching
    if (params.search && recentSection) {
      recentSection.style.display = 'none';
    } else if (recentSection) {
      recentSection.style.display = 'grid';
      renderRecentMeetings(meetingsData.slice(0, 5));
    }

    if (meetingsData.length === 0 && params.search) {
      SearchManager.renderEmptyState('Meetings', 'meetings-list');
    } else {
      renderMeetingsTable(meetingsData);
    }
    
    renderPagination('meetings-pagination', res.data.pagination, (p) => {
      meetingsPage = p; 
      loadMeetings({ ...options, page: p });
    });
  } else {
    if (res.data && res.data.message === 'Request aborted') return;
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="error-state">Error: ${res.data.message}</td></tr>`;
  }
}

function renderRecentMeetings(meetings) {
  const container = document.getElementById('recent-meetings-list');
  if (!container) return;

  if (!meetings.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;padding:10px">No recent meetings found.</p>';
    return;
  }

  container.innerHTML = meetings.map(m => `
    <div class="recent-card clickable" onclick="viewMeeting('${m._id}')" style="min-width:240px; background:var(--bg-card); border:1px solid var(--border-color); border-radius:10px; padding:12px; transition:0.2s">
      <div style="font-weight:700; color:var(--accent); font-size:0.85rem; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${(m.title || m.header || 'Untitled').replace(/"/g, '&quot;')}">
        ${truncate(m.title || m.header || 'Untitled Meeting', 30)}
      </div>
      <div style="font-size:0.75rem; color:var(--text-primary); font-weight:600; margin-bottom:2px">${truncate(m.header || 'N/A', 35)}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px">
        <span style="font-size:0.7rem; color:var(--text-muted)">${formatDate(m.scheduledDate)}</span>
        <span class="badge ${m.status==='active'?'badge-green':'badge-red'}" style="font-size:0.6rem; padding:2px 6px">${m.status}</span>
      </div>
    </div>
  `).join('');
}

function renderMeetingsTable(meetings) {
  const tbody = document.getElementById('meetings-list');
  if (!tbody) return;

  if (!meetings.length) {
    SearchManager.renderEmptyState('Meetings', 'meetings-list');
    return;
  }

  tbody.innerHTML = meetings.map(m => {
    // Format time range if available
    let timeStr = '';
    if (m.startTime) {
      const st = new Date(m.startTime);
      const stStr = st.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      if (m.endTime) {
        const et = new Date(m.endTime);
        const etStr = et.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        timeStr = `🕒 ${stStr} \u2014 ${etStr}`;
      } else {
        timeStr = `🕒 ${stStr}`;
      }
    }

    return `
    <tr>
      <td>
        <div style="max-width:320px">
          <div style="font-weight:700;color:var(--accent);font-size:0.92rem;margin-bottom:2px" title="${(m.title || m.header || '').replace(/"/g, '&quot;')}">
            ${truncate(m.title || m.header || 'Untitled Meeting', 50)}
          </div>
          ${(m.header && m.header !== m.title) ? `<div style="font-weight:600;color:var(--text-primary);font-size:0.85rem">${truncate(m.header, 45)}</div>` : ''}
          <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;line-height:1.5">
            <span style="color:var(--accent);font-weight:500">[${m.calendarEventId || m.teamsId ? (m.calendarEventId ? 'Teams Sync' : 'Teams Rec') : 'Manual'}]</span>
            ${m.organizerName ? `<br>👤 ${m.organizerName}` : ''}
            ${m.ownerEmail ? `<br>📧 ${m.ownerEmail}` : ''}
            ${timeStr ? `<br>${timeStr}` : ''}
            ${m.location ? `<br>📍 ${truncate(m.location, 30)}` : ''}
          </div>
        </div>
      </td>
      <td>${m.clientName || '\u2014'}</td>
      <td>${formatDate(m.scheduledDate)}</td>
      <td>${formatDate(m.expiryDate)}<br>${expiryBadge(m.expiryDate)}</td>
      <td>${statusBadge(m.status)}</td>
      <td>
        ${m.recording?.filename
          ? `<a href="/uploads/recordings/${m.recording.filename}" target="_blank" class="btn btn-ghost btn-sm">🎙 Play</a>`
          : (m.recordingUrl 
              ? `<a href="${m.recordingUrl}" target="_blank" class="btn btn-ghost btn-sm" title="Microsoft Teams Recording">🔗 Teams Rec</a>`
              : '<span style="color:var(--text-muted);font-size:0.8rem">None</span>')
        }
      </td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon" onclick="viewMeeting('${m._id}')" title="View">${iconEye()}</button>
          <button class="btn btn-ghost btn-icon" onclick="editMeeting('${m._id}')" title="Edit">${iconEdit()}</button>
          <button class="btn btn-ghost btn-icon" style="color:var(--red)" onclick="deleteMeetingConfirm('${m._id}','${(m.title || m.header || '').replace(/'/g,"\\'")}')"> ${iconTrash()}</button>
        </div>
      </td>
    </tr>
  `}).join('');
}

let meetingSearchTimeout;
function searchMeetings(query) {
  clearTimeout(meetingSearchTimeout);
  meetingSearchTimeout = setTimeout(() => loadMeetings({ search: query }), 350);
}
function filterMeetings(status) { loadMeetings({ status }); }

function openMeetingForm(meeting = null) {
  const isEdit = !!meeting;
  const html = `
    <form id="meeting-form" onsubmit="saveMeeting(event, ${isEdit ? `'${meeting._id}'` : 'null'})">
      <div class="form-grid">
        <div class="field full">
          <label>Meeting Header *</label>
          <input type="text" name="header" required placeholder="e.g. Q4 Strategy Review \u2014 Acme Corp" value="${isEdit ? meeting.header : ''}" />
        </div>
        <div class="field full">
          <label>Meeting Title / Subject</label>
          <input type="text" name="title" placeholder="e.g. Weekly Standup - Project Alpha" value="${isEdit ? (meeting.title||'') : ''}" />
        </div>
        <div class="field">
          <label>Client Name</label>
          <input type="text" name="clientName" placeholder="Client / Account name" value="${isEdit ? (meeting.clientName||'') : ''}" />
        </div>
        <div class="field">
          <label>Owner Email (for reminders)</label>
          <input type="email" name="ownerEmail" placeholder="owner@company.com" value="${isEdit ? (meeting.ownerEmail||'') : ''}" />
        </div>
        <div class="field">
          <label>Scheduled Date *</label>
          <input type="date" name="scheduledDate" required value="${isEdit ? meeting.scheduledDate?.split('T')[0] : ''}" />
        </div>
        <div class="field">
          <label>Status</label>
          <select name="status">
            <option value="active" ${isEdit && meeting.status==='active' ? 'selected' : ''}>Active</option>
            <option value="expired" ${isEdit && meeting.status==='expired' ? 'selected' : ''}>Expired</option>
            <option value="archived" ${isEdit && meeting.status==='archived' ? 'selected' : ''}>Archived</option>
          </select>
        </div>
        <div class="field full">
          <label>Summary of Call</label>
          <textarea name="summary" rows="4" placeholder="Key points discussed, decisions made...">${isEdit ? (meeting.summary||'') : ''}</textarea>
        </div>
        <div class="field full">
          <label>Teams Recording URL</label>
          <input type="url" name="recordingUrl" placeholder="https://teams.microsoft.com/..." value="${isEdit ? (meeting.recordingUrl||'') : ''}" />
        </div>
        <div class="field full">
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Transcript / Voice Notes</span>
            <button type="button" class="btn btn-sm btn-ghost" id="record-note-btn" onclick="startRecordingNote()" style="color:var(--accent); display:flex; gap:6px; align-items:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg>
              Record Note
            </button>
          </label>
          <textarea name="transcript" id="transcript-textarea" rows="5" placeholder="Full meeting transcript or voice notes...">${isEdit ? (meeting.transcript||'') : ''}</textarea>
        </div>
        <div class="field full">
          <label>Recording File</label>
          <div class="file-upload-area" onclick="this.querySelector('input').click()">
            <input type="file" name="recording" accept="audio/*,video/*,.mp3,.wav,.ogg,.flac,.aac,.wma,.m4a,.mp4,.webm,.mov,.avi,.mkv,.wmv,.3gp" style="display:none" onchange="showFileName(this)" />
            <div class="file-upload-label">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:8px;opacity:0.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              <div><span>Click to upload</span> or drag & drop</div>
              <div style="font-size:0.75rem;margin-top:4px;color:var(--text-muted)">MP3, MP4, WAV up to 100MB</div>
            </div>
            <div class="file-name" id="file-name-display">${isEdit && meeting.recording ? `📎 ${meeting.recording.originalName}` : ''}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer" style="margin:0 -26px -26px;padding:18px 26px">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'Update Meeting' : 'Create Meeting'}</button>
      </div>
    </form>`;

  openModal(isEdit ? 'Edit Meeting' : 'Add Meeting', html);
}

function showFileName(input) {
  const display = document.getElementById('file-name-display');
  if (display && input.files[0]) display.textContent = `📎 ${input.files[0].name}`;
}

let noteRecognition = null;
function startRecordingNote() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    toast('Voice recognition is not supported in this browser.', 'error');
    return;
  }

  const btn = document.getElementById('record-note-btn');
  const textarea = document.getElementById('transcript-textarea');

  if (noteRecognition) {
    // If already recording, stop it
    noteRecognition.stop();
    return;
  }

  noteRecognition = new SpeechRecognition();
  noteRecognition.continuous = true;
  noteRecognition.interimResults = true;
  noteRecognition.lang = 'en-US';

  btn.style.color = 'var(--red)';
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg> Stop Recording`;
  btn.classList.add('pulse-record');

  toast('Recording started. Speak your notes...', 'success');

  let finalTranscript = textarea.value ? textarea.value + '\\n' : '';

  noteRecognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    textarea.value = finalTranscript + interimTranscript;
  };

  noteRecognition.onend = () => {
    btn.style.color = 'var(--accent)';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line><line x1="8" y1="22" x2="16" y2="22"></line></svg> Record Note`;
    btn.classList.remove('pulse-record');
    noteRecognition = null;
    toast('Recording saved to transcript.', 'success');
  };

  noteRecognition.onerror = (event) => {
    toast(`Recording error: ${event.error}`, 'error');
    noteRecognition.stop();
  };

  noteRecognition.start();
}

async function saveMeeting(e, meetingId) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);

  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true; btn.textContent = 'Saving...';

  const res = meetingId
    ? await api.meetings.update(meetingId, fd)
    : await api.meetings.create(fd);

  btn.disabled = false; btn.textContent = meetingId ? 'Update Meeting' : 'Create Meeting';

  if (res.ok) {
    closeModal();
    toast(meetingId ? 'Meeting updated!' : 'Meeting created!', 'success');
    await loadMeetings();
  } else {
    toast(res.data.message || 'Failed to save meeting', 'error');
  }
}

async function viewMeeting(id) {
  const meeting = meetingsData.find(m => m._id === id);
  if (!meeting) return;

  // Format time range
  let timeRangeStr = '\u2014';
  if (meeting.startTime) {
    const st = new Date(meeting.startTime);
    const stStr = st.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (meeting.endTime) {
      const et = new Date(meeting.endTime);
      const etStr = et.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      timeRangeStr = `${stStr} \u2014 ${etStr}`;
    } else {
      timeRangeStr = stStr;
    }
  }

  const html = `
    <div style="display:flex;flex-direction:column;gap:20px">
      <div class="stat-card" style="padding:16px">
        ${meeting.title && meeting.title !== meeting.header ? `<div style="font-size:1.2rem;font-weight:800;color:var(--accent);margin-bottom:4px">${meeting.title}</div>` : ''}
        <div style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-bottom:8px">${meeting.header}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${statusBadge(meeting.status)} ${expiryBadge(meeting.expiryDate)}
          ${meeting.source ? `<span class="badge badge-purple" style="font-size:0.7rem">${meeting.source.replace(/_/g, ' ')}</span>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field"><label>Client</label><div style="color:var(--text-primary)">${meeting.clientName || '\u2014'}</div></div>
        <div class="field"><label>Scheduled</label><div style="color:var(--text-primary)">${formatDate(meeting.scheduledDate)}</div></div>
        <div class="field"><label>Time</label><div style="color:var(--text-primary)">${timeRangeStr}</div></div>
        <div class="field"><label>Expiry Date</label><div style="color:var(--text-primary)">${formatDate(meeting.expiryDate)}</div></div>
        <div class="field"><label>Organizer</label><div style="color:var(--text-primary)">${meeting.organizerName || '\u2014'}</div></div>
        <div class="field"><label>Owner Email</label><div style="color:var(--text-primary)">${meeting.ownerEmail || '\u2014'}</div></div>
        <div class="field"><label>Location</label><div style="color:var(--text-primary)">${meeting.location || '\u2014'}</div></div>
        <div class="field"><label>Reminder Sent</label><div>${meeting.reminderSent ? `<span class="badge badge-green">Yes · ${formatDate(meeting.reminderSentAt)}</span>` : '<span class="badge badge-gray">No</span>'}</div></div>
        <div class="field"><label>Recording</label><div>
          ${meeting.recording ? `<a href="/uploads/recordings/${meeting.recording.filename}" target="_blank" class="btn btn-secondary btn-sm" style="margin-bottom:5px;display:inline-block">🎙 Open File</a><br>` : ''}
          ${meeting.recordingUrl ? `<a href="${meeting.recordingUrl}" target="_blank" class="btn btn-secondary btn-sm" style="color:var(--accent)">🔗 View on Browser</a>` : (meeting.recording ? '' : '\u2014')}
        </div></div>
        ${meeting.joinUrl ? `<div class="field"><label>Join URL</label><div><a href="${meeting.joinUrl}" target="_blank" style="color:var(--accent);font-size:0.85rem;word-break:break-all">🔗 Join Meeting</a></div></div>` : ''}
      </div>
      ${meeting.summary ? `
        <div class="field full">
          <label>Meeting Summary / Decisions</label>
          <div style="color:var(--text-secondary); line-height:1.7; white-space:pre-wrap; background:var(--bg-input); padding:16px; border-radius:12px; border:1px solid var(--border); font-size:0.9rem">
            ${meeting.summary}
          </div>
        </div>` : ''}
      <div style="display:flex;justify-content:flex-end;gap:10px;padding-top:16px;border-top:1px solid var(--border)">
        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        <button class="btn btn-primary" onclick="closeModal();editMeeting('${meeting._id}')">Edit Details</button>
      </div>
    </div>`;

  openModal('Meeting Details', html);
}

async function editMeeting(id) {
  const res = await api.meetings.get(id);
  if (!res.ok) { toast('Failed to load meeting', 'error'); return; }
  openMeetingForm(res.data.data);
}

function deleteMeetingConfirm(id, name) {
  confirmDelete(name, async () => {
    const res = await api.meetings.delete(id);
    if (res.ok) { toast('Meeting deleted', 'success'); await loadMeetings(); }
    else toast(res.data.message || 'Delete failed', 'error');
  });
}

// ─── Filtering ────────────────────────────────────────────────────────────
let meetingFilters = {};

function openMeetingColumnFilter(btn, column) {
  let items = [];
  let type = 'text';

  if (column === 'scheduledDate' || column === 'expiryDate') {
    type = 'date';
    items = meetingsData.map(m => ({ value: m[column] }));
  } else {
    const values = [...new Set(meetingsData.map(m => m[column]).filter(v => v !== null && v !== undefined))].sort();
    items = values.map(v => ({ label: String(v), value: v }));
  }

  toggleExcelFilter(btn, {
    module: 'Meetings',
    column: column,
    items: items,
    type: type
  });
}

window.applyMeetingsFilter = function(column, selectedValues) {
  meetingFilters[column] = selectedValues;
  const filteredData = meetingsData.filter(m => {
    return Object.keys(meetingFilters).every(col => {
      const selected = meetingFilters[col];
      if (!selected || selected.length === 0) return true;
      
      if (col === 'scheduledDate' || col === 'expiryDate') {
        const date = new Date(m[col]);
        const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
        return selected.includes(monthYear);
      }
      return selected.some(s => String(s) === String(m[col]));
    });
  });
  renderMeetingsTable(filteredData);
};

function renderPagination(elId, pagination, onPageChange) {
  const el = document.getElementById(elId);
  if (!el || !pagination) return;

  const { page, pages } = pagination;
  if (pages <= 1) { el.innerHTML = ''; return; }

  window._paginationCallbacks = window._paginationCallbacks || {};
  window._paginationCallbacks[elId] = onPageChange;

  let html = `<button class="page-btn" onclick="window._paginationCallbacks['${elId}'](${page-1})" ${page===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) {
      html += `<button class="page-btn ${i===page?'active':''}" onclick="window._paginationCallbacks['${elId}'](${i})">${i}</button>`;
    } else if (Math.abs(i - page) === 2) {
      html += `<span style="color:var(--text-muted);padding:0 4px">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="window._paginationCallbacks['${elId}'](${page+1})" ${page===pages?'disabled':''}>›</button>`;
  el.innerHTML = html;
}

async function syncTeamsMeetings() {
  console.log('[SYNC BUTTON CLICKED]');
  toast('Syncing meetings from daily schedule...', 'info');
  console.log('[SYNC REQUEST SENT]');
  const res = await api.meetings.sync();
  console.log('[SYNC RESPONSE RECEIVED]', res);
  
  if (res.ok) {
    toast(`Sync complete! Added: ${res.data.added}, Updated: ${res.data.updated}, Skipped: ${res.data.skipped || 0}`, 'success');
    console.log('[UI REFRESHED]');
    await loadMeetings();
  } else {
    const msg = res.data?.message || '';
    if (msg.includes('NOT_AUTHENTICATED')) {
      toast('Please connect Microsoft Teams first', 'warning');
      window.open('/teams-auth/login', '_blank');
    } else {
      toast(msg || 'Sync failed', 'error');
    }
  }
}

async function importTeamsRecordings() {
  toast('Importing recordings from last 60 days...', 'info');
  const res = await api.meetings.importRecordings();
  if (res.ok) {
    toast(`Import complete! Imported: ${res.data.imported}, Skipped: ${res.data.skipped}`, 'success');
    await loadMeetings();
  } else {
    const msg = res.data?.message || '';
    if (msg.includes('NOT_AUTHENTICATED')) {
      toast('Please connect Microsoft Teams first', 'warning');
      window.open('/teams-auth/login', '_blank');
    } else {
      toast(msg || 'Import failed', 'error');
    }
  }
}

async function enrichManualMeetings() {
  toast('Updating manual meeting data...', 'info');
  const res = await api.meetings.enrichManual();
  if (res.ok) {
    toast(`Done! Updated: ${res.data.updated}, Already OK: ${res.data.skipped}`, 'success');
    await loadMeetings();
  } else {
    toast(res.data?.message || 'Update failed', 'error');
  }
}

function searchMeetings(q) {
  SearchManager.search('Meetings', q, loadMeetings);
}

function filterMeetings(status) {
  loadMeetings({ status });
}
