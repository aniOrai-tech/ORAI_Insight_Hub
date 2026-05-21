window.AddTaskModal = {
  open: async (id = null) => {
    const currentUser = window.currentUser || {};
    const isAdmin = currentUser.role === 'admin' || currentUser.username === 'admin';
    
    // Refresh metadata in background to ensure sync with Admin Panel
    if (isAdmin) {
      useDailyTasks.fetchMetadata();
    }

    const state = useDailyTasks.getState();
    let task = id && id !== 'null' ? state.tasks.find(t => t._id === id) : null;
    const defaultDate = task?.date ? new Date(task.date).toISOString().split('T')[0] : (state.filters.date || new Date().toISOString().split('T')[0]);
    
    // Enforce selection of a member first on the dashboard (unless editing an existing task)
    if (isAdmin && (!id || id === 'null') && !state.filters.memberId) {
      if (window.toast) {
        toast('Please select a member/resource from the dropdown before adding a daily task.', 'warning');
      } else {
        alert('Please select a member/resource from the dropdown before adding a daily task.');
      }
      return;
    }

    // Resolve pre-populated member based on selection
    let prepopulatedMember = null;
    if (isAdmin) {
      const activeMemberId = state.filters.memberId;
      prepopulatedMember = state.members.find(m => m._id === activeMemberId);
    } else {
      prepopulatedMember = {
        _id: currentUser._id,
        fullName: currentUser.fullName || currentUser.username
      };
    }

    if (!task && prepopulatedMember) {
      task = {
        memberId: prepopulatedMember._id,
        memberName: prepopulatedMember.fullName
      };
    }

    const renderModal = (currentState) => {
      const showAddAnother = !(id && id !== 'null');

      const html = `
        <div class="task-modal-container" style="padding: 5px; font-family: inherit;">
          <form id="daily-task-form" onsubmit="AddTaskModal.save(event, '${id}')">
            
            <!-- Compact Layout Grid -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              
              <!-- Row 1: Date & Time Settings -->
              <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 14px;">
                <!-- Date -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Log Date
                  </label>
                  <input type="date" name="date" required class="form-control" value="${defaultDate}" 
                    style="background: var(--bg-body); border-color: var(--border); border-radius: 8px; height: 38px; font-size: 0.88rem; font-weight: 500; padding: 0 10px;">
                </div>

                <!-- Login Time -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Login Time
                  </label>
                  <div style="display: flex; gap: 6px;">
                    <select id="task-login-hour" onchange="AddTaskModal.syncTimesFromDropdowns()" class="form-control" style="flex: 1; height: 38px; border-radius: 8px; background: var(--bg-body); border-color: var(--border); font-size: 0.88rem; font-weight: 500; padding: 0 6px;">
                      ${(() => {
                        const defaultLogin = task?.loginTime ? window.convertTo24Hour(task.loginTime) : '10:00';
                        const defH = parseInt(defaultLogin.split(':')[0]) || 0;
                        let opts = '';
                        for (let h = 0; h < 24; h++) {
                          opts += `<option value="${h}" ${h === defH ? 'selected' : ''}>${String(h).padStart(2, '0')}</option>`;
                        }
                        return opts;
                      })()}
                    </select>
                    <select id="task-login-minute" onchange="AddTaskModal.syncTimesFromDropdowns()" class="form-control" style="flex: 1; height: 38px; border-radius: 8px; background: var(--bg-body); border-color: var(--border); font-size: 0.88rem; font-weight: 500; padding: 0 6px;">
                      ${(() => {
                        const defaultLogin = task?.loginTime ? window.convertTo24Hour(task.loginTime) : '10:00';
                        const defM = parseInt(defaultLogin.split(':')[1]) || 0;
                        let opts = '';
                        for (let m = 0; m < 60; m++) {
                          opts += `<option value="${m}" ${m === defM ? 'selected' : ''}>${String(m).padStart(2, '0')}</option>`;
                        }
                        return opts;
                      })()}
                    </select>
                  </div>
                  <input type="hidden" name="loginTime" id="task-login-time" value="${task?.loginTime ? window.convertTo24Hour(task.loginTime) : '10:00'}">
                </div>

                <!-- Logout Time -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Logout Time
                  </label>
                  <div style="display: flex; gap: 6px;">
                    <select id="task-logout-hour" onchange="AddTaskModal.syncTimesFromDropdowns()" class="form-control" style="flex: 1; height: 38px; border-radius: 8px; background: var(--bg-body); border-color: var(--border); font-size: 0.88rem; font-weight: 500; padding: 0 6px;">
                      ${(() => {
                        const defaultLogout = task?.logoutTime ? window.convertTo24Hour(task.logoutTime) : '19:00';
                        const defH = parseInt(defaultLogout.split(':')[0]) || 0;
                        let opts = '';
                        for (let h = 0; h < 24; h++) {
                          opts += `<option value="${h}" ${h === defH ? 'selected' : ''}>${String(h).padStart(2, '0')}</option>`;
                        }
                        return opts;
                      })()}
                    </select>
                    <select id="task-logout-minute" onchange="AddTaskModal.syncTimesFromDropdowns()" class="form-control" style="flex: 1; height: 38px; border-radius: 8px; background: var(--bg-body); border-color: var(--border); font-size: 0.88rem; font-weight: 500; padding: 0 6px;">
                      ${(() => {
                        const defaultLogout = task?.logoutTime ? window.convertTo24Hour(task.logoutTime) : '19:00';
                        const defM = parseInt(defaultLogout.split(':')[1]) || 0;
                        let opts = '';
                        for (let m = 0; m < 60; m++) {
                          opts += `<option value="${m}" ${m === defM ? 'selected' : ''}>${String(m).padStart(2, '0')}</option>`;
                        }
                        return opts;
                      })()}
                    </select>
                  </div>
                  <input type="hidden" name="logoutTime" id="task-logout-time" value="${task?.logoutTime ? window.convertTo24Hour(task.logoutTime) : '19:00'}">
                </div>
              </div>

              <!-- Row 2: Context / Client Selection -->
              <div style="display: grid; grid-template-columns: ${isAdmin ? '1.2fr 1.2fr' : '1.5fr'}; gap: 14px;">
                <!-- Resource Context (Admin Mode) -->
                ${isAdmin ? `
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Resource context
                    </label>
                    <div class="input-wrapper" style="position:relative">
                      <input type="text" list="members-list" name="memberName" required class="form-control" 
                        placeholder="Assign member..." value="${task?.memberName || ''}" readonly
                        style="background: var(--bg-dim); border-color: var(--border); border-radius: 8px; height: 38px; font-size: 0.88rem; padding: 0 10px; cursor: not-allowed;">
                      <datalist id="members-list">
                        ${(() => {
                          const list = Array.isArray(currentState.members) ? currentState.members : [];
                          return list.length > 0 
                            ? list.map(m => `<option data-id="${m._id}" value="${m.fullName}">`).join('')
                            : '<option value="No active members found">';
                        })()}
                      </datalist>
                      <input type="hidden" name="memberId" id="selected-member-id" value="${task?.memberId?._id || task?.memberId || ''}">
                    </div>
                  </div>
                ` : `
                  <input type="hidden" name="memberId" value="${currentUser._id}">
                  <input type="hidden" name="memberName" value="${currentUser.fullName || currentUser.username}">
                `}

                <!-- Client / Project -->
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Client / Project</label>
                  <input type="text" list="clients-list" name="clientName" required class="form-control" 
                    placeholder="Search client project..." value="${task?.clientName || ''}"
                    oninput="AddTaskModal.syncClientId(this)" style="border-radius: 8px; height: 38px; font-size: 0.88rem; padding: 0 10px; background: var(--bg-body); border-color: var(--border);">
                  <datalist id="clients-list">
                    ${(() => {
                      const list = Array.isArray(currentState.clients) ? currentState.clients : [];
                      return list.length > 0
                        ? list.sort((a,b) => (a.companyName || '').localeCompare(b.companyName || '')).map(c => `<option data-id="${c._id}" value="${c.companyName}">`).join('')
                        : '<option value="No clients found in Management">';
                    })()}
                  </datalist>
                  <input type="hidden" name="clientId" id="selected-client-id" value="${task?.clientId?._id || task?.clientId || ''}">
                </div>
              </div>

              <!-- Section: Task Activities (Repeating Block Container) -->
              <div style="margin-top: 6px;">
                <h3 style="font-size: 0.78rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.5px; margin-bottom: 10px; border-bottom: 1.5px solid var(--border); padding-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Task Entries & Subjects
                </h3>
                
                <div id="tasks-entries-container"></div>

                ${showAddAnother ? `
                  <div style="display: flex; justify-content: flex-start; margin-top: 8px;">
                    <button type="button" class="btn btn-ghost" id="add-another-task-entry-btn" onclick="AddTaskModal.addEntry()" style="border-radius: 8px; font-weight: 700; font-size: 0.82rem; color: var(--accent); padding: 8px 14px; display: flex; align-items: center; gap: 6px; border: 1.5px dashed var(--accent-light); background: transparent;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Add Another Task
                    </button>
                  </div>
                ` : ''}
              </div>

            </div>

            <!-- Footer Buttons -->
            <div class="modal-footer" style="margin-top: 20px; padding: 12px 0 0 0; display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid var(--border);">
              <button type="button" class="btn btn-ghost" onclick="closeModal()" style="border-radius: 8px; height: 36px; padding: 0 16px; font-weight: 600; font-size: 0.85rem;">Discard</button>
              <button type="submit" class="btn btn-primary" id="save-task-btn" style="border-radius: 8px; height: 36px; padding: 0 20px; font-weight: 700; font-size: 0.85rem; box-shadow: 0 4px 10px -2px rgba(126, 34, 206, 0.2);">
                <span class="btn-text">${id && id !== 'null' ? 'Update Entry' : 'Log Productivity'}</span>
              </button>
            </div>
          </form>
        </div>
      `;
      openModal(id && id !== 'null' ? 'Edit Activity Log' : 'Productivity Intelligence', html);
    };

    // Initial render
    renderModal(state);
    
    // Add the first task entry block (pre-populated if editing)
    AddTaskModal.addEntry(task);

    // Subscribe to metadata updates while modal is open
    const unsubscribe = useDailyTasks.subscribe((newState) => {
      const memberDatalist = document.getElementById('members-list');
      const clientDatalist = document.getElementById('clients-list');
      if (memberDatalist) {
        const list = Array.isArray(newState.members) ? newState.members : [];
        memberDatalist.innerHTML = list.length > 0
          ? list.map(m => `<option data-id="${m._id}" value="${m.fullName}">`).join('')
          : '<option value="No active members found">';
      }
      if (clientDatalist) {
        const list = Array.isArray(newState.clients) ? newState.clients : [];
        clientDatalist.innerHTML = list.length > 0
          ? list.sort((a,b) => (a.companyName || '').localeCompare(b.companyName || '')).map(c => `<option data-id="${c._id}" value="${c.companyName}">`).join('')
          : '<option value="No clients found in Management">';
      }
    });

    // Cleanup subscription on modal close
    window.addEventListener('modalClosed', () => unsubscribe(), { once: true });
  },

  addEntry: (taskData = null) => {
    const container = document.getElementById('tasks-entries-container');
    if (!container) return;

    let initialMinutes = 540;
    if (taskData?.taskTimeSpentMinutes) {
      initialMinutes = Number(taskData.taskTimeSpentMinutes);
    } else {
      const loginVal = document.getElementById('task-login-time')?.value;
      const logoutVal = document.getElementById('task-logout-time')?.value;
      if (loginVal && logoutVal && window.calculateDurationMin) {
        initialMinutes = window.calculateDurationMin(loginVal, logoutVal);
      }
    }

    const initHours = Math.min(Math.floor(initialMinutes / 60), 12);
    const initMins = initialMinutes % 60;

    let hoursOptions = '';
    for (let h = 0; h <= 12; h++) {
      hoursOptions += `<option value="${h}" ${h === initHours ? 'selected' : ''}>${h} hr</option>`;
    }

    let minutesOptions = '';
    for (let m = 0; m < 60; m++) {
      const mStr = String(m).padStart(2, '0');
      minutesOptions += `<option value="${m}" ${m === initMins ? 'selected' : ''}>${mStr} min</option>`;
    }

    const entryId = 'entry-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const div = document.createElement('div');
    div.className = 'task-entry-item';
    div.id = entryId;
    div.style.cssText = 'border: 1px dashed var(--border); padding: 14px; border-radius: 8px; background: var(--bg-body); position: relative; margin-bottom: 12px;';

    div.innerHTML = `
      <!-- Remove button -->
      <button type="button" class="remove-task-entry-btn" onclick="AddTaskModal.removeEntry('${entryId}')" style="position: absolute; right: 8px; top: 8px; background: none; border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>

      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; margin-bottom: 10px;">
        <!-- Activity Category -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Activity Category</label>
          <select name="taskType" class="form-control" style="border-radius: 8px; height: 38px; font-size: 0.88rem; padding: 0 10px; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 10px center; background-size: 14px;">
            <option value="development" ${taskData?.taskType === 'development' ? 'selected' : ''}>Development</option>
            <option value="support" ${taskData?.taskType === 'support' ? 'selected' : ''}>Support</option>
            <option value="meeting" ${taskData?.taskType === 'meeting' ? 'selected' : ''}>Meeting</option>
            <option value="research" ${taskData?.taskType === 'research' ? 'selected' : ''}>Research</option>
            <option value="testing" ${taskData?.taskType === 'testing' ? 'selected' : ''}>Testing</option>
            <option value="documentation" ${taskData?.taskType === 'documentation' ? 'selected' : ''}>Documentation</option>
            <option value="other" ${taskData?.taskType === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>

        <!-- Status -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Status</label>
          <select name="status" class="form-control" style="border-radius: 8px; height: 38px; font-size: 0.88rem; padding: 0 10px;">
            ${Object.entries(DailyTaskConstants.STATUS_LABELS).map(([val, lbl]) => `
              <option value="${val}" ${taskData?.status === val ? 'selected' : (val === 'completed' ? 'selected' : '')}>${lbl}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Row 2: Description & Duration -->
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; margin-bottom: 10px;">
        <!-- Description -->
        <div class="form-group" style="margin-bottom: 0;">
          <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Work Description (Subject)</label>
          <textarea name="taskActivity" required class="form-control" placeholder="Describe your contribution..." 
            style="min-height: 80px; border-radius: 8px; padding: 8px 10px; font-size: 0.88rem; line-height: 1.4; resize: none; border-color: var(--border);">${taskData?.taskActivity || ''}</textarea>
        </div>

        <!-- Time Spent — Premium Widget -->
        <div class="dt-time-widget">
          <div class="dt-time-widget-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>Time Spent</span>
          </div>
          <div class="dt-time-widget-display">
            <span class="manual-hours-display">
              ${taskData?.taskTimeSpentMinutes ? window.formatMinutesToHours(taskData.taskTimeSpentMinutes) : window.formatMinutesToHours(initialMinutes)}
            </span>
          </div>
          <div class="dt-time-widget-selects">
            <div class="dt-time-select-group">
              <select class="dt-time-select entry-hours" onchange="AddTaskModal.updateEntryMinutes(this)">
                ${hoursOptions}
              </select>
              <div class="dt-time-select-arrow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <span class="dt-time-colon">:</span>
            <div class="dt-time-select-group">
              <select class="dt-time-select entry-minutes" onchange="AddTaskModal.updateEntryMinutes(this)">
                ${minutesOptions}
              </select>
              <div class="dt-time-select-arrow">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <input type="hidden" name="taskTimeSpentMinutes" class="entry-manual-minutes" value="${initialMinutes}">
          </div>
        </div>
      </div>

      <!-- Row 3: Comments -->
      <div class="form-group" style="margin-bottom: 0;">
        <label class="form-label" style="font-weight: 700; font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 6px;">Comments / Notes</label>
        <textarea name="comments" class="form-control" placeholder="Any blockers, comments or technical notes..." 
          style="min-height: 38px; border-radius: 8px; font-size: 0.88rem; resize: none; border-color: var(--border); padding: 8px 12px; line-height: 1.3;">${taskData?.comments || ''}</textarea>
      </div>
    `;

    container.appendChild(div);
    AddTaskModal.updateRemoveButtonsVisibility();
  },

  removeEntry: (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.remove();
    }
    AddTaskModal.updateRemoveButtonsVisibility();
  },

  updateRemoveButtonsVisibility: () => {
    const container = document.getElementById('tasks-entries-container');
    if (!container) return;
    const items = container.querySelectorAll('.task-entry-item');
    items.forEach(item => {
      const btn = item.querySelector('.remove-task-entry-btn');
      if (btn) {
        btn.style.display = items.length > 1 ? 'flex' : 'none';
      }
    });
  },

  updateEntryMinutes: (selectEl) => {
    const entry = selectEl.closest('.task-entry-item');
    if (!entry) return;
    const h = parseInt(entry.querySelector('.entry-hours')?.value) || 0;
    const m = parseInt(entry.querySelector('.entry-minutes')?.value) || 0;
    const totalMin = (h * 60) + m;
    const manualInput = entry.querySelector('.entry-manual-minutes');
    if (manualInput) {
      manualInput.value = totalMin;
    }
    const displayHrs = entry.querySelector('.manual-hours-display');
    if (displayHrs && window.formatMinutesToHours) {
      displayHrs.textContent = window.formatMinutesToHours(totalMin);
    }
  },

  syncTimesFromDropdowns: () => {
    const loginH = String(document.getElementById('task-login-hour')?.value || '10').padStart(2, '0');
    const loginM = String(document.getElementById('task-login-minute')?.value || '00').padStart(2, '0');
    const logoutH = String(document.getElementById('task-logout-hour')?.value || '19').padStart(2, '0');
    const logoutM = String(document.getElementById('task-logout-minute')?.value || '00').padStart(2, '0');

    const loginInput = document.getElementById('task-login-time');
    const logoutInput = document.getElementById('task-logout-time');

    if (loginInput) loginInput.value = `${loginH}:${loginM}`;
    if (logoutInput) logoutInput.value = `${logoutH}:${logoutM}`;

    AddTaskModal.calculateFromTimes();
  },

  calculateFromTimes: () => {
    const loginVal = document.getElementById('task-login-time')?.value;
    const logoutVal = document.getElementById('task-logout-time')?.value;
    if (loginVal && logoutVal && window.calculateDurationMin) {
      const duration = window.calculateDurationMin(loginVal, logoutVal);
      const firstEntryMinutes = document.querySelector('.entry-manual-minutes');
      if (firstEntryMinutes) {
        firstEntryMinutes.value = duration;
        const entry = firstEntryMinutes.closest('.task-entry-item');
        if (entry) {
          const h = Math.floor(duration / 60);
          const m = duration % 60;
          const hSelect = entry.querySelector('.entry-hours');
          const mSelect = entry.querySelector('.entry-minutes');
          if (hSelect) hSelect.value = Math.min(h, 12);
          if (mSelect) mSelect.value = m;
          const displayHrs = entry.querySelector('.manual-hours-display');
          if (displayHrs && window.formatMinutesToHours) {
            displayHrs.textContent = window.formatMinutesToHours(duration);
          }
        }
      }
    }
  },

  syncMemberId: (input) => {
    if (!input) return;
    const list = document.getElementById('members-list');
    const hidden = document.getElementById('selected-member-id');
    const option = Array.from(list?.options || []).find(o => o.value === input.value);
    if (hidden) {
      hidden.value = option ? option.getAttribute('data-id') : '';
    }
  },

  syncClientId: (input) => {
    if (!input) return;
    const list = document.getElementById('clients-list');
    const hidden = document.getElementById('selected-client-id');
    const option = Array.from(list?.options || []).find(o => o.value === input.value);
    if (hidden) {
      hidden.value = option ? option.getAttribute('data-id') : '';
    }
  },

  collectTasks: (form) => {
    const date = form.querySelector('[name="date"]').value;
    const loginTime = form.querySelector('[name="loginTime"]').value;
    const logoutTime = form.querySelector('[name="logoutTime"]').value;
    const memberId = form.querySelector('[name="memberId"]').value;
    const memberName = form.querySelector('[name="memberName"]').value;
    const clientId = form.querySelector('[name="clientId"]').value;
    const clientName = form.querySelector('[name="clientName"]').value;

    const taskItems = form.querySelectorAll('.task-entry-item');
    const tasks = [];

    taskItems.forEach(item => {
      const taskType = item.querySelector('[name="taskType"]').value;
      const status = item.querySelector('[name="status"]').value;
      const taskActivity = item.querySelector('[name="taskActivity"]').value;
      const comments = item.querySelector('[name="comments"]').value;
      const taskTimeSpentMinutes = Number(item.querySelector('.entry-manual-minutes').value);

      tasks.push({
        date,
        loginTime,
        logoutTime,
        memberId,
        memberName,
        clientId,
        clientName,
        taskType,
        status,
        taskActivity,
        comments,
        taskTimeSpentMinutes
      });
    });

    return tasks;
  },

  save: async (e, id) => {
    e.preventDefault();
    const form = e.target;
    
    AddTaskModal.syncMemberId(form.memberName);
    AddTaskModal.syncClientId(form.clientName);

    const commonClientId = form.querySelector('[name="clientId"]').value;
    const commonMemberId = form.querySelector('[name="memberId"]').value;

    if (!commonClientId) {
      if (window.toast) toast('Please select a valid Client', 'error');
      return;
    }
    if (!commonMemberId) {
      if (window.toast) toast('Please select a valid Member', 'error');
      return;
    }

    const tasks = AddTaskModal.collectTasks(form);
    
    // Validate each entry
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      if (!t.taskActivity || t.taskActivity.trim() === '') {
        if (window.toast) toast(`Task #${i + 1} description (Subject) is required`, 'error');
        return;
      }
      if (!t.taskTimeSpentMinutes || t.taskTimeSpentMinutes < 1) {
        if (window.toast) toast(`Task #${i + 1} time spent must be at least 1 minute`, 'error');
        return;
      }
    }

    const isUpdate = id && id !== 'null';
    if (isUpdate) {
      const success = await useDailyTasks.saveTask(id, tasks[0]);
    } else {
      let savedCount = 0;
      for (const t of tasks) {
        const success = await DailyTaskAPI.create(t);
        if (success.success) savedCount++;
      }
      if (savedCount > 0) {
        if (window.closeModal) closeModal();
        if (window.toast) toast(`${savedCount} task(s) logged successfully`, 'success');
        window.useDailyTasks.fetchData();
      } else {
        if (window.toast) toast('Failed to log daily tasks', 'error');
      }
    }
  }
};
