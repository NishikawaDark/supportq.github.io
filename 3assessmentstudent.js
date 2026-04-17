// ============================================================
//  3assessmentstudent.js  — Gamified Daily Check-in
//  v2: Mode picker, Claude-powered Buddy, Crisis-aware flow
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://damkluawdvsthjjcpzgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e-m7pdLACqrJAxRiPuy7UA_LXzHuEC6';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const studentId = Number(sessionStorage.getItem('userId')) || null;

// ── TOAST ────────────────────────────────────────────────────
const toastEl  = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
let toastTimer;
function showToast(msg, isError = false) {
  if (!toastEl || !toastMsg) return;
  toastMsg.textContent = msg;
  toastEl.querySelector('i').style.color = isError ? '#ef4444' : '#22c55e';
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3500);
}

// ── TODAY ────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

async function checkAlreadySubmitted() {
  if (!studentId) return false;
  const { data } = await supabase
    .from('checkins').select('id')
    .eq('student_id', studentId)
    .gte('submitted_at', todayStr() + 'T00:00:00')
    .lte('submitted_at', todayStr() + 'T23:59:59')
    .limit(1);
  return data && data.length > 0;
}

// ── EMOJI SCALES ─────────────────────────────────────────────
const MOODS = [
  { emoji: '😭', label: 'Terrible', value: 1 },
  { emoji: '😔', label: 'Rough',    value: 3 },
  { emoji: '😐', label: 'Meh',      value: 5 },
  { emoji: '🙂', label: 'Good',     value: 7 },
  { emoji: '😄', label: 'Amazing',  value: 9 },
];
const STRESS = [
  { emoji: '🧘', label: 'Zen',       value: 1 },
  { emoji: '😌', label: 'Chill',     value: 3 },
  { emoji: '😤', label: 'A bit',     value: 5 },
  { emoji: '😰', label: 'Stressed',  value: 7 },
  { emoji: '🤯', label: 'Overload',  value: 10 },
];
const SLEEP = [
  { emoji: '☠️', label: 'Zombie',    value: 1 },
  { emoji: '😴', label: 'Tired',     value: 3 },
  { emoji: '🙃', label: 'Okay-ish',  value: 5 },
  { emoji: '😊', label: 'Rested',    value: 7 },
  { emoji: '🌟', label: 'Refreshed', value: 10 },
];
const SOCIAL = [
  { emoji: '🏝️', label: 'Isolated',    value: 1 },
  { emoji: '🤏', label: 'A little',    value: 3 },
  { emoji: '🤝', label: 'Connected',   value: 6 },
  { emoji: '🫂', label: 'Well loved',  value: 10 },
];
const ACADEMIC = [
  { emoji: '🌀', label: 'Drowning',    value: 10 },
  { emoji: '😬', label: 'Heavy',       value: 7  },
  { emoji: '📚', label: 'Manageable',  value: 5  },
  { emoji: '✅', label: 'On top of it',value: 2  },
  { emoji: '🎉', label: 'Zero stress', value: 1  },
];

// Shared answer state
const answers = {
  mood_rating: 5,
  stress_level: 5,
  sleep_quality: 5,
  social_wellbeing: 5,
  academic_pressure: 5,
  activities: '',
  notes: '',
  ate_meals: null,
  slept_enough: null,
  felt_safe: null,
  connected: null,
  overwhelmed: null,
  therapist_q1: null,
  therapist_q2: null,
  therapist_q3: null,
};

// ── CRISIS DETECTION ──────────────────────────────────────────
// Returns true if current answers suggest the student may be in distress
function isCrisisSignal() {
  return (
    answers.mood_rating   <= 2 ||
    answers.stress_level  >= 9 ||
    answers.overwhelmed   === 'yes' ||
    answers.felt_safe     === 'no'
  );
}

// ── BUDDY COMPLETION MESSAGE ──────────────────────────────────
// Uses free ZenQuotes API (via CORS proxy) + context-aware local messages.
// No API key required.

async function fetchWellnessQuote() {
  try {
    const res = await fetch('https://api.allorigins.win/get?url=' +
      encodeURIComponent('https://zenquotes.io/api/random'));
    if (!res.ok) throw new Error('quote');
    const wrapper = await res.json();
    const data = JSON.parse(wrapper.contents);
    const q = data?.[0];
    return (q?.q && q?.a) ? `"${q.q}" — ${q.a}` : null;
  } catch {
    return null;
  }
}

async function getBuddyMessage(context) {
  const { mood, stress, name, isLightMode, isCrisis } = context;
  const userName = name || 'there';

  if (isCrisis) {
    const msgs = [
      `Hey ${userName}, it took real courage to check in today 💛 You don't have to carry this alone — your counselor can see this and is here for you. Please reach out via the Contact tab.`,
      `Thank you for showing up today, ${userName}. That matters more than you know. A counselor is available — you can message them directly from this app 💛`,
      `${userName}, you're brave for doing this check-in 💛 Your feelings are valid, and you deserve real support. Your counselor is just one message away.`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  if (isLightMode) {
    const msgs = [
      `Just showing up counts more than you know, ${userName}. Be gentle with yourself today 🌤️`,
      `You didn't have to do this today, but you did — and that's something to be proud of, ${userName} 💛`,
      `Even on hard days, you still checked in. That's real strength, ${userName}. Rest when you need to 🌿`,
    ];
    const local = msgs[Math.floor(Math.random() * msgs.length)];
    const quote = await fetchWellnessQuote();
    return quote ? `${local}\n\n💬 ${quote}` : local;
  }

  const moodLabel = mood >= 8 ? 'a great' : mood >= 5 ? 'an okay' : 'a tough';
  const msgs = [
    `Great work checking in today, ${userName}! 🌟 It was ${moodLabel} day, but you took the time to reflect — and that genuinely matters.`,
    `You just invested in your own wellbeing, ${userName} — and that's something to be proud of 🎉 Keep showing up for yourself!`,
    `Check-in done! ${mood >= 7 ? `Sounds like today had some bright spots 🌟` : `Even on harder days, noticing how you feel is a superpower 💛`} Your counselor will see this and they're rooting for you, ${userName}.`,
  ];
  const base = msgs[Math.floor(Math.random() * msgs.length)];
  const quote = await fetchWellnessQuote();
  return quote ? `${base}\n\n💬 ${quote}` : base;
}

// ── STYLES ────────────────────────────────────────────────────
function injectGameStyles() {
  if (document.getElementById('game-assess-styles')) return;
  const s = document.createElement('style');
  s.id = 'game-assess-styles';
  s.textContent = `
    /* ── WRAPPER ── */
    .ga-wrapper {
      display: flex; flex-direction: column; gap: 1.4rem;
      animation: gaFadeIn 0.4s ease;
    }
    @keyframes gaFadeIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }

    /* ── MODE PICKER ── */
    .ga-mode-picker {
      display: flex; flex-direction: column; gap: 1.4rem;
      animation: gaFadeIn 0.45s ease;
    }
    .ga-mode-picker-header {
      text-align: center; padding: 0.5rem 0 0.2rem;
    }
    .ga-mode-picker-eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(77,184,184,0.12); color: var(--teal, #4db8b8);
      border: 1px solid rgba(77,184,184,0.3);
      border-radius: 99px; padding: 3px 12px;
      font-size: 0.7rem; font-weight: 800;
      letter-spacing: 0.08em; text-transform: uppercase;
      margin-bottom: 0.6rem;
    }
    .ga-mode-picker-title {
      font-family: 'Quicksand', sans-serif;
      font-size: 1.35rem; font-weight: 800;
      color: var(--text-primary, #132A3F);
      margin-bottom: 0.25rem; line-height: 1.3;
    }
    .ga-mode-picker-sub {
      font-size: 0.82rem; color: var(--text-muted, #8a97a8);
      font-weight: 600;
    }

    /* ── FEATURED (Light check-in) ── */
    .ga-mode-featured {
      background: linear-gradient(135deg, #132A3F 0%, #1e3f5c 100%);
      border-radius: 20px; padding: 1.3rem 1.4rem;
      display: flex; align-items: center; gap: 1rem;
      cursor: pointer; transition: all 0.25s;
      border: 2px solid transparent;
      box-shadow: 0 4px 20px rgba(19,42,63,0.2);
      position: relative; overflow: hidden;
    }
    .ga-mode-featured::before {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(135deg, rgba(249,211,56,0.08), transparent);
      pointer-events: none;
    }
    .ga-mode-featured:hover {
      transform: translateY(-3px);
      box-shadow: 0 10px 32px rgba(19,42,63,0.3);
      border-color: rgba(249,211,56,0.4);
    }
    .ga-mode-featured-icon {
      width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
      background: rgba(249,211,56,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem; border: 1.5px solid rgba(249,211,56,0.2);
    }
    .ga-mode-featured-content { flex: 1; min-width: 0; }
    .ga-mode-featured-name {
      font-size: 1rem; font-weight: 800;
      color: #f9d338; font-family: 'Quicksand', sans-serif;
      margin-bottom: 3px;
    }
    .ga-mode-featured-desc {
      font-size: 0.78rem; font-weight: 600;
      color: rgba(255,255,255,0.65); line-height: 1.45;
    }
    .ga-mode-featured-pill {
      display: inline-flex; align-items: center; gap: 4px;
      background: rgba(239,68,68,0.25); color: #fca5a5;
      border: 1px solid rgba(239,68,68,0.35);
      border-radius: 99px; padding: 2px 10px;
      font-size: 0.68rem; font-weight: 800;
      margin-top: 6px;
    }
    .ga-mode-featured-arrow {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
      background: rgba(249,211,56,0.15);
      display: flex; align-items: center; justify-content: center;
      color: #f9d338; font-size: 0.9rem;
      border: 1.5px solid rgba(249,211,56,0.2);
      transition: background 0.2s, transform 0.2s;
    }
    .ga-mode-featured:hover .ga-mode-featured-arrow {
      background: rgba(249,211,56,0.25); transform: translateX(3px);
    }

    /* ── SECTION LABEL ── */
    .ga-mode-section-label {
      font-size: 0.72rem; font-weight: 800;
      color: var(--text-muted, #8a97a8);
      letter-spacing: 0.1em; text-transform: uppercase;
    }

    /* ── MODE GRID ── */
    .ga-mode-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
      gap: 10px;
    }
    .ga-mode-card {
      background: var(--surface, #fff);
      border: 2px solid var(--border, #e2e6ea);
      border-radius: 18px; padding: 1.1rem 1rem 0.9rem;
      cursor: pointer; transition: all 0.22s;
      display: flex; flex-direction: column; gap: 7px;
      font-family: 'Nunito', sans-serif;
      text-align: left; position: relative; overflow: hidden;
    }
    .ga-mode-card::after {
      content: ''; position: absolute;
      bottom: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, var(--teal,#4db8b8), #2d9aad);
      transform: scaleX(0); transform-origin: left;
      transition: transform 0.25s ease;
      border-radius: 0 0 99px 99px;
    }
    .ga-mode-card:hover {
      border-color: var(--teal, #4db8b8);
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(77,184,184,0.18);
    }
    .ga-mode-card:hover::after { transform: scaleX(1); }
    .ga-mode-card.selected {
      border-color: var(--teal, #4db8b8);
      background: linear-gradient(160deg, rgba(77,184,184,0.06), rgba(77,184,184,0.12));
      box-shadow: 0 6px 22px rgba(77,184,184,0.22);
    }
    .ga-mode-card.selected::after { transform: scaleX(1); }

    .ga-mode-card-icon {
      font-size: 2rem; line-height: 1;
      width: 44px; height: 44px; border-radius: 12px;
      background: var(--surface-alt, #f8f9fb);
      display: flex; align-items: center; justify-content: center;
      border: 1.5px solid var(--border, #e2e6ea);
      transition: background 0.2s, border-color 0.2s;
    }
    .ga-mode-card:hover .ga-mode-card-icon,
    .ga-mode-card.selected .ga-mode-card-icon {
      background: rgba(77,184,184,0.1); border-color: rgba(77,184,184,0.3);
    }
    .ga-mode-card-name {
      font-size: 0.9rem; font-weight: 800;
      color: var(--text-primary, #132A3F); line-height: 1.2;
    }
    .ga-mode-card-desc {
      font-size: 0.73rem; font-weight: 600;
      color: var(--text-muted, #8a97a8); line-height: 1.45;
      flex: 1;
    }
    .ga-mode-card-badge {
      display: inline-flex; align-items: center; gap: 4px;
      background: #f0fdf4; color: #16a34a;
      border-radius: 99px; padding: 2px 9px;
      font-size: 0.67rem; font-weight: 800;
      border: 1px solid #bbf7d0;
      width: fit-content;
    }
    .ga-mode-card-badge.badge-teal {
      background: rgba(77,184,184,0.1); color: var(--teal, #4db8b8);
      border-color: rgba(77,184,184,0.25);
    }
    .ga-mode-card-badge.badge-yellow {
      background: #fefce8; color: #a16207;
      border-color: #fde68a;
    }
    .ga-mode-card-badge.badge-red {
      background: #fef2f2; color: #dc2626;
      border-color: #fecaca;
    }

    /* ── CRISIS BANNER ── */
    .ga-crisis-banner {
      background: linear-gradient(135deg, #fff1f2, #ffe4e6);
      border: 2px solid #fecaca; border-radius: 16px;
      padding: 1.2rem 1.3rem;
      display: flex; flex-direction: column; gap: 10px;
      animation: gaFadeIn 0.4s ease;
    }
    .ga-crisis-banner-top {
      display: flex; align-items: center; gap: 10px;
    }
    .ga-crisis-banner-icon { font-size: 1.8rem; flex-shrink: 0; }
    .ga-crisis-banner-title { font-size: 0.95rem; font-weight: 800; color: #991b1b; font-family:'Quicksand',sans-serif; }
    .ga-crisis-banner-body { font-size: 0.82rem; color: #7f1d1d; font-weight: 600; line-height: 1.5; }
    .ga-crisis-btn {
      display: inline-flex; align-items: center; gap: 7px;
      background: #dc2626; color: #fff;
      border: none; border-radius: 10px;
      padding: 0.65rem 1.2rem;
      font-size: 0.85rem; font-weight: 800;
      cursor: pointer; font-family: 'Nunito', sans-serif;
      transition: all 0.2s; width: fit-content;
    }
    .ga-crisis-btn:hover { background: #b91c1c; transform: translateY(-1px); }

    /* ── LIGHT MODE CHECK-IN ── */
    .ga-light-card {
      background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
      border: 2px solid #bae6fd; border-radius: 18px;
      padding: 1.5rem; animation: gaFadeIn 0.4s ease;
    }
    .ga-light-card h3 { font-family: 'Quicksand', sans-serif; font-size: 1rem; font-weight: 800; color: #0369a1; margin-bottom: 0.4rem; }
    .ga-light-card p { font-size: 0.82rem; color: #075985; font-weight: 600; margin-bottom: 1rem; }

    /* ── MODE BADGE ── */
    .ga-mode-badge {
      display: inline-flex; align-items: center; gap: 7px;
      background: linear-gradient(135deg, var(--teal,#4db8b8), #2d9aad);
      color: #fff; border-radius: 99px;
      padding: 5px 14px; font-size: 0.78rem; font-weight: 800;
      letter-spacing: 0.04em; text-transform: uppercase;
      width: fit-content; box-shadow: 0 2px 10px rgba(77,184,184,0.3);
    }

    /* ── STEP INDICATOR ── */
    .ga-steps { display: flex; gap: 6px; align-items: center; }
    .ga-step-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--border,#e2e6ea); transition: all 0.3s;
    }
    .ga-step-dot.done  { background: var(--teal,#4db8b8); transform: scale(1.1); }
    .ga-step-dot.active { background: var(--teal,#4db8b8); box-shadow: 0 0 0 3px rgba(77,184,184,0.25); transform: scale(1.3); }

    .ga-progress-bar-wrap {
      height: 5px; background: var(--border,#e2e6ea);
      border-radius: 99px; overflow: hidden; margin-bottom: 0.3rem;
    }
    .ga-progress-bar {
      height: 100%; background: linear-gradient(90deg, var(--teal,#4db8b8), #2d9aad);
      border-radius: 99px; transition: width 0.4s cubic-bezier(.34,1.56,.64,1);
    }

    /* ── CARD SHELL ── */
    .ga-card {
      background: var(--surface,#fff); border-radius: 18px;
      border: 1.5px solid var(--border,#e2e6ea);
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      overflow: hidden;
      animation: gaCardIn 0.35s cubic-bezier(.34,1.56,.64,1);
    }
    @keyframes gaCardIn {
      from { opacity:0; transform:scale(0.95) translateY(8px); }
      to   { opacity:1; transform:scale(1) translateY(0); }
    }
    .ga-card-header {
      background: linear-gradient(135deg, #132A3F, #1e3f5c);
      padding: 1rem 1.3rem; display: flex; align-items: center; gap: 10px;
    }
    .ga-card-header-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(249,211,56,0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }
    .ga-card-header h3 { font-size: 0.95rem; font-weight: 800; color: #f9d338; font-family: 'Quicksand', sans-serif; flex:1; }
    .ga-card-header p  { font-size: 0.76rem; color: rgba(255,255,255,0.55); font-weight: 600; margin-top:2px; }
    .ga-card-body { padding: 1.2rem 1.3rem; }

    /* ── EMOJI PICKER ── */
    .ga-emoji-row {
      display: flex; gap: 10px; flex-wrap: wrap;
      justify-content: center; margin: 0.5rem 0;
    }
    .ga-emoji-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: var(--surface-alt,#f8f9fb);
      border: 2px solid var(--border,#e2e6ea);
      border-radius: 14px; padding: 12px 10px;
      cursor: pointer; transition: all 0.2s; min-width: 62px;
      font-family: 'Nunito', sans-serif;
    }
    .ga-emoji-btn .ga-em { font-size: 1.9rem; line-height:1; }
    .ga-emoji-btn .ga-lbl { font-size: 0.68rem; font-weight: 700; color: var(--text-muted,#8a97a8); }
    .ga-emoji-btn:hover { border-color: var(--teal,#4db8b8); transform: translateY(-3px) scale(1.05); box-shadow: 0 4px 14px rgba(77,184,184,0.2); }
    .ga-emoji-btn.selected { border-color: var(--teal,#4db8b8); background: rgba(77,184,184,0.12); box-shadow: 0 4px 16px rgba(77,184,184,0.25); transform: translateY(-3px) scale(1.07); }
    .ga-emoji-btn.selected .ga-lbl { color: var(--teal,#4db8b8); }

    /* ── QUESTION LABEL ── */
    .ga-q-label { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary,#5a6272); margin-bottom: 0.65rem; display: block; }
    .ga-q-sub   { font-size: 0.75rem; color: var(--text-muted,#8a97a8); margin-bottom: 0.7rem; display: block; }

    /* ── ACTIVITY CHIPS ── */
    .ga-chip-grid { display: flex; gap: 8px; flex-wrap: wrap; }
    .ga-chip {
      border: 1.5px solid var(--border,#e2e6ea);
      background: var(--surface-alt,#f8f9fb);
      color: var(--text-secondary,#5a6272);
      padding: 7px 14px; border-radius: 99px;
      font-size: 0.8rem; font-weight: 600;
      cursor: pointer; transition: all 0.18s; font-family: 'Nunito', sans-serif;
    }
    .ga-chip:hover { border-color: var(--teal,#4db8b8); color: var(--teal,#4db8b8); }
    .ga-chip.on { background: rgba(77,184,184,0.15); border-color: var(--teal,#4db8b8); color: var(--teal,#4db8b8); font-weight: 700; }

    /* ── YN BUTTONS ── */
    .ga-yn-pair { display: flex; gap: 10px; margin-bottom: 0.85rem; }
    .ga-yn-pair label { font-size: 0.82rem; font-weight: 700; color: var(--text-secondary,#5a6272); display: block; margin-bottom: 0.3rem; }
    .ga-yn-group { display: flex; flex-direction: column; gap: 0.2rem; }
    .ga-yn-btn {
      flex:1; padding: 9px 0; border-radius: 10px;
      border: 1.5px solid var(--border,#e2e6ea);
      background: var(--surface-alt,#f8f9fb);
      color: var(--text-secondary,#5a6272);
      font-size: 0.85rem; font-weight: 700; cursor: pointer;
      transition: all 0.18s; font-family: 'Nunito', sans-serif;
    }
    .ga-yn-btn:hover { border-color: var(--teal,#4db8b8); color: var(--teal,#4db8b8); }
    .ga-yn-btn.yes-active { background: #dcfce7; border-color: #22c55e; color: #16a34a; }
    .ga-yn-btn.no-active  { background: #fef2f2; border-color: #ef4444; color: #dc2626; }

    /* ── TEXTAREA ── */
    .ga-textarea {
      width: 100%; background: var(--input-bg,#f8f9fb);
      border: 1.5px solid var(--input-border,#e2e6ea);
      border-radius: 12px; padding: 0.7rem 1rem;
      font-size: 0.87rem; color: var(--text-primary,#132A3F);
      resize: vertical; font-family: 'Nunito', sans-serif;
      transition: border-color 0.2s;
    }
    .ga-textarea:focus { outline: none; border-color: var(--teal,#4db8b8); box-shadow: 0 0 0 3px rgba(77,184,184,0.15); }

    /* ── WORD CLOUD / BUBBLE PICKER ── */
    .ga-bubble-cloud { display: flex; flex-wrap: wrap; gap: 9px; justify-content: center; padding: 0.5rem 0; }
    .ga-bubble {
      padding: 9px 18px; border-radius: 99px;
      font-size: 0.82rem; font-weight: 700;
      border: 2px solid var(--border,#e2e6ea);
      background: var(--surface-alt,#f8f9fb);
      cursor: pointer; transition: all 0.22s;
      color: var(--text-secondary,#5a6272); font-family:'Nunito',sans-serif;
    }
    .ga-bubble:hover { transform: scale(1.06); border-color: var(--teal,#4db8b8); }
    .ga-bubble.picked { background: var(--teal,#4db8b8); color:#fff; border-color:var(--teal,#4db8b8); transform:scale(1.08); box-shadow:0 4px 14px rgba(77,184,184,0.3); }

    /* ── CARD FLIP ── */
    .ga-flip-deck { display: flex; flex-direction: column; gap: 10px; }
    .ga-flip-item {
      background: var(--surface-alt,#f8f9fb); border-radius: 14px;
      padding: 1rem 1.2rem; border: 1.5px solid var(--border,#e2e6ea);
      display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: all 0.2s;
    }
    .ga-flip-item:hover { border-color: var(--teal,#4db8b8); box-shadow: 0 3px 12px rgba(77,184,184,0.15); }
    .ga-flip-item .ga-flip-icon { font-size: 1.5rem; flex-shrink:0; }
    .ga-flip-item .ga-flip-text { flex:1; font-size:0.84rem; font-weight:700; color:var(--text-secondary,#5a6272); }
    .ga-flip-item .ga-flip-check {
      width:22px; height:22px; border-radius:50%;
      border:2px solid var(--border,#e2e6ea);
      display:flex; align-items:center; justify-content:center;
      font-size:0.75rem; color:transparent; transition:all 0.2s; flex-shrink:0;
    }
    .ga-flip-item.checked { border-color:var(--teal,#4db8b8); background:rgba(77,184,184,0.08); }
    .ga-flip-item.checked .ga-flip-check { background:var(--teal,#4db8b8); border-color:var(--teal,#4db8b8); color:#fff; }

    /* ── NAV BUTTONS ── */
    .ga-nav { display:flex; gap:10px; margin-top:0.5rem; }
    .ga-btn-next {
      flex:1; padding:0.82rem; border:none; border-radius:12px;
      background: linear-gradient(135deg,var(--teal,#4db8b8),#2d9aad);
      color:#fff; font-size:0.92rem; font-weight:800;
      cursor:pointer; transition: all 0.2s; font-family:'Nunito',sans-serif;
      display:flex; align-items:center; justify-content:center; gap:8px;
    }
    .ga-btn-next:hover { filter:brightness(1.08); transform:translateY(-2px); box-shadow:0 6px 18px rgba(77,184,184,0.35); }
    .ga-btn-back {
      padding:0.82rem 1.2rem; border:1.5px solid var(--border,#e2e6ea);
      border-radius:12px; background:transparent;
      color:var(--text-secondary,#5a6272); font-size:0.88rem; font-weight:700;
      cursor:pointer; transition:all 0.18s; font-family:'Nunito',sans-serif;
    }
    .ga-btn-back:hover { border-color:var(--teal,#4db8b8); color:var(--teal,#4db8b8); }

    /* ── XP / STREAK ── */
    .ga-xp-bar-wrap {
      background:var(--surface,#fff); border-radius:14px;
      border:1.5px solid var(--border,#e2e6ea);
      padding:0.85rem 1.2rem;
      display:flex; align-items:center; gap:12px;
    }
    .ga-xp-icon { font-size:1.6rem; flex-shrink:0; }
    .ga-xp-info { flex:1; }
    .ga-xp-label { font-size:0.75rem; font-weight:700; color:var(--text-muted,#8a97a8); }
    .ga-xp-track { height:8px; background:var(--border,#e2e6ea); border-radius:99px; margin-top:5px; overflow:hidden; }
    .ga-xp-fill { height:100%; background:linear-gradient(90deg,#f9a825,#f9d338); border-radius:99px; transition:width 0.6s cubic-bezier(.34,1.56,.64,1); }
    .ga-streak { font-size:0.85rem; font-weight:800; color:#f9a825; text-align:right; }
    .ga-streak span { display:block; font-size:0.7rem; color:var(--text-muted,#8a97a8); font-weight:600; }

    /* ── COMPLETION SCREEN ── */
    .ga-complete { text-align:center; padding:2.5rem 1.5rem; animation: gaFadeIn 0.5s ease; }
    .ga-complete-emoji { font-size:4rem; margin-bottom:0.75rem; animation:gaComplete 0.6s cubic-bezier(.34,1.56,.64,1); }
    @keyframes gaComplete { from{transform:scale(0)} to{transform:scale(1)} }
    .ga-complete h2 { font-size:1.5rem; font-weight:800; color:var(--text-primary,#132A3F); font-family:'Quicksand',sans-serif; margin-bottom:0.5rem; }
    .ga-complete p  { font-size:0.88rem; color:var(--text-muted,#8a97a8); font-weight:600; }
    .ga-complete-xp { display:inline-block; background:linear-gradient(135deg,#f9a825,#f9d338); color:#132A3F; padding:6px 20px; border-radius:99px; font-weight:800; font-size:0.9rem; margin-top:1rem; }

    /* ── BUDDY MESSAGE ── */
    .ga-buddy-msg {
      background: var(--surface, #fff);
      border: 1.5px solid var(--border, #e2e6ea);
      border-radius: 16px; padding: 1rem 1.2rem;
      display: flex; gap: 12px; align-items: flex-start;
      margin-top: 1rem;
      animation: gaFadeIn 0.4s ease;
    }
    .ga-buddy-avatar {
      width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--teal,#4db8b8), #2d9aad);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
    }
    .ga-buddy-text { font-size: 0.84rem; font-weight: 600; color: var(--text-secondary, #5a6272); line-height: 1.6; flex: 1; }
    .ga-buddy-typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
    .ga-buddy-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--teal, #4db8b8); animation: gaTyping 1s infinite; }
    .ga-buddy-dot:nth-child(2) { animation-delay: 0.2s; }
    .ga-buddy-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes gaTyping { 0%,80%,100% { opacity:0.3; transform:scale(0.9); } 40% { opacity:1; transform:scale(1.2); } }

    /* ── CONFETTI ── */
    .ga-confetti-wrap { position:relative; overflow:hidden; }
    .ga-confetti-piece { position:absolute; width:8px; height:8px; border-radius:2px; animation: gaConf 1.2s ease forwards; opacity:0; }
    @keyframes gaConf { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(80px) rotate(360deg); } }

    /* ── SUBMITTED BANNER ── */
    .ga-submitted-banner {
      background: linear-gradient(135deg, #f0fdf4, #dcfce7);
      border: 1.5px solid #22c55e; border-radius: 16px;
      padding: 1.5rem 1.5rem; text-align:center;
    }
    .ga-submitted-banner .ga-sub-icon { font-size:2.5rem; margin-bottom:0.5rem; }
    .ga-submitted-banner h3 { font-size:1.1rem; font-weight:800; color:#15803d; font-family:'Quicksand',sans-serif; }
    .ga-submitted-banner p  { font-size:0.82rem; color:#166534; font-weight:600; margin-top:0.3rem; }

    [data-theme="dark"] .ga-card          { background:var(--surface,#1a2535); border-color:#2d3748; }
    [data-theme="dark"] .ga-emoji-btn     { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .ga-chip          { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .ga-bubble        { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .ga-flip-item     { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .ga-textarea      { background:#1e2d3d; border-color:#2d3748; color:#e5e7eb; }
    [data-theme="dark"] .ga-xp-bar-wrap   { background:#1a2535; border-color:#2d3748; }
    [data-theme="dark"] .ga-submitted-banner { background: #052e16; border-color:#16a34a; }
    [data-theme="dark"] .ga-submitted-banner h3 { color:#4ade80; }
    [data-theme="dark"] .ga-submitted-banner p  { color:#86efac; }
    [data-theme="dark"] .ga-mode-card     { background:#1a2535; border-color:#2d3748; }
    [data-theme="dark"] .ga-mode-card:hover { border-color:var(--teal,#4db8b8); }
    [data-theme="dark"] .ga-mode-card.selected { background:rgba(77,184,184,0.12); }
    [data-theme="dark"] .ga-mode-card-icon { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .ga-mode-featured  { background: linear-gradient(135deg, #0d1f2f 0%, #132A3F 100%); }
    [data-theme="dark"] .ga-mode-picker-eyebrow { background:rgba(77,184,184,0.1); }
    [data-theme="dark"] .ga-light-card    { background:#0c2a3a; border-color:#0369a1; }
    [data-theme="dark"] .ga-light-card h3 { color:#38bdf8; }
    [data-theme="dark"] .ga-light-card p  { color:#7dd3fc; }
    [data-theme="dark"] .ga-crisis-banner { background:#2d1414; border-color:#991b1b; }
    [data-theme="dark"] .ga-buddy-msg     { background:#1a2535; border-color:#2d3748; }
  `;
  document.head.appendChild(s);
}

// ── HELPERS ───────────────────────────────────────────────────
function emojiPicker(items, answerKey, label, sub) {
  return `
    <div style="margin-bottom:1.1rem;">
      <span class="ga-q-label">${label}</span>
      ${sub ? `<span class="ga-q-sub">${sub}</span>` : ''}
      <div class="ga-emoji-row" data-key="${answerKey}">
        ${items.map(it => `
          <button type="button" class="ga-emoji-btn" data-val="${it.value}" data-key="${answerKey}">
            <span class="ga-em">${it.emoji}</span>
            <span class="ga-lbl">${it.label}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function bindEmojiPicker(container, key) {
  container.querySelectorAll(`.ga-emoji-btn[data-key="${key}"]`).forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll(`.ga-emoji-btn[data-key="${key}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      answers[key] = Number(btn.dataset.val);
    });
  });
}

function ynRow(questionText, key) {
  return `
    <div class="ga-yn-group" style="margin-bottom:1rem;">
      <label style="font-size:0.82rem;font-weight:700;color:var(--text-secondary);margin-bottom:6px;display:block;">${questionText}</label>
      <div class="ga-yn-pair">
        <button type="button" class="ga-yn-btn" data-yn-key="${key}" data-yn-val="yes">✓ Yes</button>
        <button type="button" class="ga-yn-btn" data-yn-key="${key}" data-yn-val="no">✗ No</button>
      </div>
    </div>`;
}

function bindYN(container) {
  container.querySelectorAll('.ga-yn-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.ynKey;
      container.querySelectorAll(`.ga-yn-btn[data-yn-key="${key}"]`).forEach(b => {
        b.classList.remove('yes-active','no-active');
      });
      const isYes = btn.dataset.ynVal === 'yes';
      btn.classList.add(isYes ? 'yes-active' : 'no-active');
      answers[key] = btn.dataset.ynVal;
    });
  });
}

async function getStreak() {
  if (!studentId) return { streak: 0, xp: 0 };
  const { data } = await supabase
    .from('checkins').select('submitted_at')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(30);
  if (!data?.length) return { streak: 0, xp: 0 };
  const dates = [...new Set(data.map(c => c.submitted_at.slice(0,10)))].sort().reverse();
  let streak = 0;
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - (i + 1));
    if (dates[i] === expected.toISOString().slice(0,10)) streak++;
    else break;
  }
  return { streak, xp: Math.min(streak * 20, 100) };
}

// ── MODE DEFINITIONS ──────────────────────────────────────────
const MODE_DEFS = [
  {
    id: 0,
    label: 'Emoji Mode',
    icon: '😊',
    desc: 'Pick emojis to express how you feel. Quick and visual.',
    badge: '~2 min',
    badgeClass: 'badge-teal',
  },
  {
    id: 1,
    label: 'Word Cloud',
    icon: '🫧',
    desc: 'Tap feeling-words that match your day. Great if you\'re unsure how to explain.',
    badge: '~3 min',
    badgeClass: 'badge-teal',
  },
  {
    id: 2,
    label: 'Win Tracker',
    icon: '🏆',
    desc: 'Check off small victories from your day. Every win counts!',
    badge: '~3 min',
    badgeClass: 'badge-yellow',
  },
  {
    id: 3,
    label: 'Story Mode',
    icon: '📖',
    desc: 'Describe your day through short narrative prompts.',
    badge: '~4 min',
    badgeClass: 'badge-yellow',
  },
  {
    id: 4,
    label: 'Quick-fire',
    icon: '⚡',
    desc: 'Fast gut-check answers. Ideal when you\'re short on time.',
    badge: '~1 min',
    badgeClass: '',
  },
  {
    id: 'light',
    label: 'Light Check-in',
    icon: '🌤️',
    desc: 'Just 3 questions. Choose this on harder days — showing up still counts.',
    badge: 'For tough days',
    badgeClass: 'badge-red',
  },
];

// ── MODE PICKER SCREEN ────────────────────────────────────────
function renderModePicker(container, onSelect) {
  // Separate light mode from the regular modes
  const regularModes = MODE_DEFS.filter(m => m.id !== 'light');
  const lightMode    = MODE_DEFS.find(m => m.id === 'light');

  container.innerHTML = `
    <div class="ga-mode-picker">
      <div class="ga-mode-picker-header">
        <div class="ga-mode-picker-eyebrow">✨ Daily Check-in</div>
        <div class="ga-mode-picker-title">How do you want to check in today?</div>
        <div class="ga-mode-picker-sub">Pick whatever feels right — you can choose a different style tomorrow.</div>
      </div>

      <!-- Regular modes grid -->
      <div>
        <div class="ga-mode-section-label" style="margin-bottom:0.6rem;">Choose your style</div>
        <div class="ga-mode-grid">
          ${regularModes.map(m => `
            <button type="button" class="ga-mode-card" data-mode="${m.id}">
              <div class="ga-mode-card-icon">${m.icon}</div>
              <div class="ga-mode-card-name">${m.label}</div>
              <div class="ga-mode-card-desc">${m.desc}</div>
              <div class="ga-mode-card-badge ${m.badgeClass}">⏱ ${m.badge}</div>
            </button>`).join('')}
        </div>
      </div>

      <!-- Light mode featured card -->
      <div>
        <div class="ga-mode-section-label" style="margin-bottom:0.6rem;">Having a tough day?</div>
        <button type="button" class="ga-mode-featured" data-mode="light">
          <div class="ga-mode-featured-icon">${lightMode.icon}</div>
          <div class="ga-mode-featured-content">
            <div class="ga-mode-featured-name">${lightMode.label}</div>
            <div class="ga-mode-featured-desc">${lightMode.desc}</div>
            <div class="ga-mode-featured-pill">💛 For tough days</div>
          </div>
          <div class="ga-mode-featured-arrow">→</div>
        </button>
      </div>
    </div>`;

  // Bind all cards (regular + featured)
  container.querySelectorAll('.ga-mode-card, .ga-mode-featured').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.ga-mode-card').forEach(c => c.classList.remove('selected'));
      if (card.classList.contains('ga-mode-card')) card.classList.add('selected');
      const mode = card.dataset.mode === 'light' ? 'light' : Number(card.dataset.mode);
      setTimeout(() => onSelect(mode), 200);
    });
  });
}

// ── LIGHT MODE (short check-in for hard days) ─────────────────
function renderLightMode(container, { streak, xp }) {
  const name = sessionStorage.getItem('userName')?.split(' ')[0] || 'there';

  container.innerHTML = `
    <div class="ga-wrapper">
      <div class="ga-xp-bar-wrap">
        <div class="ga-xp-icon">🔥</div>
        <div class="ga-xp-info">
          <div class="ga-xp-label">Streak XP</div>
          <div class="ga-xp-track"><div class="ga-xp-fill" style="width:${xp}%"></div></div>
        </div>
        <div class="ga-streak">${streak} day${streak !== 1 ? 's' : ''} <span>streak</span></div>
      </div>

      <div class="ga-light-card">
        <h3>🌤️ Light Check-in — you're doing great just by being here</h3>
        <p>Hey ${name}, just three questions today. No pressure, no judgment.</p>

        <div style="display:flex;flex-direction:column;gap:1.1rem;">
          ${emojiPicker(MOODS, 'mood_rating', 'How are you feeling right now?', null)}

          <div class="ga-yn-group">
            <label style="font-size:0.82rem;font-weight:700;color:var(--text-secondary);margin-bottom:6px;display:block;">Did you feel safe today?</label>
            <div class="ga-yn-pair">
              <button type="button" class="ga-yn-btn" data-yn-key="felt_safe" data-yn-val="yes">✓ Yes</button>
              <button type="button" class="ga-yn-btn" data-yn-key="felt_safe" data-yn-val="no">✗ No</button>
            </div>
          </div>

          <div>
            <label class="ga-q-label">Anything you want to share? <span style="color:var(--text-muted);font-weight:500;">(optional)</span></label>
            <textarea class="ga-textarea" id="gaLightNotes" rows="3" placeholder="You don't have to. But if you want to, we're listening 💛"></textarea>
          </div>
        </div>
      </div>

      <div id="gaCrisisBanner" style="display:none;" class="ga-crisis-banner">
        <div class="ga-crisis-banner-top">
          <div class="ga-crisis-banner-icon">💛</div>
          <div class="ga-crisis-banner-title">You're not alone — a counselor is here for you</div>
        </div>
        <div class="ga-crisis-banner-body">
          It sounds like today has been really tough. You don't have to carry this by yourself. 
          Your school counselor can see your check-in and is ready to support you.
        </div>
        <button class="ga-crisis-btn" onclick="window.location.href='3studentcontact.html'">
          <i class="fa-solid fa-comments"></i> Talk to a Counselor Now
        </button>
      </div>

      <div class="ga-nav">
        <button type="button" class="ga-btn-back" id="gaLightBack">← Change Mode</button>
        <button type="button" class="ga-btn-next" id="gaLightSubmit">
          <i class="fa-solid fa-circle-check"></i> Save Check-in
        </button>
      </div>
    </div>`;

  bindEmojiPicker(container, 'mood_rating');
  bindYN(container);

  // Show crisis banner if mood is really low or felt unsafe
  const checkCrisis = () => {
    const showBanner = answers.mood_rating <= 2 || answers.felt_safe === 'no';
    document.getElementById('gaCrisisBanner').style.display = showBanner ? 'flex' : 'none';
    document.getElementById('gaCrisisBanner').style.flexDirection = showBanner ? 'column' : 'none';
  };

  container.querySelectorAll('.ga-emoji-btn[data-key="mood_rating"]').forEach(btn => {
    btn.addEventListener('click', checkCrisis);
  });
  container.querySelectorAll('.ga-yn-btn[data-yn-key="felt_safe"]').forEach(btn => {
    btn.addEventListener('click', checkCrisis);
  });

  document.getElementById('gaLightBack').addEventListener('click', () => {
    renderAssessment(container);
  });

  document.getElementById('gaLightSubmit').addEventListener('click', async () => {
    answers.notes = document.getElementById('gaLightNotes')?.value?.trim() || null;
    // Fill in safe defaults for unanswered fields
    answers.stress_level = answers.stress_level || 5;
    answers.sleep_quality = answers.sleep_quality || 5;
    answers.academic_pressure = answers.academic_pressure || 5;
    answers.social_wellbeing = answers.social_wellbeing || 5;
    await submit(container, true);
  });
}

// ── STEP MODES ────────────────────────────────────────────────
function buildSteps(mode) {
  if (mode === 0) return stepsEmojiFirst();
  if (mode === 1) return stepsBubbleCloud();
  if (mode === 2) return stepsCardFlip();
  if (mode === 3) return stepsStoryMode();
  return stepsQuickFire();
}

// MODE 0: Classic emoji selectors
function stepsEmojiFirst() {
  return [
    {
      title: 'How are you feeling?',
      icon: '💭',
      hint: 'Pick the emoji that matches your mood right now',
      html: () => `
        ${emojiPicker(MOODS, 'mood_rating', 'Overall Mood', null)}
        ${emojiPicker(STRESS, 'stress_level', 'Stress Level', null)}`,
      bind: (c) => { bindEmojiPicker(c,'mood_rating'); bindEmojiPicker(c,'stress_level'); },
    },
    {
      title: 'Mind & Body',
      icon: '🌙',
      hint: 'How did your body do today?',
      html: () => `
        ${emojiPicker(SLEEP, 'sleep_quality', 'Sleep Quality', 'How well did you sleep last night?')}
        ${emojiPicker(SOCIAL, 'social_wellbeing', 'Social Wellbeing', 'How connected did you feel today?')}`,
      bind: (c) => { bindEmojiPicker(c,'sleep_quality'); bindEmojiPicker(c,'social_wellbeing'); },
    },
    {
      title: 'School Check',
      icon: '📚',
      hint: 'Academic pressure and quick yes/no',
      html: () => `
        ${emojiPicker(ACADEMIC,'academic_pressure','Academic Pressure','How heavy was the workload?')}
        <div style="margin-top:1rem;">
          ${ynRow('Did you eat regular meals today?','ate_meals')}
          ${ynRow('Did you feel safe today?','felt_safe')}
          ${ynRow('Are you feeling overwhelmed right now?','overwhelmed')}
        </div>`,
      bind: (c) => { bindEmojiPicker(c,'academic_pressure'); bindYN(c); },
    },
    {
      title: 'What helped today?',
      icon: '✨',
      hint: 'Tap everything you did (multi-select)',
      html: () => `
        <div class="ga-chip-grid" id="activityChips">
          ${['🏃 Exercise','📓 Journaling','🎵 Music','📚 Reading','🧘 Meditation','🎨 Art/Creative','💬 Talked to someone','🌿 Time outside','🎮 Gaming','🍳 Cooked something','😴 Napped'].map(a =>
            `<button type="button" class="ga-chip" data-act="${a}">${a}</button>`
          ).join('')}
        </div>
        <div style="margin-top:1.2rem;">
          <label class="ga-q-label">Anything else on your mind? <span style="color:var(--text-muted);font-weight:500;">(optional)</span></label>
          <textarea class="ga-textarea" id="gaNotes" rows="3" placeholder="Write whatever you want here..."></textarea>
        </div>`,
      bind: (c) => {
        c.querySelectorAll('.ga-chip').forEach(ch => {
          ch.addEventListener('click', () => ch.classList.toggle('on'));
        });
      },
      collect: (c) => {
        answers.activities = [...c.querySelectorAll('.ga-chip.on')].map(b=>b.dataset.act).join(', ');
        answers.notes = c.querySelector('#gaNotes')?.value?.trim() || null;
      },
    },
  ];
}

// MODE 1: Bubble cloud word-picker
function stepsBubbleCloud() {
  const feelingWords = ['Anxious','Tired','Hopeful','Stressed','Calm','Happy','Lonely','Motivated','Sad','Excited','Overwhelmed','Okay','Grateful','Numb','Focused','Burned out','Content','Irritable','Confident','Lost'];
  const copingWords  = ['Deep breaths','Called a friend','Listened to music','Went for a walk','Journaled','Watched something','Cried it out','Napped','Meditated','Just kept going','Ate comfort food','Talked to family'];

  return [
    {
      title: 'What words describe your day?',
      icon: '🫧',
      hint: 'Tap all that apply — no judgment!',
      html: () => `
        <span class="ga-q-sub">Pick as many as feel true right now</span>
        <div class="ga-bubble-cloud" id="feelBubbles">
          ${feelingWords.map(w=>`<button type="button" class="ga-bubble" data-word="${w}">${w}</button>`).join('')}
        </div>`,
      bind: (c) => {
        c.querySelectorAll('#feelBubbles .ga-bubble').forEach(b => {
          b.addEventListener('click', () => b.classList.toggle('picked'));
        });
      },
      collect: (c) => {
        const picked = [...c.querySelectorAll('#feelBubbles .ga-bubble.picked')].map(b=>b.dataset.word);
        const negWords = ['Anxious','Stressed','Lonely','Sad','Overwhelmed','Burned out','Irritable','Lost','Numb'];
        const posWords = ['Hopeful','Calm','Happy','Motivated','Excited','Grateful','Focused','Content','Confident'];
        const negCount = picked.filter(w=>negWords.includes(w)).length;
        const posCount = picked.filter(w=>posWords.includes(w)).length;
        answers.mood_rating = Math.max(1, Math.min(10, 5 + posCount - negCount));
        answers.notes = picked.length ? 'Feelings: ' + picked.join(', ') : null;
      },
    },
    {
      title: 'Rate the big stuff',
      icon: '📊',
      hint: 'Quick emoji checks',
      html: () => `
        ${emojiPicker(STRESS,'stress_level','Stress Today',null)}
        ${emojiPicker(SLEEP,'sleep_quality','Sleep Quality',null)}
        ${emojiPicker(ACADEMIC,'academic_pressure','Academic Load',null)}`,
      bind: (c) => { bindEmojiPicker(c,'stress_level'); bindEmojiPicker(c,'sleep_quality'); bindEmojiPicker(c,'academic_pressure'); },
    },
    {
      title: 'How did you cope?',
      icon: '🛡️',
      hint: 'What helped you get through today?',
      html: () => `
        <div class="ga-bubble-cloud" id="copeBubbles">
          ${copingWords.map(w=>`<button type="button" class="ga-bubble" data-word="${w}">${w}</button>`).join('')}
        </div>`,
      bind: (c) => {
        c.querySelectorAll('#copeBubbles .ga-bubble').forEach(b => {
          b.addEventListener('click', () => b.classList.toggle('picked'));
        });
      },
      collect: (c) => {
        const picked = [...c.querySelectorAll('#copeBubbles .ga-bubble.picked')].map(b=>b.dataset.word);
        if (picked.length) answers.activities = picked.join(', ');
      },
    },
    {
      title: 'Quick check-in',
      icon: '✅',
      hint: 'A few yes/no questions',
      html: () => `
        ${ynRow('Did you eat today?','ate_meals')}
        ${ynRow('Did you get enough sleep?','slept_enough')}
        ${ynRow('Did you connect with someone?','connected')}
        ${ynRow('Feeling overwhelmed?','overwhelmed')}
        <div style="margin-top:1rem;">
          <label class="ga-q-label">Anything you want your counselor to know? <span style="color:var(--text-muted);font-weight:500;">(optional)</span></label>
          <textarea class="ga-textarea" id="gaNotes" rows="3" placeholder="You don't have to share, but you can..."></textarea>
        </div>`,
      bind: (c) => { bindYN(c); },
      collect: (c) => {
        const t = c.querySelector('#gaNotes')?.value?.trim();
        if (t) answers.therapist_q1 = t;
      },
    },
  ];
}

// MODE 2: Checklist / card-flip style
function stepsCardFlip() {
  const WIN_ITEMS = [
    { icon:'📝', text:'Finished an assignment or task' },
    { icon:'💬', text:'Had a real conversation with someone' },
    { icon:'🌅', text:'Got out of bed despite not wanting to' },
    { icon:'🍽️', text:'Ate at least one proper meal' },
    { icon:'🚶', text:'Moved your body in some way' },
    { icon:'💧', text:'Stayed hydrated' },
    { icon:'📵', text:'Had screen-free time' },
    { icon:'😤', text:'Handled something stressful' },
    { icon:'💤', text:'Got to sleep at a decent time' },
    { icon:'🧹', text:'Did something around the house' },
    { icon:'🎯', text:'Stayed focused for a study session' },
    { icon:'🌿', text:'Spent time outside' },
  ];

  return [
    {
      title: "Today's Wins",
      icon: '🏆',
      hint: 'Check off everything you did today — even the small stuff counts!',
      html: () => `
        <div class="ga-flip-deck" id="winDeck">
          ${WIN_ITEMS.map((it,i)=>`
            <div class="ga-flip-item" data-idx="${i}">
              <span class="ga-flip-icon">${it.icon}</span>
              <span class="ga-flip-text">${it.text}</span>
              <span class="ga-flip-check"><i class="fa-solid fa-check" style="font-size:0.7rem;"></i></span>
            </div>`).join('')}
        </div>`,
      bind: (c) => {
        c.querySelectorAll('.ga-flip-item').forEach(item => {
          item.addEventListener('click', () => item.classList.toggle('checked'));
        });
      },
      collect: (c) => {
        const checked = [...c.querySelectorAll('.ga-flip-item.checked')].map(i => WIN_ITEMS[i.dataset.idx].text);
        answers.activities = checked.join(', ');
        const count = checked.length;
        answers.mood_rating = Math.max(1, Math.min(10, 3 + count));
      },
    },
    {
      title: 'Quick Ratings',
      icon: '⚡',
      hint: 'Emoji-quick answers',
      html: () => `
        ${emojiPicker(STRESS,'stress_level','Stress Level',null)}
        ${emojiPicker(SLEEP,'sleep_quality','Sleep Last Night',null)}`,
      bind: (c) => { bindEmojiPicker(c,'stress_level'); bindEmojiPicker(c,'sleep_quality'); },
    },
    {
      title: 'Safety Check',
      icon: '🛡️',
      hint: 'These help your counselor support you better',
      html: () => `
        ${ynRow('Did you feel safe today?','felt_safe')}
        ${ynRow('Did you eat today?','ate_meals')}
        ${ynRow('Did you connect with anyone?','connected')}
        ${ynRow('Feeling overwhelmed?','overwhelmed')}
        ${emojiPicker(SOCIAL,'social_wellbeing','How connected did you feel?',null)}`,
      bind: (c) => { bindYN(c); bindEmojiPicker(c,'social_wellbeing'); },
    },
    {
      title: 'One thing',
      icon: '💬',
      hint: 'Optional but really helpful for your counselor',
      html: () => `
        <label class="ga-q-label">What felt heaviest today?</label>
        <textarea class="ga-textarea" id="gaQ1" rows="3" placeholder="You can be honest here..."></textarea>
        <label class="ga-q-label" style="margin-top:1rem;">What's one thing that helped, even a little?</label>
        <textarea class="ga-textarea" id="gaQ2" rows="3" placeholder="Even tiny things count..."></textarea>`,
      bind: () => {},
      collect: (c) => {
        answers.therapist_q1 = c.querySelector('#gaQ1')?.value?.trim() || null;
        answers.therapist_q2 = c.querySelector('#gaQ2')?.value?.trim() || null;
      },
    },
  ];
}

// MODE 3: Story / narrative mode
function stepsStoryMode() {
  const name = sessionStorage.getItem('userName')?.split(' ')[0] || 'there';
  return [
    {
      title: `Hey ${name}, tell me about your day`,
      icon: '📖',
      hint: 'Pick the sentence that fits best',
      html: () => `
        <span class="ga-q-sub">Tap the one that sounds most like your day</span>
        <div class="ga-flip-deck" id="storyPick">
          ${[
            { icon:'🌟', text:'Today was honestly pretty good. I felt on top of things.', mood:8, stress:3 },
            { icon:'😐', text:'It was just an ordinary day — not great, not terrible.', mood:5, stress:5 },
            { icon:'🌧️', text:"Today was rough. I was struggling more than usual.", mood:3, stress:7 },
            { icon:'🎢', text:"It was a rollercoaster — good moments and rough ones.", mood:5, stress:6 },
            { icon:'😶', text:"I'm not even sure how today was. I just got through it.", mood:4, stress:6 },
          ].map((it,i)=>`
            <div class="ga-flip-item" data-idx="${i}" data-mood="${it.mood}" data-stress="${it.stress}">
              <span class="ga-flip-icon">${it.icon}</span>
              <span class="ga-flip-text">${it.text}</span>
              <span class="ga-flip-check" style="display:none;"></span>
            </div>`).join('')}
        </div>`,
      bind: (c) => {
        c.querySelectorAll('#storyPick .ga-flip-item').forEach(item => {
          item.addEventListener('click', () => {
            c.querySelectorAll('#storyPick .ga-flip-item').forEach(i => i.classList.remove('checked'));
            item.classList.add('checked');
            answers.mood_rating  = Number(item.dataset.mood);
            answers.stress_level = Number(item.dataset.stress);
          });
        });
      },
    },
    {
      title: 'The details',
      icon: '🔍',
      hint: "Let's fill in a bit more",
      html: () => `
        ${emojiPicker(SLEEP,'sleep_quality','Sleep last night?',null)}
        ${emojiPicker(ACADEMIC,'academic_pressure','How heavy was school?',null)}
        ${emojiPicker(SOCIAL,'social_wellbeing','How connected did you feel?',null)}`,
      bind: (c) => { bindEmojiPicker(c,'sleep_quality'); bindEmojiPicker(c,'academic_pressure'); bindEmojiPicker(c,'social_wellbeing'); },
    },
    {
      title: 'Quick safety check',
      icon: '💛',
      hint: 'Just a few yes/no questions',
      html: () => `
        ${ynRow('Did you eat today?','ate_meals')}
        ${ynRow('Did you feel safe?','felt_safe')}
        ${ynRow('Did you get enough sleep?','slept_enough')}
        ${ynRow('Feeling overwhelmed right now?','overwhelmed')}`,
      bind: (c) => { bindYN(c); },
    },
    {
      title: 'Finish the story',
      icon: '✍️',
      hint: 'Write as much or as little as you want',
      html: () => `
        <label class="ga-q-label">If today were a chapter in a book, what would the title be?</label>
        <textarea class="ga-textarea" id="gaStoryTitle" rows="2" placeholder='e.g. "The Day I Almost Gave Up But Didn\'t"'></textarea>
        <label class="ga-q-label" style="margin-top:1rem;">What do you hope tomorrow's chapter looks like?</label>
        <textarea class="ga-textarea" id="gaStorytomorrow" rows="3" placeholder="It can be a small wish or a big one..."></textarea>`,
      bind: () => {},
      collect: (c) => {
        const t1 = c.querySelector('#gaStoryTitle')?.value?.trim();
        const t2 = c.querySelector('#gaStorytomorrow')?.value?.trim();
        answers.notes        = t1 ? `Today: "${t1}"` : null;
        answers.therapist_q3 = t2 || null;
      },
    },
  ];
}

// MODE 4: Quick-fire speed round
function stepsQuickFire() {
  return [
    {
      title: '⚡ Quick-fire round!',
      icon: '🎯',
      hint: 'Fast answers, no overthinking — just go with your gut!',
      html: () => `
        ${emojiPicker(MOODS,'mood_rating','Mood right now?',null)}
        ${emojiPicker(STRESS,'stress_level','Stress level?',null)}`,
      bind: (c) => { bindEmojiPicker(c,'mood_rating'); bindEmojiPicker(c,'stress_level'); },
    },
    {
      title: 'Round 2!',
      icon: '🚀',
      hint: 'Keep going, almost there!',
      html: () => `
        ${emojiPicker(SLEEP,'sleep_quality','Sleep quality?',null)}
        ${emojiPicker(ACADEMIC,'academic_pressure','School pressure?',null)}
        ${emojiPicker(SOCIAL,'social_wellbeing','Social vibes?',null)}`,
      bind: (c) => { bindEmojiPicker(c,'sleep_quality'); bindEmojiPicker(c,'academic_pressure'); bindEmojiPicker(c,'social_wellbeing'); },
    },
    {
      title: 'Yes or no — go!',
      icon: '🏁',
      hint: "Speed round — just tap your answer!",
      html: () => `
        ${ynRow('Ate today?','ate_meals')}
        ${ynRow('Slept enough?','slept_enough')}
        ${ynRow('Felt safe?','felt_safe')}
        ${ynRow('Connected with someone?','connected')}
        ${ynRow('Overwhelmed right now?','overwhelmed')}`,
      bind: (c) => { bindYN(c); },
    },
    {
      title: 'Last one!',
      icon: '🎉',
      hint: 'Optional — share if you want',
      html: () => `
        <label class="ga-q-label">What activities helped you today? (tap all that apply)</label>
        <div class="ga-chip-grid" id="activityChips" style="margin-bottom:1.2rem;">
          ${['🏃 Exercise','📓 Journaling','🎵 Music','📚 Reading','🧘 Meditation','🎨 Art','💬 Talked it out','🌿 Outdoors','🎮 Gaming','😴 Rested'].map(a=>
            `<button type="button" class="ga-chip" data-act="${a}">${a}</button>`
          ).join('')}
        </div>
        <label class="ga-q-label">Anything you want to say? <span style="color:var(--text-muted);font-weight:500;">(optional)</span></label>
        <textarea class="ga-textarea" id="gaNotes" rows="3" placeholder="You did great getting this far 💛"></textarea>`,
      bind: (c) => {
        c.querySelectorAll('.ga-chip').forEach(ch => ch.addEventListener('click',()=>ch.classList.toggle('on')));
      },
      collect: (c) => {
        answers.activities = [...c.querySelectorAll('.ga-chip.on')].map(b=>b.dataset.act).join(', ');
        answers.notes = c.querySelector('#gaNotes')?.value?.trim() || null;
      },
    },
  ];
}

// ── STEP RUNNER ───────────────────────────────────────────────
function runSteps(container, mode, { streak, xp }) {
  const steps = buildSteps(mode);
  const modeDef = MODE_DEFS.find(m => m.id === mode) || MODE_DEFS[0];
  let currentStep = 0;

  function render() {
    const step     = steps[currentStep];
    const isLast   = currentStep === steps.length - 1;
    const progress = Math.round((currentStep / steps.length) * 100);

    container.innerHTML = `
      <div class="ga-wrapper">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <div class="ga-mode-badge">${modeDef.icon} ${modeDef.label}</div>
          <div class="ga-steps">
            ${steps.map((_,i)=>`<div class="ga-step-dot ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}"></div>`).join('')}
          </div>
        </div>

        <div class="ga-xp-bar-wrap">
          <div class="ga-xp-icon">🔥</div>
          <div class="ga-xp-info">
            <div class="ga-xp-label">Streak XP</div>
            <div class="ga-xp-track"><div class="ga-xp-fill" style="width:${xp}%"></div></div>
          </div>
          <div class="ga-streak">${streak} day${streak !== 1 ? 's' : ''} <span>streak</span></div>
        </div>

        <div class="ga-progress-bar-wrap"><div class="ga-progress-bar" style="width:${progress}%"></div></div>

        <div class="ga-card">
          <div class="ga-card-header">
            <div class="ga-card-header-icon">${step.icon}</div>
            <div>
              <h3>${step.title}</h3>
              <p>${step.hint}</p>
            </div>
          </div>
          <div class="ga-card-body" id="gaStepBody">
            ${step.html()}
          </div>
        </div>

        <div class="ga-nav">
          <button type="button" class="ga-btn-back" id="gaBack">${currentStep === 0 ? '← Change Mode' : '← Back'}</button>
          <button type="button" class="ga-btn-next" id="gaNext">
            ${isLast ? '<i class="fa-solid fa-circle-check"></i> Save Check-in' : 'Next <i class="fa-solid fa-arrow-right"></i>'}
          </button>
        </div>
      </div>`;

    const body = document.getElementById('gaStepBody');
    step.bind(body);

    document.getElementById('gaBack').addEventListener('click', () => {
      if (currentStep === 0) {
        renderAssessment(container); // go back to mode picker
      } else {
        currentStep--;
        render();
        container.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });

    document.getElementById('gaNext').addEventListener('click', async () => {
      if (step.collect) step.collect(body);
      if (isLast) {
        await submit(container, false);
      } else {
        currentStep++;
        render();
        container.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  }

  render();
}

// ── MAIN RENDER ───────────────────────────────────────────────
async function renderAssessment(container) {
  injectGameStyles();

  // Already submitted?
  const done = await checkAlreadySubmitted();
  if (done) {
    container.innerHTML = `
      <div class="ga-submitted-banner">
        <div class="ga-sub-icon">🎉</div>
        <h3>You're all done for today!</h3>
        <p>Your check-in is saved. Come back tomorrow — Buddy will be waiting 💛</p>
      </div>`;
    return;
  }

  const { streak, xp } = await getStreak();

  // Show mode picker — let the student choose
  renderModePicker(container, (selectedMode) => {
    if (selectedMode === 'light') {
      renderLightMode(container, { streak, xp });
    } else {
      runSteps(container, selectedMode, { streak, xp });
    }
  });
}

// ── SUBMIT ────────────────────────────────────────────────────
async function submit(container, isLightMode = false) {
  if (!studentId) { showToast('Session error. Please log in again.', true); return; }

  const btn = document.getElementById('gaNext') || document.getElementById('gaLightSubmit');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }

  const payload = {
    student_id:        studentId,
    submitted_at:      new Date().toISOString(),
    mood_rating:       answers.mood_rating,
    stress_level:      answers.stress_level,
    sleep_quality:     answers.sleep_quality,
    academic_pressure: answers.academic_pressure,
    social_wellbeing:  answers.social_wellbeing,
    activities:        answers.activities || null,
    notes:             answers.notes,
    ate_meals:         answers.ate_meals,
    slept_enough:      answers.slept_enough,
    felt_safe:         answers.felt_safe,
    connected:         answers.connected,
    overwhelmed:       answers.overwhelmed,
    therapist_q1:      answers.therapist_q1,
    therapist_q2:      answers.therapist_q2,
    therapist_q3:      answers.therapist_q3,
  };

  const { error } = await supabase.from('checkins').insert([payload]);

  if (error) {
    showToast('Failed to save: ' + error.message, true);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Save Check-in';
    }
    return;
  }

  const isCrisis = isCrisisSignal();
  const name = sessionStorage.getItem('userName')?.split(' ')[0] || null;

  // Build completion screen (buddy message loads async)
  const confetti = Array.from({length:16}, (_,i) => {
    const colors = ['#f9d338','#4db8b8','#22c55e','#ef4444','#a78bfa'];
    const color  = colors[i % colors.length];
    const left   = Math.random() * 100;
    const delay  = Math.random() * 0.5;
    return `<div class="ga-confetti-piece" style="left:${left}%;top:10%;background:${color};animation-delay:${delay}s;"></div>`;
  }).join('');

  container.innerHTML = `
    <div class="ga-complete ga-confetti-wrap">
      ${confetti}
      <div class="ga-complete-emoji">${isCrisis ? '💛' : '🎉'}</div>
      <h2>${isCrisis ? 'Thank you for checking in' : 'Check-in complete!'}</h2>
      <p>${isCrisis
        ? 'It takes courage to reach out. Your counselor can see this and is here for you.'
        : 'Amazing work taking care of yourself today.<br>Your counselor will see this.'
      }</p>
      <div class="ga-complete-xp">+${isLightMode ? '10' : '20'} XP earned today 🔥</div>
      ${isCrisis ? `
        <div style="margin-top:1.2rem;">
          <button class="ga-crisis-btn" onclick="window.location.href='3studentcontact.html'" style="margin:0 auto;">
            <i class="fa-solid fa-comments"></i> Talk to a Counselor
          </button>
        </div>` : ''}
    </div>

    <div class="ga-buddy-msg" id="gaBuddyMsg">
      <div class="ga-buddy-avatar">🤖</div>
      <div class="ga-buddy-text">
        <div class="ga-buddy-typing">
          <div class="ga-buddy-dot"></div>
          <div class="ga-buddy-dot"></div>
          <div class="ga-buddy-dot"></div>
        </div>
      </div>
    </div>`;

  showToast('Check-in saved! Great job 🎉');

  // Fetch Claude-powered buddy message
  const buddyMsg = await getBuddyMessage({
    mood: answers.mood_rating,
    stress: answers.stress_level,
    name,
    isLightMode,
    isCrisis,
  });

  const buddyEl = document.getElementById('gaBuddyMsg');
  if (buddyEl && buddyMsg) {
    buddyEl.querySelector('.ga-buddy-text').innerHTML = buddyMsg;
  } else if (buddyEl) {
    // Fallback if API fails
    const fallback = isCrisis
      ? "You showed up today, and that takes strength. 💛 Please don't hesitate to reach out to your counselor — they're here for you."
      : isLightMode
        ? "Just showing up counts more than you know. Be gentle with yourself today. 🌤️"
        : "You took time to check in with yourself today — that's a real act of care. Keep it up! 🌟";
    buddyEl.querySelector('.ga-buddy-text').textContent = fallback;
  }
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const formEl = document.getElementById('checkinForm');
  if (!formEl) return;

  document.getElementById('assessSubmittedBanner')?.remove();
  document.getElementById('assessSevenDay')?.remove();

  const gaContainer = document.createElement('div');
  gaContainer.id = 'gaContainer';
  formEl.replaceWith(gaContainer);

  await renderAssessment(gaContainer);
});