/**
 * ORAI AI Agent Module
 * Handles Natural Language Queries, Voice Input, and Voice Output
 */

let agentVisible = false;
let isSpeaking = false;
let isListening = false;
const synth = window.speechSynthesis;
let recognition = null;

if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    updateMicUI();
  };

  recognition.onend = () => {
    isListening = false;
    updateMicUI();
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('agent-input').value = transcript;
    handleAgentQuery(transcript);
  };
}

function initAgent() {
  const body = document.body;
  // Check if already exists
  if (document.getElementById('agent-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'agent-widget';
  widget.innerHTML = `
    <div id="agent-popup" class="agent-popup-bubble">
      <span>Please connect for quick help</span>
      <button class="popup-close" onclick="closeAgentPopup()">Ã—</button>
    </div>
    <div id="agent-chat-window" class="hidden">
      <div class="agent-header">
        <div class="agent-title">
          <div class="agent-avatar-img">
            <img src="/assets/ai-avatar.png" alt="AI" onerror="this.src='https://cdn-icons-png.flaticon.com/512/4712/4712035.png'">
          </div>
          <div>
            <div style="font-weight:600">ORAI Assistant</div>
            <div style="font-size:0.7rem; color:var(--accent)">Voice Enabled Agent</div>
          </div>
        </div>
        <button class="btn-icon" onclick="toggleAgent()">${iconX(18)}</button>
      </div>
      <div id="agent-messages" class="agent-messages">
        <div class="message assistant">Hello! I'm your ORAI Insight Assistant. How can I help you today? You can ask me for details about any account or bot.</div>
      </div>
      <div class="agent-input-area">
        <button id="agent-mic-btn" class="btn-icon mic-btn" onclick="toggleListening()" title="Voice Input">
          ${iconMic(20)}
        </button>
        <input type="text" id="agent-input" placeholder="Type or speak..." onkeypress="if(event.key==='Enter') handleAgentQuery(this.value)">
        <button class="btn-icon send-btn" onclick="handleAgentQuery(document.getElementById('agent-input').value)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
    <button id="agent-toggle-btn" onclick="toggleAgent()" title="AI Assistant">
      <div class="agent-avatar-pulse">
        <img src="/assets/ai-avatar.png" alt="AI" style="width:100%; height:100%; border-radius:50%" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
        <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center">${iconBot(28)}</div>
      </div>
    </button>
  `;
  body.appendChild(widget);
  
  // Show popup after 2 seconds
  setTimeout(() => {
    const popup = document.getElementById('agent-popup');
    if (popup) popup.classList.add('show');
  }, 2000);
}

function closeAgentPopup() {
  const popup = document.getElementById('agent-popup');
  if (popup) popup.classList.remove('show');
}

function toggleAgent() {
  const win = document.getElementById('agent-chat-window');
  agentVisible = !agentVisible;
  win.classList.toggle('hidden', !agentVisible);
  if (agentVisible) {
    document.getElementById('agent-input').focus();
  }
}

function toggleListening() {
  if (!recognition) {
    toast('Speech recognition not supported in this browser.', 'error');
    return;
  }
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

function updateMicUI() {
  const btn = document.getElementById('agent-mic-btn');
  if (btn) {
    btn.classList.toggle('listening', isListening);
  }
}

async function handleAgentQuery(text) {
  if (!text.trim()) return;
  
  const input = document.getElementById('agent-input');
  input.value = '';
  
  addMessage(text, 'user');
  
  try {
    const res = await api.agent.query(text, currentUser?.department);
    if (res.ok) {
      const responseText = res.data.response;
      addMessage(responseText, 'assistant');
      speak(responseText);
    } else {
      addMessage("I'm sorry, I'm having trouble connecting right now.", 'assistant');
    }
  } catch (err) {
    addMessage("Something went wrong. Please try again.", 'assistant');
  }
}

function addMessage(text, sender) {
  const container = document.getElementById('agent-messages');
  const msg = document.createElement('div');
  msg.className = `message ${sender}`;
  msg.textContent = text;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function speak(text) {
  if (!synth) return;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = 1;
  utterance.rate = 1;
  
  // Use a professional sounding voice if available
  const voices = synth.getVoices();
  const femaleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
  if (femaleVoice) utterance.voice = femaleVoice;

  synth.speak(utterance);
}

// Icons
function iconMic(size=20) { return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`; }

// Initialize when the DOM is ready (called from main app)
window.initAgent = initAgent;
