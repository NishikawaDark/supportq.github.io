// ============================================================
//  npcbuddy.js  —  Support-Q Buddy Widget  (AI-powered)
//  Drop into any page:  <script src="npcbuddy.js" defer></script>
//
//  • Buddy floats bottom-right as a bouncy FAB
//  • Opens a chat-style panel with an input box
//  • USER CAN TYPE — Buddy replies via Claude AI
//  • Claude is given a mental-health companion system prompt
//  • Falls back to local messages if API fails
//  • Detects inactivity and sends a check-in
//  • Adapts tone for student vs admin
// ============================================================

(function () {
  'use strict';

  // ── ROLE ───────────────────────────────────────────────────
  const role     = sessionStorage.getItem('userRole') || 'student';
  const userName = sessionStorage.getItem('userName') || '';
  const isAdmin  = role === 'admin';
  const name     = userName.split(' ')[0] || 'there';

  // ── MENTAL HEALTH SMART RESPONDER ────────────────────────
  // Uses context-aware keyword matching + free wellness quote API
  // No API key required — fully open and CORS-friendly.

  const RESPONSE_RULES = isAdmin ? [
    { keywords: ['tired','exhausted','burnout','burn out','drained','overwhelmed'],
      replies: [
        `Compassion fatigue is real, ${name}. You give so much every day. What's one thing you can take off your plate today? 💙`,
        `You carry other people's weight constantly — that's incredibly hard. Have you taken even 10 minutes just for yourself? 🌿`,
        `Burnout doesn't mean you're weak. It means you've been strong for too long. Be gentle with yourself today 💛`,
      ]},
    { keywords: ['stressed','stress','pressure','anxious','anxiety','worried'],
      replies: [
        `That pressure is very real. Try this: breathe in for 4 counts, hold 4, out 4. Even once helps. What's weighing most on you? 💙`,
        `Stress in your role is unavoidable, but you don't have to carry it alone. Who do you lean on? 🌿`,
        `You matter too, ${name} — not just your students. What would feel like relief right now?`,
      ]},
    { keywords: ['good','great','fine','okay','well','happy','better'],
      replies: [
        `That's genuinely good to hear! What's contributing to that today? 😊`,
        `Love to hear that, ${name}! Even small good days deserve celebrating 🌟`,
        `That's great! Hold onto that energy — you deserve to feel good after everything you do 💙`,
      ]},
  ] : [
    { keywords: ['sad','depressed','depression','cry','crying','hopeless','worthless'],
      replies: [
        `I hear you, and your feelings are completely valid 💛 You don't have to be okay right now. Is there a counselor you trust? You can message them right here in the app.`,
        `That sounds really heavy. Thank you for sharing it. If things feel really dark, please reach out via the Contact tab 💙`,
        `You're not alone in this, even when it feels that way. Can you tell me one tiny thing that happened today — anything at all?`,
      ]},
    { keywords: ['anxious','anxiety','scared','nervous','panic','worried','stress','stressed'],
      replies: [
        `Anxiety is exhausting 😔 Try this right now: name 5 things you can see around you. It brings your mind back to the present. You've got this 💛`,
        `That sounds really overwhelming. Let's slow it down — what's the ONE thing stressing you most right now? We can work through it together.`,
        `Try a 4-7-8 breath: inhale 4s, hold 7s, exhale 8s. It actually calms your nervous system. Want to try it? 🌬️`,
      ]},
    { keywords: ['lonely','alone','no friends','no one','isolated','left out'],
      replies: [
        `Loneliness is one of the hardest feelings. You're not invisible — I see you 💛 Is there one person you could reach out to today, even just a message?`,
        `Feeling disconnected really hurts. You matter more than you know. Have you tried talking to your school counselor? They're genuinely there for you.`,
        `You showed up here and that already takes courage 🌟 You're not as alone as you feel right now.`,
      ]},
    { keywords: ['tired','exhausted','sleep','can\'t sleep','no sleep','sleepy'],
      replies: [
        `Lack of sleep makes everything harder. Even 20 minutes of rest (not sleep, just lying down) can help reset you. Can you get that today? 💤`,
        `Your body is telling you something. Rest is not laziness — it's maintenance. Be kind to yourself today 🌿`,
        `Sleep struggles are so common for students. Try putting your phone away 30 min before bed. What's keeping you awake?`,
      ]},
    { keywords: ['school','study','exam','test','homework','assignment','grade','grades','academic','fail','failing'],
      replies: [
        `Academic pressure is SO real. But here's the thing: your grade is not your worth 💛 What's one small step you can take right now?`,
        `Study overwhelm hits hard. Try the Pomodoro method: 25 min focus, 5 min break. Want to try one round? 📚`,
        `You're dealing with a lot. Talk to your teacher or counselor — they can help more than you might think.`,
      ]},
    { keywords: ['good','great','happy','excited','amazing','awesome','nice','better','okay','fine','well'],
      replies: [
        `That's genuinely wonderful to hear! 😊 What made it good? Tell me more!`,
        `Yes! I love hearing that 🌟 Hold onto that feeling — you deserve good days.`,
        `That makes me happy! Keep noticing these moments, they matter more than you think 💛`,
      ]},
    { keywords: ['help','need help','i need','please','struggling'],
      replies: [
        `I'm right here 💛 Tell me more — what's going on? I'm listening.`,
        `You reached out and that takes courage. What do you need most right now — to vent, advice, or just to feel heard?`,
        `I've got you. Start wherever you want — what's the heaviest thing on your mind?`,
      ]},
    { keywords: ['self harm','hurt myself','cut','cutting','suicide','kill myself','end it','die','dying'],
      replies: [
        `Thank you for trusting me with this 💛 Please reach out to your school counselor right now — you can message them in the Contact tab. If it's urgent, call or text 988. You matter so much.`,
        `I care about you and I'm taking this seriously. Please talk to your counselor or call/text 988. You deserve real support 💛`,
      ]},
  ];

  // Context-aware response matching
  function getSmartReply(userText) {
    const lower = userText.toLowerCase();
    for (const rule of RESPONSE_RULES) {
      if (rule.keywords.some(kw => lower.includes(kw))) {
        return rule.replies[Math.floor(Math.random() * rule.replies.length)];
      }
    }
    return null;
  }

  // ── CLAUDE AI MENTAL HEALTH CHATBOT ─────────────────────
  const SYSTEM_PROMPT = isAdmin
    ? `You are Buddy, a warm and empathetic mental health support companion for school administrators and counselors. Your role is to support the wellbeing of staff who spend their days caring for others.
Personality: Warm, non-judgmental, gently curious. Use occasional emojis (💙🌿💛🌟) but sparingly — never more than one per message. Keep messages short (2–4 sentences max).
Guidelines:
- Acknowledge feelings first before offering advice.
- Remind them their own wellbeing matters, not just their students'.
- Offer practical micro-strategies: box breathing, short breaks, setting boundaries.
- If they seem in crisis, gently direct them to 988 or a trusted colleague.
- Never diagnose, prescribe, or claim to replace professional mental health care.
- Always end with a short open question to keep the dialogue going.
- The user's name is: ${userName || 'there'}.`
    : `You are Buddy, a warm and empathetic mental health support companion for students. Your goal is to make students feel heard, less alone, and gently supported.
Personality: Friendly, non-judgmental, encouraging. Use occasional emojis (💛🌟😊🌿🌬️) but sparingly — never more than one per message. Keep messages concise (2–4 sentences max).
Guidelines:
- Always validate feelings before offering suggestions.
- For anxiety: offer grounding techniques (5-4-3-2-1, 4-7-8 breathing).
- For academic stress: remind them their worth ≠ their grades; suggest small steps.
- For loneliness: gently encourage one small social action or reaching out to a counselor.
- For positive check-ins: celebrate with them and invite them to share more.
- If a student seems in crisis, compassionately direct them to their school counselor (Contact tab) or call/text 988.
- Never diagnose, prescribe, or claim to replace professional mental health care.
- Always end with a short open question to keep the conversation going.
- The student's name is: ${userName || 'there'}.`;

  // Conversation history for context
  const history = [];
  const MAX_HISTORY = 10;

  async function getAIReply(userText) {
    history.push({ role: 'user', content: userText });
    if (history.length > MAX_HISTORY * 2) history.splice(0, 2);

    // 1. Smart keyword-based contextual response (crisis + strong matches)
    const smart = getSmartReply(userText);
    if (smart) {
      history.push({ role: 'assistant', content: smart });
      return smart;
    }

    // 2. Claude AI mental health chatbot for everything else
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const reply = data?.content?.find(b => b.type === 'text')?.text?.trim();
      if (reply) {
        history.push({ role: 'assistant', content: reply });
        return reply;
      }
      throw new Error('empty response');
    } catch (err) {
      console.warn('[Buddy] Claude API error:', err);
      // 3. Fallback to local empathetic responses if API is down
      const fb = getFallback();
      history.push({ role: 'assistant', content: fb });
      return fb;
    }
  }

  // ── FALLBACK MESSAGES (if API is down) ───────────────────
  const FALLBACKS_STUDENT = [
    `Hey, I hear you 💛 Sometimes just putting words to things helps. How are you feeling right now?`,
    `You're doing better than you think. What's weighing on you today?`,
    `It's okay to feel that way. Want to try a quick breathing exercise together? 🌬️`,
    `You're not alone in this. I'm right here. Keep talking if you want 😊`,
    `That sounds really tough. One thing at a time what feels most manageable right now?`,
  ];
  const FALLBACKS_ADMIN = [
    `That sounds exhausting. You carry a lot, how are YOU doing, really? 💙`,
    `Even counselors need someone to lean on. I'm here for you 💛`,
    `You can't pour from an empty cup. What would 5 minutes of rest look like today?`,
  ];
  const fallbacks = isAdmin ? FALLBACKS_ADMIN : FALLBACKS_STUDENT;
  let fbIdx = 0;
  function getFallback() { return fallbacks[fbIdx++ % fallbacks.length]; }

  // ── PROACTIVE MESSAGES (auto-pop while chat is open) ──────
  const PROACTIVE_STUDENT = [
    `Hey ${name}! Just checking in 💛 How's your day going so far?`,
    `Remember to drink some water! Hydration really does help 💧`,
    `You've got this. One step at a time 🌟`,
    `Quick tip: a 4-7-8 breath can calm your nervous system in under a minute 🌬️`,
    `Hard days don't last forever. You've survived every single one so far 💪`,
    `Small progress is still progress. Be proud of yourself today!`,
  ];
  const PROACTIVE_ADMIN = [
    `Hey ${name}! Don't forget to take a real break today. You've earned it ☕`,
    `You're making a real difference, even when it doesn't feel like it 🌟`,
    `Quick reminder: your wellbeing matters just as much as your students' 💙`,
    `Compassion fatigue is real. Be gentle with yourself 💛`,
  ];
  const proactivePool = isAdmin ? PROACTIVE_ADMIN : PROACTIVE_STUDENT;

  const GREETING = isAdmin
    ? `Hey ${name}! 👋 I'm Buddy, your support companion. You take care of students all day. I'm here to take care of you a little. You can talk to me about anything. How are you doing today?`
    : `Hey ${name}! 👋 I'm Buddy, your mental health companion. I'm here to listen, cheer you on, and help you through tough moments. Feel free to type anything, I'm all ears 💛`;

  const NPC_IMAGE = 'duckbuddy.png';

  // ── INJECT STYLES ─────────────────────────────────────────
  const CSS = `
    #buddy-launcher {
      position: fixed;
      bottom: 28px; right: 28px;
      z-index: 99999;
      display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
      font-family: 'Nunito', 'Quicksand', sans-serif;
      pointer-events: none;
    }
    #buddy-launcher > * { pointer-events: all; }

    /* ── WINDOW ── */
    #buddy-window {
      width: 320px;
      max-height: 500px;
      background: #fff; border-radius: 22px;
      box-shadow: 0 20px 60px rgba(19,42,63,0.18), 0 4px 16px rgba(0,0,0,0.08);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1.5px solid #e2e6ea;
      transform: scale(0.82) translateY(24px); opacity: 0; pointer-events: none;
      transition: transform 0.32s cubic-bezier(.34,1.56,.64,1), opacity 0.22s ease;
      transform-origin: bottom right;
    }
    #buddy-window.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

    /* ── HEADER ── */
    .buddy-header {
      background: #132A3F; padding: 12px 14px 10px;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    .buddy-header-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #f9d338, #f9a825);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; flex-shrink: 0; overflow: hidden;
      border: 2px solid rgba(249,211,56,0.35); position: relative;
    }
    .buddy-header-avatar img {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; border-radius: 50%; display: none;
    }
    .buddy-header-avatar img.loaded { display: block; }
    .buddy-header-info { flex: 1; min-width: 0; }
    .buddy-header-name { font-size: 13.5px; font-weight: 800; color: #f9d338; font-family: 'Quicksand', sans-serif; line-height: 1.2; }
    .buddy-header-status {
      font-size: 11px; color: rgba(255,255,255,0.55); font-weight: 600;
      display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .buddy-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #22c55e; flex-shrink: 0; animation: bPulse 2.2s infinite;
    }
    @keyframes bPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    .buddy-close-btn {
      background: rgba(255,255,255,0.1); border: none; border-radius: 8px;
      width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: rgba(255,255,255,0.65); font-size: 13px;
      transition: background 0.18s, color 0.18s; flex-shrink: 0;
    }
    .buddy-close-btn:hover { background: rgba(255,255,255,0.2); color: #fff; }

    /* ── MESSAGES BODY ── */
    .buddy-body {
      flex: 1; overflow-y: auto; padding: 14px 12px 10px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8f9fb; scroll-behavior: smooth;
    }
    .buddy-body::-webkit-scrollbar { width: 3px; }
    .buddy-body::-webkit-scrollbar-thumb { background: #dde0e5; border-radius: 3px; }

    /* ── MESSAGE ROWS ── */
    .buddy-msg {
      display: flex; align-items: flex-end; gap: 7px;
      animation: bMsgIn 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    .buddy-msg.user-msg { flex-direction: row-reverse; }
    @keyframes bMsgIn { from{opacity:0;transform:translateY(10px) scale(0.93)} to{opacity:1;transform:translateY(0) scale(1)} }

    .buddy-mini-avatar {
      width: 28px; height: 28px; border-radius: 50%;
      background: linear-gradient(135deg, #f9d338, #f9a825);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0; overflow: hidden; position: relative;
    }
    .buddy-mini-avatar img { position: absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:50%; display:none; }
    .buddy-mini-avatar img.loaded { display:block; }
    .buddy-mini-avatar .bm-emoji { font-size: 14px; }

    .buddy-bubble {
      background: #fff; border: 1.5px solid #e2e6ea;
      border-radius: 16px; border-bottom-left-radius: 4px;
      padding: 9px 13px; font-size: 12.5px; font-weight: 600;
      color: #132A3F; line-height: 1.55; max-width: 225px;
      word-break: break-word; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .buddy-msg.user-msg .buddy-bubble {
      background: #132A3F; color: #fff;
      border-color: #132A3F; border-radius: 16px; border-bottom-right-radius: 4px;
    }

    /* ── TYPING ── */
    .buddy-typing-row { display: flex; align-items: flex-end; gap: 7px; animation: bMsgIn 0.22s ease; }
    .buddy-typing {
      display: flex; align-items: center; gap: 4px; padding: 10px 13px;
      background: #fff; border: 1.5px solid #e2e6ea;
      border-radius: 16px; border-bottom-left-radius: 4px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .buddy-typing-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #c5cad3; animation: bTypeBounce 1.1s infinite;
    }
    .buddy-typing-dot:nth-child(2) { animation-delay: 0.18s; }
    .buddy-typing-dot:nth-child(3) { animation-delay: 0.36s; }
    @keyframes bTypeBounce { 0%,60%,100%{transform:translateY(0);background:#c5cad3} 30%{transform:translateY(-5px);background:#132A3F} }

    /* ── INPUT AREA ── */
    .buddy-input-row {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; background: #fff;
      border-top: 1px solid #f0f2f5; flex-shrink: 0;
    }
    #buddy-input {
      flex: 1; border: 1.5px solid #e2e6ea; border-radius: 20px;
      padding: 8px 14px; font-size: 12.5px; font-family: 'Nunito', sans-serif;
      color: #132A3F; outline: none; transition: border-color 0.18s;
      background: #f8f9fb; resize: none;
    }
    #buddy-input:focus { border-color: #f9a825; background: #fff; }
    #buddy-send {
      width: 34px; height: 34px; border-radius: 50%;
      background: #132A3F; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #f9d338; font-size: 13px; flex-shrink: 0;
      transition: background 0.18s, transform 0.18s;
    }
    #buddy-send:hover  { background: #1e3f5c; transform: scale(1.08); }
    #buddy-send:active { transform: scale(0.92); }
    #buddy-send:disabled { background: #e2e6ea; color: #aab0ba; cursor: default; }

    /* ── AI BADGE ── */
    .buddy-ai-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 700; color: #aab0ba;
      padding: 5px 12px 6px; text-align: center; justify-content: center;
      background: #fff; border-top: 1px solid #f0f2f5; flex-shrink: 0;
      letter-spacing: 0.03em;
    }
    .buddy-ai-badge i { color: #f9a825; }

    /* ── FAB ── */
    #buddy-fab {
      width: 62px; height: 62px; border-radius: 50%;
      background: #132A3F; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(19,42,63,0.32), 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s;
      position: relative; overflow: hidden; padding: 0;
      animation: bFabFloat 3.5s ease-in-out 2s infinite;
    }
    @keyframes bFabFloat { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.03)} }
    #buddy-fab:hover  { transform: scale(1.12) translateY(-3px) !important; box-shadow: 0 14px 32px rgba(19,42,63,0.38); animation: none; }
    #buddy-fab:active { transform: scale(0.94) !important; animation: none; }
    .buddy-fab-img { position: absolute; inset:0; width:100%; height:100%; object-fit:cover; border-radius:50%; display:none; }
    .buddy-fab-img.loaded { display:block; }
    .buddy-fab-emoji { font-size: 27px; line-height: 1; }
    #buddy-fab-dot {
      position: absolute; top:3px; right:3px;
      width:14px; height:14px; background:#ef4444;
      border-radius:50%; border:2px solid #fff; display:none;
      animation: bDotPop 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    #buddy-fab-dot.show { display:block; }
    @keyframes bDotPop { from{transform:scale(0)} to{transform:scale(1)} }

    /* ── TOOLTIP ── */
    #buddy-tooltip {
      background: #132A3F; color: #fff;
      font-size: 12px; font-weight: 700;
      padding: 8px 13px; border-radius: 13px; border-bottom-right-radius: 3px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.14); white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    #buddy-tooltip.show { opacity: 1; }
    #buddy-tooltip span { color: #f9d338; }

    /* ── DARK MODE ── */
    [data-theme="dark"] #buddy-window      { background:#1a2535; border-color:#2d3748; }
    [data-theme="dark"] .buddy-body        { background:#131e2d; }
    [data-theme="dark"] .buddy-bubble      { background:#1e2d3d; border-color:#2d3748; color:#e5e7eb; }
    [data-theme="dark"] .buddy-msg.user-msg .buddy-bubble { background:#132A3F; border-color:#1e3f5c; color:#fff; }
    [data-theme="dark"] .buddy-input-row   { background:#1a2535; border-color:#2d3748; }
    [data-theme="dark"] #buddy-input       { background:#131e2d; border-color:#2d3748; color:#e5e7eb; }
    [data-theme="dark"] #buddy-input:focus { background:#1a2535; border-color:#f9a825; }
    [data-theme="dark"] .buddy-typing      { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .buddy-ai-badge    { background:#1a2535; border-color:#2d3748; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // ── BUILD DOM ─────────────────────────────────────────────
  const launcher = document.createElement('div');
  launcher.id = 'buddy-launcher';
  launcher.innerHTML = `
    <div id="buddy-window" role="complementary" aria-label="Buddy">
      <div class="buddy-header">
        <div class="buddy-header-avatar">
          <img src="${NPC_IMAGE}" alt="" id="bHeaderImg"/>
          <span id="bHeaderEmoji">🤖</span>
        </div>
        <div class="buddy-header-info">
          <div class="buddy-header-name">Buddy</div>
          <div class="buddy-header-status">
            <span class="buddy-status-dot"></span>
            AI-powered · Here for you 💛
          </div>
        </div>
        <button class="buddy-close-btn" id="bCloseBtn" title="Close">✕</button>
      </div>
      <div class="buddy-body" id="bBody"></div>
      <div class="buddy-input-row">
        <input type="text" id="buddy-input" placeholder="Talk to Buddy…" autocomplete="off" maxlength="500"/>
        <button id="buddy-send" title="Send">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
      <div class="buddy-ai-badge">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Powered by AI · Not a substitute for professional help
      </div>
    </div>

    <div id="buddy-tooltip">Buddy wants to <span>chat with you</span> 👀</div>

    <button id="buddy-fab" title="Open Buddy">
      <img src="${NPC_IMAGE}" alt="Buddy" class="buddy-fab-img" id="bFabImg"/>
      <span class="buddy-fab-emoji" id="bFabEmoji">🤖</span>
      <div id="buddy-fab-dot"></div>
    </button>
  `;
  document.body.appendChild(launcher);

  // ── IMAGE LOADING ─────────────────────────────────────────
  function tryImg(imgEl, fallbackEl) {
    const src = imgEl.src; imgEl.src = '';
    imgEl.onload  = () => { imgEl.classList.add('loaded'); if (fallbackEl) fallbackEl.style.display = 'none'; };
    imgEl.onerror = () => { imgEl.style.display = 'none'; };
    imgEl.src = src;
  }
  tryImg(document.getElementById('bHeaderImg'), document.getElementById('bHeaderEmoji'));
  tryImg(document.getElementById('bFabImg'),    document.getElementById('bFabEmoji'));

  // ── REFS ──────────────────────────────────────────────────
  const win      = document.getElementById('buddy-window');
  const fab      = document.getElementById('buddy-fab');
  const bodyEl   = document.getElementById('bBody');
  const closeBtn = document.getElementById('bCloseBtn');
  const tooltip  = document.getElementById('buddy-tooltip');
  const fabDot   = document.getElementById('buddy-fab-dot');
  const inputEl  = document.getElementById('buddy-input');
  const sendBtn  = document.getElementById('buddy-send');

  // ── STATE ─────────────────────────────────────────────────
  let isOpen    = false;
  let hasOpened = false;
  let idleTimer = null;
  let proactiveTimer = null;
  let tooltipTimer   = null;
  let proactiveIdx   = 0;
  let isThinking     = false;

  const PROACTIVE_INTERVAL = 50 * 1000;  // 50s
  const IDLE_TIMEOUT_MS    = 3 * 60 * 1000;

  const shuffledProactive = [...proactivePool].sort(() => Math.random() - 0.5);

  // ── HELPERS ───────────────────────────────────────────────
  function scrollBottom() { setTimeout(() => { bodyEl.scrollTop = bodyEl.scrollHeight; }, 50); }

  function makeMiniAvatar() {
    const wrap = document.createElement('div');
    wrap.className = 'buddy-mini-avatar';
    const img = document.createElement('img');
    img.src = NPC_IMAGE;
    img.onload  = () => img.classList.add('loaded');
    img.onerror = () => img.style.display = 'none';
    const em  = document.createElement('span');
    em.className = 'bm-emoji'; em.textContent = '🤖';
    wrap.appendChild(img); wrap.appendChild(em);
    return wrap;
  }

  function showTooltip(html) {
    if (html) tooltip.innerHTML = html;
    clearTimeout(tooltipTimer);
    tooltip.classList.add('show');
    tooltipTimer = setTimeout(() => tooltip.classList.remove('show'), 5000);
  }

  function addUserBubble(text) {
    const row = document.createElement('div');
    row.className = 'buddy-msg user-msg';
    const bubble = document.createElement('div');
    bubble.className = 'buddy-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();
  }

  function showTyping() {
    const row = document.createElement('div');
    row.className = 'buddy-typing-row'; row.id = 'bTypingRow';
    row.appendChild(makeMiniAvatar());
    const dots = document.createElement('div');
    dots.className = 'buddy-typing';
    dots.innerHTML = `<div class="buddy-typing-dot"></div><div class="buddy-typing-dot"></div><div class="buddy-typing-dot"></div>`;
    row.appendChild(dots);
    bodyEl.appendChild(row);
    scrollBottom();
  }

  function removeTyping() { document.getElementById('bTypingRow')?.remove(); }

  function addBuddyBubble(text) {
    const row = document.createElement('div');
    row.className = 'buddy-msg';
    row.appendChild(makeMiniAvatar());
    const bubble = document.createElement('div');
    bubble.className = 'buddy-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    bodyEl.appendChild(row);
    scrollBottom();

    if (!isOpen) {
      fabDot.classList.add('show');
      showTooltip(`Buddy has <span>a message for you</span> 💛`);
    }
  }

  // Animate typing then show bubble (for proactive/automated messages)
  function typeMessage(text, delayMs = 0) {
    setTimeout(() => {
      showTyping();
      const typeMs = Math.min(700 + text.length * 14, 2000);
      setTimeout(() => {
        removeTyping();
        addBuddyBubble(text);
      }, typeMs);
    }, delayMs);
  }

  // ── SEND USER MESSAGE ─────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || isThinking) return;

    inputEl.value = '';
    addUserBubble(text);
    isThinking = true;
    sendBtn.disabled = true;
    inputEl.disabled = true;

    showTyping();

    // Realistic delay: slight pause before thinking
    await new Promise(r => setTimeout(r, 400));

    const reply = await getAIReply(text);

    removeTyping();
    addBuddyBubble(reply);

    isThinking = false;
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
    resetIdleTimer();
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // ── OPEN / CLOSE ──────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    fab.style.animation = 'none';
    fabDot.classList.remove('show');
    tooltip.classList.remove('show');

    if (!hasOpened) {
      hasOpened = true;
      typeMessage(GREETING, 350);
      scheduleProactive();
    } else {
      scheduleProactive();
    }

    resetIdleTimer();
    setTimeout(() => inputEl.focus(), 380);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    clearInterval(proactiveTimer);
    setTimeout(() => { fab.style.animation = ''; }, 120);
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── PROACTIVE MESSAGES ────────────────────────────────────
  function scheduleProactive() {
    clearInterval(proactiveTimer);
    proactiveTimer = setInterval(() => {
      const msg = shuffledProactive[proactiveIdx++ % shuffledProactive.length];
      typeMessage(msg);
    }, PROACTIVE_INTERVAL);
  }

  // ── IDLE CHECK-IN ─────────────────────────────────────────
  const IDLE_STUDENT = [
    `Psst, still there ${name}? 👀 I'm here if you want to chat!`,
    `Hey! You've been quiet, everything okay? 💛`,
    `Don't forget, you can always talk to me, about anything 😊`,
    `Taking a break? That's perfectly okay! I'll be here 🌿`,
  ];
  const IDLE_ADMIN = [
    `Hey ${name}, still with me? How are you holding up? 💛`,
    `You've been busy, don't forget to breathe 🌿`,
    `I'm here whenever you need to vent or just talk 💙`,
  ];
  const idlePool = isAdmin ? IDLE_ADMIN : IDLE_STUDENT;

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const msg = idlePool[Math.floor(Math.random() * idlePool.length)];
      typeMessage(msg);
      if (!isOpen) {
        fabDot.classList.add('show');
        showTooltip(`Buddy is <span>checking in on you</span> 💛`);
      }
      resetIdleTimer();
    }, IDLE_TIMEOUT_MS);
  }

  ['mousemove','keydown','click','touchstart','scroll'].forEach(e => {
    document.addEventListener(e, resetIdleTimer, { passive: true });
  });

  // ── INITIAL TOOLTIP after 6s ─────────────────────────────
  setTimeout(() => {
    if (!isOpen) {
      fabDot.classList.add('show');
      showTooltip(`Hey! Buddy is <span>here to chat</span> 👋`);
    }
  }, 6000);

  resetIdleTimer();

})();