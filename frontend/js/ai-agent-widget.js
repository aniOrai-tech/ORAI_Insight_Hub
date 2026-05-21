/**
 * ORAI Insight Agent — AI-powered Voice & Chat Assistant
 * Name: "Aura" — the ORAI Insight Agent
 * 
 * Drop this script into any HTML page to enable the AI assistant.
 * Usage: <script src="ai-agent-widget.js"></script>
 */

(function () {
  const AGENT_NAME = "Aura";
  const CLAUDE_API_URL = "/api/chat";
  const CLAUDE_MODEL = "claude-sonnet-4-20250514";

  // ─── PAGE CONTEXT ─────────────────────────────────────────────────────────────
  const PAGE_CONTEXT = {
    default: `You are "${AGENT_NAME}", the AI assistant for the ORAI Insight Hub dashboard.
You are made by ORAI Robotics. You help users navigate the dashboard, understand features, and answer common questions.
Be concise, friendly, and helpful. Use bullet points for lists. Keep answers under 150 words unless the user asks for more detail.
When asked for login details or account IDs, refer to the bots data provided. Always end with "Is there anything else I can help you with?"`,

    dashboard: `The user is on the main Dashboard overview page.
Key sections: Summary cards (Total Meetings, Active Bots, Clients, Upsells), recent activity feed, quick-action stat cards.
Common questions: What do the summary cards mean? How do I refresh data? How do I export a report?`,

    meetings: `The user is on the Meeting Tracker page.
Key features: Meeting list with search/filter, Sync Teams button, Import recordings, View/Edit/Delete meetings, recording links.
Common questions: How do I sync meetings from Teams? How do I view a recording? How do I check meeting expiry?`,

    bots: `The user is on the Bot Details page.
Key features: Bot/WABA configurations list, Add Bot button, Import Excel, View account details (client name, account ID, API key, namespace, number, integration type, smart link, status).
Common questions: How do I add a new bot? What is the account ID for a client? How do I check bot status?`,

    clients: `The user is on the Clients page.
Key features: Client list with SPOC info, company details, contact information, Add Client button.
Common questions: How do I add a new client? How do I find a client's SPOC?`,

    upsell: `The user is on the Upsell Tracker page.
Key features: Track upsell opportunities, status tracking, revenue projections.`,

    requirements: `The user is on the Requirements page.
Key features: Requirement tracking, priority levels, status updates.`,

    whatsapp: `The user is on the WhatsApp Logins page.
Key features: WhatsApp Business Account login details, QR code status.`,

    admin: `The user is on the Admin Panel.
Key features: User management, role assignment, system settings.`,
  };

  // ─── DASHBOARD DATA FOR CONTEXT ───────────────────────────────────────────────
  function getDashboardData() {
    let data = {
      user: {
        name: window.currentUser?.fullName || 'Unknown',
        dept: window.currentUser?.department || 'Unknown'
      },
      bots: (window.botsData || []).map(b => ({
        client: b.clientName,
        accountId: b.accountId,
        number: b.number,
        apiKey: b.apiKey ? b.apiKey.slice(0, 10) + '...' : 'N/A',
        namespace: b.namespace,
        integration: b.remark,
        status: b.isActive ? 'Active' : 'Inactive'
      })).slice(0, 20),
      meetings: (window.meetingsData || []).map(m => ({
        header: m.header,
        owner: m.ownerEmail,
        date: m.scheduledDate,
        expiry: m.expiryDate
      })).slice(0, 10)
    };
    return JSON.stringify(data);
  }

  function getPageContext() {
    const hash = (window.location.hash || '').toLowerCase();
    const title = document.title.toLowerCase();
    const pageTitle = (document.getElementById('page-title')?.textContent || '').toLowerCase();
    const combined = hash + " " + title + " " + pageTitle;

    let context = PAGE_CONTEXT.default;
    for (const key of Object.keys(PAGE_CONTEXT)) {
      if (key !== "default" && combined.includes(key)) {
        context = PAGE_CONTEXT[key];
        break;
      }
    }

    const dataContext = getDashboardData();
    return `${context}\n\nCURRENT DASHBOARD DATA (JSON):\n${dataContext}\n\nImportant: Use this data to answer specific questions about accounts, IDs, login credentials, and meetings accurately. If asked for login details or account ID, refer to the 'accountId' field in the bots data. Always be helpful and proactive.`;
  }

  // ─── STATE ───────────────────────────────────────────────────────────────────
  let isLoading = false;
  const history = [];

  // ─── INJECT STYLES ───────────────────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #aw-root * { box-sizing: border-box; font-family: -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 0; }

    #aw-fab {
      position: fixed; bottom: 28px; right: 28px; z-index: 99999;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, #7e22ce, #4f46e5); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 20px rgba(126,34,206,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      padding: 0; overflow: hidden; color: #fff; font-size: 24px; font-weight: 700;
    }
    #aw-fab:hover { transform: scale(1.1); box-shadow: 0 6px 28px rgba(126,34,206,0.55); }

    #aw-bubble {
      position: fixed; bottom: 100px; right: 28px; z-index: 99997;
      background: #fff; color: #1a1a2e; padding: 12px 18px;
      border-radius: 12px; font-size: 13px; font-weight: 500;
      box-shadow: 0 4px 15px rgba(0,0,0,0.12);
      border: 1px solid #f0f0f0;
      opacity: 0; transform: translateY(10px);
      transition: all 0.35s ease;
      pointer-events: none;
      white-space: nowrap;
    }
    #aw-bubble:after {
      content: ''; position: absolute; bottom: -8px; right: 24px;
      border-left: 8px solid transparent; border-right: 8px solid transparent;
      border-top: 8px solid #fff;
    }
    #aw-bubble.show { opacity: 1; transform: translateY(0); }

    #aw-panel {
      position: fixed; bottom: 96px; right: 28px; z-index: 99998;
      width: 380px; max-height: 580px;
      background: #fff; border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.18);
      display: flex; flex-direction: column;
      overflow: hidden;
      transform: scale(0.92) translateY(16px);
      opacity: 0; pointer-events: none;
      transition: transform 0.22s ease, opacity 0.22s ease;
    }
    #aw-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    #aw-header {
      background: linear-gradient(135deg, #1a1a2e, #2d1b69); color: #fff;
      padding: 14px 16px 12px; display: flex; align-items: center; gap: 10px;
      flex-shrink: 0;
    }
    #aw-header .aw-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #7e22ce, #4f46e5);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 700; color: #fff; flex-shrink: 0;
    }
    #aw-header .aw-title { flex: 1; }
    #aw-header .aw-title strong { display: block; font-size: 14px; font-weight: 600; }
    #aw-header .aw-title span { font-size: 11px; opacity: 0.7; }
    #aw-close {
      background: none; border: none; color: #fff; cursor: pointer;
      opacity: 0.6; padding: 4px; border-radius: 6px; transition: opacity 0.15s;
      display: flex; align-items: center;
    }
    #aw-close:hover { opacity: 1; }

    #aw-suggestions {
      padding: 10px 12px; display: flex; flex-wrap: wrap; gap: 6px;
      border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
    }
    .aw-chip {
      font-size: 11.5px; padding: 5px 10px; border-radius: 20px;
      border: 1px solid #e0e0e0; background: #fafafa; color: #444;
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
    }
    .aw-chip:hover { background: #f0effe; border-color: #c4b8fc; color: #4f46e5; }

    #aw-messages {
      flex: 1; overflow-y: auto; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 10px;
      scroll-behavior: smooth;
    }
    .aw-msg { display: flex; gap: 8px; align-items: flex-start; }
    .aw-msg.user { flex-direction: row-reverse; }
    .aw-bubble-inner {
      max-width: 82%; font-size: 13px; line-height: 1.55;
      padding: 9px 12px; border-radius: 12px;
    }
    .aw-msg.bot .aw-bubble-inner { background: #f4f4f8; color: #1a1a2e; border-radius: 4px 12px 12px 12px; }
    .aw-msg.user .aw-bubble-inner { background: #4f46e5; color: #fff; border-radius: 12px 4px 12px 12px; }
    .aw-msg.bot .aw-avatar-sm {
      width: 26px; height: 26px; border-radius: 50%;
      background: linear-gradient(135deg, #7e22ce, #4f46e5);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 9px; color: #fff; font-weight: 700; margin-top: 2px;
    }
    .aw-bubble-inner ul { margin: 6px 0 0 16px; }
    .aw-bubble-inner li { margin-bottom: 3px; }
    .aw-typing { display: flex; gap: 4px; align-items: center; padding: 10px 12px; }
    .aw-dot { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: aw-bounce 1.2s infinite; }
    .aw-dot:nth-child(2) { animation-delay: 0.2s; }
    .aw-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aw-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }

    #aw-footer {
      padding: 10px 12px; border-top: 1px solid #f0f0f0;
      display: flex; gap: 8px; align-items: flex-end; flex-shrink: 0;
    }
    #aw-input {
      flex: 1; font-size: 13px; padding: 9px 12px;
      border: 1px solid #e0e0e0; border-radius: 10px;
      resize: none; outline: none; min-height: 38px; max-height: 100px;
      line-height: 1.4; color: #1a1a2e;
      transition: border-color 0.15s;
    }
    #aw-input:focus { border-color: #4f46e5; }
    #aw-mic-btn {
      width: 34px; height: 34px; border-radius: 50%;
      background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: all 0.2s;
    }
    #aw-mic-btn:hover { background: #dcfce7; border-color: #86efac; }
    #aw-mic-btn.recording { 
      background: #fee2e2; color: #dc2626; border-color: #fecaca;
      box-shadow: 0 0 0 4px rgba(239,68,68,0.15);
    }
    #aw-mic-btn.recording svg { animation: aw-pulse-red 1.2s infinite; }
    @keyframes aw-pulse-red { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } }
    #aw-send {
      width: 36px; height: 36px; border-radius: 50%;
      background: #4f46e5; color: #fff; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: background 0.15s, transform 0.15s;
    }
    #aw-send:hover { background: #4338ca; }
    #aw-send:active { transform: scale(0.93); }
    #aw-send:disabled { background: #ccc; cursor: default; }
    #aw-send svg { width: 16px; height: 16px; }

    @media (max-width: 420px) {
      #aw-panel { right: 12px; left: 12px; width: auto; bottom: 88px; }
      #aw-fab { bottom: 20px; right: 16px; }
    }
  `;
  document.head.appendChild(style);

  // ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────
  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatText(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code style='background:#eee;padding:1px 4px;border-radius:3px;font-size:12px'>$1</code>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
      .replace(/\n{2,}/g, "</p><p>")
      .replace(/\n/g, "<br>");
  }

  function addBubble(role, text) {
    const msgArea = document.getElementById("aw-messages");
    if (!msgArea) return;
    const wrapper = document.createElement("div");
    wrapper.className = `aw-msg ${role}`;
    if (role === "bot") {
      wrapper.innerHTML = `<div class="aw-avatar-sm">\u2726</div><div class="aw-bubble-inner">${formatText(text)}</div>`;
    } else {
      wrapper.innerHTML = `<div class="aw-bubble-inner">${escapeHtml(text)}</div>`;
    }
    msgArea.appendChild(wrapper);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function showTyping() {
    const msgArea = document.getElementById("aw-messages");
    if (!msgArea) return;
    const wrapper = document.createElement("div");
    wrapper.className = "aw-msg bot";
    wrapper.id = "aw-typing";
    wrapper.innerHTML = `<div class="aw-avatar-sm">\u2726</div><div class="aw-bubble-inner aw-typing"><div class="aw-dot"></div><div class="aw-dot"></div><div class="aw-dot"></div></div>`;
    msgArea.appendChild(wrapper);
    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById("aw-typing");
    if (t) t.remove();
  }

  // ─── LOCAL DATA SEARCH ───────────────────────────────────────────────────────
  function findLocalAnswer(query) {
    const q = query.toLowerCase();
    const bots = window.botsData || [];
    const meetings = window.meetingsData || [];

    // 1. Bot/Account ID lookups
    if (q.includes('account id') || q.includes('login') || q.includes('api key')) {
      const match = bots.find(b => 
        (b.clientName && q.includes(b.clientName.toLowerCase())) || 
        (b.number && q.includes(b.number.toLowerCase()))
      );
      if (match) {
        return `Here are the details for **${match.clientName}**:
- **Account ID:** \`${match.accountId || 'N/A'}\`
- **WhatsApp Number:** ${match.number || 'N/A'}
- **API Key:** \`${match.apiKey || 'N/A'}\`
- **Status:** ${match.isActive ? '\u2705 Active' : '\u274C Inactive'}
- **Integration:** ${match.remark || 'N/A'}`;
      }
      if (q.includes('account id') && !match) {
        return "I couldn't find an account matching that name. Try asking for a specific client like 'What is the account ID for Client X?'";
      }
    }

    // 2. Meeting lookups
    if (q.includes('meeting') || q.includes('expiry') || q.includes('scheduled')) {
      if (q.includes('how many') || q.includes('count') || q.includes('total')) {
        return `You have a total of **${meetings.length} meetings** tracked in the system.`;
      }
      const upcoming = meetings.filter(m => new Date(m.scheduledDate) > new Date()).slice(0, 3);
      if (upcoming.length > 0) {
        let resp = "Here are your upcoming meetings:\n";
        upcoming.forEach(m => {
          resp += `- **${m.header}** on ${new Date(m.scheduledDate).toLocaleDateString()}\n`;
        });
        return resp;
      }
    }

    // 3. Navigation help
    if (q.includes('how do i') || q.includes('where is') || q.includes('navigate')) {
      if (q.includes('bot')) return "You can manage bots by clicking **Bot Details** in the sidebar.";
      if (q.includes('meeting')) return "You can view all meetings in the **Meeting Tracker** section.";
      if (q.includes('client')) return "Client management is located under the **Clients** tab.";
    }

    return null;
  }

  // ─── SEND MESSAGE ────────────────────────────────────────────────────────────
  async function sendMessage() {
    const input = document.getElementById("aw-input");
    const sendBtn = document.getElementById("aw-send");
    if (!input) return;

    const text = input.value.trim();
    if (!text || isLoading) return;

    input.value = "";
    input.style.height = "auto";
    isLoading = true;
    if (sendBtn) sendBtn.disabled = true;

    addBubble("user", text);
    history.push({ role: "user", content: text });
    showTyping();

    // Try local search first
    const localAnswer = findLocalAnswer(text);
    if (localAnswer) {
      setTimeout(() => {
        removeTyping();
        addBubble("bot", localAnswer);
        history.push({ role: "assistant", content: localAnswer });
        speakResponse(localAnswer);
        isLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      }, 600);
      return;
    }

    try {
      const systemPrompt = getPageContext();
      const response = await fetch(CLAUDE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          system: systemPrompt,
          messages: history,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 500 && (err.error?.message || '').includes('API_KEY')) {
          const fallback = "I'm currently running in **offline mode** because the AI API key is not configured. I can still help you with dashboard data, account IDs, and navigation! Try asking 'What is the account ID for [client name]?'";
          removeTyping();
          addBubble("bot", fallback);
          speakResponse(fallback);
          return;
        }
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.find((b) => b.type === "text")?.text || "Sorry, I couldn't get a response.";

      history.push({ role: "assistant", content: reply });
      removeTyping();
      addBubble("bot", reply);
      speakResponse(reply);
    } catch (err) {
      removeTyping();
      addBubble("bot", `\u26A0\uFE0F Note: ${err.message}. I'm optimized for dashboard data\u2014try asking about specific bots or meetings!`);
    } finally {
      isLoading = false;
      if (sendBtn) sendBtn.disabled = false;
      if (input) input.focus();
    }
  }

  // Voice output
  function speakResponse(text) {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#`]/g, ''));
      utterance.lang = 'en-IN';
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  }

  // ─── BUILD & INIT ────────────────────────────────────────────────────────────
  function buildWidget() {
    if (document.getElementById("aw-root")) return;

    const root = document.createElement("div");
    root.id = "aw-root";
    root.innerHTML = `
      <div id="aw-bubble">Hi, How can I assist you today?</div>
      <button id="aw-fab" title="Open ${AGENT_NAME}" aria-label="Open ${AGENT_NAME}">\u2726</button>

      <div id="aw-panel" role="dialog" aria-label="${AGENT_NAME} Assistant">
        <div id="aw-header">
          <div class="aw-avatar">\u2726</div>
          <div class="aw-title">
            <strong>${AGENT_NAME} — ORAI Insight Agent</strong>
            <span>Ask me anything about your dashboard</span>
          </div>
          <button id="aw-close" aria-label="Close assistant">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div id="aw-suggestions">
          <button class="aw-chip" data-q="What can I do on this page?">What can I do here?</button>
          <button class="aw-chip" data-q="Show me all active bots">Active bots</button>
          <button class="aw-chip" data-q="Show me quick tips for this section">Quick tips</button>
          <button class="aw-chip" data-q="How many meetings do we have?">Meeting count</button>
        </div>

        <div id="aw-messages" aria-live="polite">
          <div class="aw-msg bot">
            <div class="aw-avatar-sm">\u2726</div>
            <div class="aw-bubble-inner">
              Hi! I'm <strong>${AGENT_NAME}</strong>, your ORAI Insight Agent. I can help you with bot details, meeting info, account IDs, and navigating the dashboard. What can I help you with?
            </div>
          </div>
        </div>

        <div id="aw-footer">
          <button id="aw-mic-btn" title="Voice Input" aria-label="Voice Input">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </button>
          <textarea id="aw-input" placeholder="Ask ${AGENT_NAME} a question…" rows="1" aria-label="Message input"></textarea>
          <button id="aw-send" aria-label="Send message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // ─── Wire up events ───
    const fab = document.getElementById("aw-fab");
    const panel = document.getElementById("aw-panel");
    const closeBtn = document.getElementById("aw-close");
    const input = document.getElementById("aw-input");
    const sendBtn = document.getElementById("aw-send");
    const micBtn = document.getElementById("aw-mic-btn");
    const chips = document.querySelectorAll(".aw-chip");

    let panelOpen = false;

    function togglePanel(forceOpen) {
      panelOpen = forceOpen !== undefined ? forceOpen : !panelOpen;
      panel.classList.toggle("open", panelOpen);
      if (panelOpen) setTimeout(() => input.focus(), 250);
    }

    fab.onclick = () => togglePanel();
    closeBtn.onclick = () => togglePanel(false);

    input.oninput = () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    sendBtn.onclick = () => sendMessage();

    chips.forEach(chip => {
      chip.onclick = () => {
        input.value = chip.dataset.q;
        sendMessage();
      };
    });

    let recognition = null;
    let isMicOn = false;

    function stopRecognition() {
      if (recognition) {
        recognition.stop();
        recognition = null;
      }
      isMicOn = false;
      micBtn.classList.remove("recording");
      micBtn.title = "Turn Mic On (Currently Off/Green)";
    }

    function startRecognition() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { alert("Voice input is not supported in this browser."); return; }
      
      recognition = new SR();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        isMicOn = true;
        micBtn.classList.add("recording");
        micBtn.title = "Turn Mic Off";
      };

      recognition.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        input.value = transcript;
        sendMessage();
      };

      recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        if (e.error !== 'no-speech') stopRecognition();
      };

      recognition.onend = () => {
        if (isMicOn) {
          try { recognition.start(); } catch(e) { stopRecognition(); }
        }
      };

      recognition.start();
    }

    micBtn.onclick = () => {
      if (isMicOn) {
        stopRecognition();
      } else {
        startRecognition();
      }
    };

    window.toggleAIPanel = togglePanel;
  }

  // ─── GLOBAL API ──────────────────────────────────────────────────────────────
  window.askAIAgent = (text) => {
    if (!document.getElementById("aw-root")) buildWidget();
    const input = document.getElementById("aw-input");
    if (!input) return;
    if (window.toggleAIPanel) window.toggleAIPanel(true);
    input.value = text;
    sendMessage();
  };

  window.showAIBubble = (text = "Hi, How can I assist you today?") => {
    const b = document.getElementById("aw-bubble");
    const panel = document.getElementById("aw-panel");
    if (!b || (panel && panel.classList.contains("open"))) return;
    b.textContent = text;
    b.classList.add("show");
    setTimeout(() => b.classList.remove("show"), 5000);
  };

  // ─── INIT ON DOM READY ───────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
