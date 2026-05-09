// ============================================================
//  npcbuddy.js  —  Support-Q Buddy Widget  (Fixed Conversation Flow)
//  Drop into any page:  <script src="npcbuddy.js" defer></script>
//
//  • Buddy floats bottom-right as a bouncy FAB
//  • Opens a chat-style panel with button choices
//  • All messages and replies are fixed (no AI / no typing)
//  • Separate conversation trees for students vs admins
//  • Detects inactivity and sends a check-in
// ============================================================

(function () {
  'use strict';

  // ── ROLE ───────────────────────────────────────────────────
  const role     = sessionStorage.getItem('userRole') || 'student';
  const userName = sessionStorage.getItem('userName') || '';
  const isAdmin  = role === 'admin';
  const name     = userName.split(' ')[0] || 'there';

  const NPC_IMAGE = 'duckbuddy.png';

  // ── CONVERSATION TREE ──────────────────────────────────────
  // Each node: { id, message, choices: [{ label, next }] }
  // If choices is empty/missing, it's a terminal node.
  // Special next values:
  //   'RESTART'  → go back to root
  //   'END'      → show a "restart" button only
  //   'CRISIS'   → show crisis message + restart

  const STUDENT_TREE = {
    root: {
      message: `Hey ${name}! 👋 I'm Buddy, your mental health companion. I'm here to listen and support you. How are you feeling today?`,
      choices: [
        { label: '😊 Pretty good!',      next: 'good' },
        { label: '😔 Not so great',      next: 'notgreat' },
        { label: '😰 Really struggling', next: 'struggling' },
      ]
    },

    // ── GOOD BRANCH ──────────────────────────────────────────
    good: {
      message: `That's so great to hear! 🌟 I'm really glad. What's making today good for you?`,
      choices: [
        { label: '📚 School is going well',  next: 'good_school' },
        { label: '👫 Spending time with friends', next: 'good_friends' },
        { label: '😌 Just feeling calm',     next: 'good_calm' },
      ]
    },
    good_school: {
      message: `That's awesome! Academic wins feel so satisfying 🎉 Keep that energy going — you're doing great. Is there anything else on your mind?`,
      choices: [
        { label: '✅ Nope, all good!',        next: 'closing_good' },
        { label: '🤔 Actually, there is…',    next: 'notgreat' },
      ]
    },
    good_friends: {
      message: `Friends really do make everything better 💛 Those connections matter so much. Keep nurturing them!`,
      choices: [
        { label: '✅ Thanks, Buddy!',         next: 'closing_good' },
        { label: '🤔 I do have something on my mind', next: 'notgreat' },
      ]
    },
    good_calm: {
      message: `A calm day is a gift! 🌿 Take a moment to appreciate how you feel right now — you deserve it.`,
      choices: [
        { label: '✅ Will do, thanks!',       next: 'closing_good' },
        { label: '🤔 I want to talk about something', next: 'notgreat' },
      ]
    },
    closing_good: {
      message: `I'm really happy for you, ${name} 😊 Remember, I'm always here whenever you need to talk. Take care of yourself today!`,
      choices: [
        { label: '🔄 Start over',             next: 'RESTART' },
      ]
    },

    // ── NOT GREAT BRANCH ─────────────────────────────────────
    notgreat: {
      message: `I hear you 💛 It's okay to not be okay. Can you tell me a bit more? What's weighing on you?`,
      choices: [
        { label: '📖 School / academic stress', next: 'stress_school' },
        { label: '😞 Feeling sad or down',      next: 'sad' },
        { label: '😟 Anxiety or worry',         next: 'anxiety' },
        { label: '😶 Feeling lonely',           next: 'lonely' },
      ]
    },
    stress_school: {
      message: `Academic pressure is SO real, and it can feel overwhelming. But remember — your grade is not your worth 💛 What part of school feels hardest right now?`,
      choices: [
        { label: '📝 Upcoming exams or deadlines', next: 'stress_exams' },
        { label: '📉 Worried about my grades',     next: 'stress_grades' },
        { label: '😵 Just everything at once',     next: 'stress_overwhelm' },
      ]
    },
    stress_exams: {
      message: `Exam pressure is tough! Try breaking it down: pick ONE thing to study for 25 minutes, then take a 5-minute break (that's the Pomodoro method 🍅). Small steps add up. Have you talked to your teacher about how you're feeling?`,
      choices: [
        { label: '✅ Yes, they know',         next: 'support_offered' },
        { label: '❌ No, not yet',            next: 'suggest_counselor' },
      ]
    },
    stress_grades: {
      message: `Grades can feel like everything — but they really aren't. You are so much more than a number 💛 One thing that helps: talk to your teacher early. They'd rather help you than see you struggle. Want to explore that?`,
      choices: [
        { label: '✅ Maybe I should reach out', next: 'suggest_counselor' },
        { label: '😔 I\'m scared to ask',      next: 'fear_of_asking' },
      ]
    },
    fear_of_asking: {
      message: `That fear is totally normal, but teachers genuinely want to help — it's literally their job to support you 😊 Starting with "I'm struggling and I'm not sure what to do" is enough. You can also talk to your school counselor first if that feels safer.`,
      choices: [
        { label: '💬 I\'ll try talking to someone', next: 'suggest_counselor' },
        { label: '🔄 Start over',                    next: 'RESTART' },
      ]
    },
    stress_overwhelm: {
      message: `When everything piles up it can feel impossible to know where to start 😔 Here's a trick: write down every task, then circle just ONE you can do today. That's it. Just one. Can you try that?`,
      choices: [
        { label: '✅ I\'ll try that',          next: 'support_offered' },
        { label: '💬 I need more support',     next: 'suggest_counselor' },
      ]
    },
    sad: {
      message: `I'm sorry you're feeling sad 💛 Those feelings are valid and they won't last forever. How long have you been feeling this way?`,
      choices: [
        { label: '📅 Just today or a few days',  next: 'sad_recent' },
        { label: '📆 A while now — weeks',       next: 'sad_prolonged' },
        { label: '🌑 A really long time',        next: 'sad_serious' },
      ]
    },
    sad_recent: {
      message: `Sometimes our emotions just need space to pass. Be gentle with yourself today 🌿 A short walk, a good playlist, or even just resting can help. Is there something specific that triggered this?`,
      choices: [
        { label: '✅ Yes, I know what it is',   next: 'sad_trigger_known' },
        { label: '🤷 Not really sure',          next: 'support_offered' },
      ]
    },
    sad_trigger_known: {
      message: `It helps to name it — that takes real self-awareness 💛 Sometimes talking to someone you trust makes a huge difference. Would you like to connect with your school counselor?`,
      choices: [
        { label: '✅ Yes, please',             next: 'suggest_counselor' },
        { label: '🙏 I just needed to share',  next: 'support_offered' },
      ]
    },
    sad_prolonged: {
      message: `Feeling sad for weeks is really hard, and I want you to know — you don't have to push through this alone. Talking to a counselor could really help. They're trained exactly for this 💙`,
      choices: [
        { label: '💬 Okay, I\'ll reach out',   next: 'suggest_counselor' },
        { label: '😟 I\'m nervous to',         next: 'fear_of_asking' },
      ]
    },
    sad_serious: {
      message: `Thank you for trusting me with this 💛 When sadness lasts a long time, it's really important to talk to a professional. Please reach out to your school counselor through the Contact tab, or call/text 988 anytime. You deserve real support.`,
      choices: [
        { label: '💬 I\'ll contact my counselor', next: 'suggest_counselor' },
        { label: '📞 Tell me about 988',          next: 'crisis_988' },
      ]
    },
    anxiety: {
      message: `Anxiety is exhausting 😔 Your feelings are valid. Let's try something right now: name 5 things you can SEE around you. It pulls your mind back to the present. Ready?`,
      choices: [
        { label: '✅ I tried it — it helped a bit', next: 'anxiety_helped' },
        { label: '😰 I\'m too anxious to focus',    next: 'anxiety_bad' },
      ]
    },
    anxiety_helped: {
      message: `Great! That's the 5-4-3-2-1 grounding technique 🌬️ It genuinely works. You can also try breathing: inhale 4 counts, hold 4, exhale 4. What's making you most anxious right now?`,
      choices: [
        { label: '📚 School or exams',         next: 'stress_school' },
        { label: '👥 Social situations',       next: 'anxiety_social' },
        { label: '❓ Not really sure',         next: 'support_offered' },
      ]
    },
    anxiety_bad: {
      message: `That's okay — when anxiety is really strong, it's hard to do anything. Please know this feeling WILL pass 💛 If anxiety is affecting your daily life a lot, talking to your counselor can make a real difference. Want to do that?`,
      choices: [
        { label: '✅ Yes, I want to talk to someone', next: 'suggest_counselor' },
        { label: '💬 Just talk to me more',           next: 'support_offered' },
      ]
    },
    anxiety_social: {
      message: `Social anxiety is really common, especially in school. You're not weird or broken 💛 A small step: try making eye contact and smiling at one person today. That's it. Would you like to chat with a counselor about this?`,
      choices: [
        { label: '✅ Maybe yes',               next: 'suggest_counselor' },
        { label: '🙏 Thanks, I feel better',   next: 'support_offered' },
      ]
    },
    lonely: {
      message: `Loneliness is one of the hardest feelings. But you're here, you reached out — that already takes courage 💛 How long have you been feeling this way?`,
      choices: [
        { label: '📅 Just recently',           next: 'lonely_recent' },
        { label: '📆 For a while now',         next: 'lonely_prolonged' },
      ]
    },
    lonely_recent: {
      message: `Sometimes loneliness hits us out of nowhere. Is there one person — a classmate, family member, anyone — you could send a message to today? Even just "hey 👋" counts.`,
      choices: [
        { label: '✅ Yeah, I can try that',    next: 'support_offered' },
        { label: '😞 I don\'t think so',       next: 'lonely_prolonged' },
      ]
    },
    lonely_prolonged: {
      message: `Feeling disconnected for a long time is really painful, and you deserve real connection 💙 Your school counselor can help you find ways to build friendships in a safe, supported way. Would you like to reach out to them?`,
      choices: [
        { label: '✅ Yes, I\'ll try',          next: 'suggest_counselor' },
        { label: '💬 I just needed to be heard', next: 'support_offered' },
      ]
    },

    // ── STRUGGLING BRANCH ────────────────────────────────────
    struggling: {
      message: `I'm really glad you told me 💛 You don't have to go through this alone. Are you having thoughts of hurting yourself or others?`,
      choices: [
        { label: '✅ No, nothing like that',   next: 'notgreat' },
        { label: '😔 Yes, sometimes',          next: 'CRISIS' },
      ]
    },

    // ── SHARED ENDPOINTS ─────────────────────────────────────
    support_offered: {
      message: `I'm really glad you shared that with me. You're stronger than you think, ${name} 🌟 Remember, your school counselor is always available through the Contact tab. Is there anything else on your mind?`,
      choices: [
        { label: '❓ Yes, something else',     next: 'notgreat' },
        { label: '✅ No, I feel a bit better', next: 'closing_good' },
      ]
    },
    suggest_counselor: {
      message: `That's a really brave step 💛 You can reach your school counselor right through the Contact tab in the app. They're trained to help and they genuinely care. You've got this 💪`,
      choices: [
        { label: '✅ Thanks, I\'ll do that',    next: 'closing_good' },
        { label: '🔄 Start over',             next: 'RESTART' },
      ]
    },
    crisis_988: {
      message: `988 is the Suicide & Crisis Lifeline 💙 You can call OR text 988 anytime — it's free, confidential, and available 24/7. Real people answer who genuinely care. Please reach out — you matter so much.`,
      choices: [
        { label: '💬 I\'ll reach out',         next: 'closing_good' },
        { label: '🔄 Start over',             next: 'RESTART' },
      ]
    },
  };

  const ADMIN_TREE = {
    root: {
      message: `Hey ${name}! 👋 I'm Buddy, your wellbeing companion. You spend all day caring for others — I'm here to take care of you a little. How are you feeling today?`,
      choices: [
        { label: '😊 Doing well today',        next: 'good' },
        { label: '😴 Tired and drained',       next: 'tired' },
        { label: '😟 Stressed or overwhelmed', next: 'stressed' },
      ]
    },

    // ── GOOD BRANCH ──────────────────────────────────────────
    good: {
      message: `That's wonderful to hear! 🌟 What's contributing to that today?`,
      choices: [
        { label: '📈 Things are going smoothly',  next: 'good_smooth' },
        { label: '💪 I made a difference today',  next: 'good_impact' },
        { label: '😌 Just a calm day',            next: 'good_calm' },
      ]
    },
    good_smooth: {
      message: `Smooth days are a blessing — savour it! ☕ Even when things are good, remember to pace yourself. Sustainability matters. Is there anything you want to make sure you protect about today?`,
      choices: [
        { label: '✅ Just my sanity, ha!',       next: 'closing_good' },
        { label: '🤔 Actually, I want to talk about something', next: 'stressed' },
      ]
    },
    good_impact: {
      message: `That feeling — knowing you made a real difference — that's why you do this 💙 Hold on to it. You are genuinely appreciated, even when no one says it.`,
      choices: [
        { label: '✅ Thanks, I needed that!',    next: 'closing_good' },
        { label: '🔄 Start over',               next: 'RESTART' },
      ]
    },
    good_calm: {
      message: `Calm days are rare in your role — enjoy every second! 🌿 Take a real lunch break if you can. You've earned it.`,
      choices: [
        { label: '✅ I will, thank you!',        next: 'closing_good' },
        { label: '🔄 Start over',               next: 'RESTART' },
      ]
    },
    closing_good: {
      message: `I'm glad you're doing well, ${name} 💙 Keep taking care of yourself — you can't pour from an empty cup. I'm always here when you need to talk.`,
      choices: [
        { label: '🔄 Start over',               next: 'RESTART' },
      ]
    },

    // ── TIRED BRANCH ─────────────────────────────────────────
    tired: {
      message: `Compassion fatigue is real, ${name} 💙 You give so much every day. How long has this tiredness been building?`,
      choices: [
        { label: '📅 Just today — rough day',   next: 'tired_today' },
        { label: '📆 A few weeks now',          next: 'tired_weeks' },
        { label: '🌑 For a very long time',     next: 'tired_burnout' },
      ]
    },
    tired_today: {
      message: `One rough day doesn't define your work. Before you sleep tonight, try this: write down ONE thing you did well today — no matter how small. You need to see your own wins 💛`,
      choices: [
        { label: '✅ I can do that',            next: 'support_offered' },
        { label: '😔 There\'s more to it',      next: 'stressed' },
      ]
    },
    tired_weeks: {
      message: `Weeks of tiredness is your body asking for a reset 🌿 What's one thing you can take off your plate this week — even just one task you can delegate or postpone?`,
      choices: [
        { label: '🤔 Let me think about that',  next: 'tired_boundaries' },
        { label: '😔 Everything feels urgent',  next: 'tired_burnout' },
      ]
    },
    tired_boundaries: {
      message: `Setting boundaries — even small ones — can make a real difference. Try protecting just 15 minutes each day for yourself. No emails, no students. Just you 💙 Would talking to a colleague or mentor about workload help?`,
      choices: [
        { label: '✅ That sounds good',         next: 'support_offered' },
        { label: '😞 I feel like I can\'t say no', next: 'tired_burnout' },
      ]
    },
    tired_burnout: {
      message: `What you're describing sounds like burnout, and that's serious — it's not a weakness, it means you've been strong for too long 💛 Please speak with a trusted colleague or HR, and consider talking to a professional. Your wellbeing matters just as much as your students'.`,
      choices: [
        { label: '💬 I\'ll reach out to someone', next: 'suggest_support' },
        { label: '📞 Tell me about 988',         next: 'crisis_988' },
      ]
    },

    // ── STRESSED BRANCH ──────────────────────────────────────
    stressed: {
      message: `Stress in your role is unavoidable — but you don't have to carry it alone 💙 What's weighing on you most right now?`,
      choices: [
        { label: '👥 Managing student crises',   next: 'stress_students' },
        { label: '📋 Administrative pressure',   next: 'stress_admin' },
        { label: '🏠 Work-life balance',         next: 'stress_balance' },
      ]
    },
    stress_students: {
      message: `Holding space for students in crisis while keeping yourself grounded is incredibly hard. Try this: after a difficult interaction, give yourself 5 minutes before your next task — even just breathing. Do you have a colleague to debrief with?`,
      choices: [
        { label: '✅ Yes, I have someone',       next: 'support_offered' },
        { label: '❌ Not really',                next: 'suggest_support' },
      ]
    },
    stress_admin: {
      message: `Admin pressure can be relentless. Try identifying the ONE task that, if done today, would relieve the most pressure — then start there. Everything else can wait. Is your workload actually sustainable long-term?`,
      choices: [
        { label: '🤔 Honestly, no',             next: 'tired_burnout' },
        { label: '✅ It\'s manageable',         next: 'support_offered' },
      ]
    },
    stress_balance: {
      message: `Work-life balance in education is a constant battle 🌿 One boundary worth protecting: try not to check emails after a set time each evening. Even one hour of "off" time matters. What would feel like relief right now?`,
      choices: [
        { label: '🛁 Some time to myself',      next: 'support_offered' },
        { label: '💬 Someone to talk to',       next: 'suggest_support' },
      ]
    },

    // ── SHARED ENDPOINTS ─────────────────────────────────────
    support_offered: {
      message: `You're doing important work, ${name}, and it shows 💙 Don't forget — your wellbeing has to come first before you can help others. Is there anything else you'd like to talk through?`,
      choices: [
        { label: '❓ Yes, one more thing',      next: 'stressed' },
        { label: '✅ No, I feel a bit better',  next: 'closing_good' },
      ]
    },
    suggest_support: {
      message: `Having support matters so much. You can reach HR, your school's EAP (Employee Assistance Program), or a trusted mentor. A peer debrief after tough days can also help enormously. Please don't carry this alone 💙`,
      choices: [
        { label: '✅ I\'ll reach out',          next: 'closing_good' },
        { label: '🔄 Start over',              next: 'RESTART' },
      ]
    },
    crisis_988: {
      message: `988 is the Suicide & Crisis Lifeline 💙 You can call OR text 988 anytime — free, confidential, 24/7. It's not only for students — it's for anyone. Please reach out. You matter.`,
      choices: [
        { label: '💬 Thank you',               next: 'closing_good' },
        { label: '🔄 Start over',             next: 'RESTART' },
      ]
    },
  };

  const CRISIS_MESSAGE = `Thank you for trusting me with this — that takes real courage 💛 Please reach out to your school counselor through the Contact tab right now. If you're in immediate distress, call or text 988 — they're available 24/7 and genuinely care. You are not alone, and you matter so much.`;

  const TREE = isAdmin ? ADMIN_TREE : STUDENT_TREE;

  // ── IDLE CHECK-IN MESSAGES ────────────────────────────────
  const IDLE_STUDENT = [
    `Psst, still there ${name}? 👀 I'm here if you want to chat!`,
    `Hey! You've been quiet — everything okay? 💛`,
    `Don't forget, you can always talk to me about anything 😊`,
    `Taking a break? That's perfectly okay! I'll be right here 🌿`,
  ];
  const IDLE_ADMIN = [
    `Hey ${name}, still with me? How are you holding up? 💛`,
    `You've been busy — don't forget to breathe 🌿`,
    `I'm here whenever you need to vent or just talk 💙`,
  ];
  const idlePool = isAdmin ? IDLE_ADMIN : IDLE_STUDENT;

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
      max-height: 520px;
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

    /* ── CHOICE BUTTONS ── */
    .buddy-choices {
      display: flex; flex-direction: column; gap: 6px;
      padding: 4px 0 2px 35px;
      animation: bMsgIn 0.3s cubic-bezier(.34,1.56,.64,1);
    }
    .buddy-choice-btn {
      background: #fff; border: 1.5px solid #d1d5db;
      border-radius: 12px; padding: 7px 12px;
      font-size: 12px; font-weight: 700; color: #132A3F;
      cursor: pointer; text-align: left; line-height: 1.4;
      transition: background 0.18s, border-color 0.18s, transform 0.15s;
      font-family: 'Nunito', sans-serif;
    }
    .buddy-choice-btn:hover {
      background: #f9fafb; border-color: #f9a825;
      transform: translateX(2px);
    }
    .buddy-choice-btn:active { transform: scale(0.97); }
    .buddy-choice-btn.selected {
      background: #132A3F; color: #f9d338;
      border-color: #132A3F; pointer-events: none;
    }
    .buddy-choices.disabled .buddy-choice-btn {
      opacity: 0.45; pointer-events: none; cursor: default;
    }

    /* ── FOOTER BADGE ── */
    .buddy-footer-badge {
      display: flex; align-items: center; gap: 5px;
      font-size: 10px; font-weight: 700; color: #aab0ba;
      padding: 5px 12px 6px; text-align: center; justify-content: center;
      background: #fff; border-top: 1px solid #f0f2f5; flex-shrink: 0;
      letter-spacing: 0.03em;
    }
    .buddy-footer-badge i { color: #f9a825; }

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
    [data-theme="dark"] .buddy-typing      { background:#1e2d3d; border-color:#2d3748; }
    [data-theme="dark"] .buddy-choice-btn  { background:#1e2d3d; border-color:#2d3748; color:#e5e7eb; }
    [data-theme="dark"] .buddy-choice-btn:hover { background:#263548; border-color:#f9a825; }
    [data-theme="dark"] .buddy-footer-badge { background:#1a2535; border-color:#2d3748; }
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
          <span id="bHeaderEmoji">🐥</span>
        </div>
        <div class="buddy-header-info">
          <div class="buddy-header-name">Buddy</div>
          <div class="buddy-header-status">
            <span class="buddy-status-dot"></span>
            Here for you 💛
          </div>
        </div>
        <button class="buddy-close-btn" id="bCloseBtn" title="Close">✕</button>
      </div>
      <div class="buddy-body" id="bBody"></div>
      <div class="buddy-footer-badge">
        <i class="fa-solid fa-heart"></i> Not a substitute for professional help
      </div>
    </div>

    <div id="buddy-tooltip">Buddy wants to <span>chat with you</span> 👀</div>

    <button id="buddy-fab" title="Open Buddy">
      <img src="${NPC_IMAGE}" alt="Buddy" class="buddy-fab-img" id="bFabImg"/>
      <span class="buddy-fab-emoji" id="bFabEmoji">🐥</span>
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

  // ── STATE ─────────────────────────────────────────────────
  let isOpen       = false;
  let hasOpened    = false;
  let idleTimer    = null;
  let tooltipTimer = null;

  const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

  // ── HELPERS ───────────────────────────────────────────────
  function scrollBottom() { setTimeout(() => { bodyEl.scrollTop = bodyEl.scrollHeight; }, 60); }

  function makeMiniAvatar() {
    const wrap = document.createElement('div');
    wrap.className = 'buddy-mini-avatar';
    const img = document.createElement('img');
    img.src = NPC_IMAGE;
    img.onload  = () => img.classList.add('loaded');
    img.onerror = () => img.style.display = 'none';
    const em  = document.createElement('span');
    em.className = 'bm-emoji'; em.textContent = '🐥';
    wrap.appendChild(img); wrap.appendChild(em);
    return wrap;
  }

  function showTooltip(html) {
    if (html) tooltip.innerHTML = html;
    clearTimeout(tooltipTimer);
    tooltip.classList.add('show');
    tooltipTimer = setTimeout(() => tooltip.classList.remove('show'), 5000);
  }

  // ── ADD BUBBLES ───────────────────────────────────────────
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

  // ── SHOW CHOICES ──────────────────────────────────────────
  function addChoices(choices) {
    const wrap = document.createElement('div');
    wrap.className = 'buddy-choices';

    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'buddy-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        // Disable all sibling buttons
        wrap.classList.add('disabled');
        btn.classList.add('selected');

        // Show as user message
        addUserBubble(choice.label);

        // Navigate to next node
        setTimeout(() => handleNode(choice.next), 350);
      });
      wrap.appendChild(btn);
    });

    bodyEl.appendChild(wrap);
    scrollBottom();
  }

  // ── CONVERSATION ENGINE ───────────────────────────────────
  function handleNode(nodeId) {
    // Special actions
    if (nodeId === 'RESTART') {
      setTimeout(() => handleNode('root'), 400);
      return;
    }
    if (nodeId === 'CRISIS') {
      showNodeWithDelay(CRISIS_MESSAGE, [{ label: '🔄 Start over', next: 'RESTART' }]);
      return;
    }
    if (nodeId === 'END') {
      showNodeWithDelay(null, [{ label: '🔄 Start over', next: 'RESTART' }]);
      return;
    }

    const node = TREE[nodeId];
    if (!node) {
      console.warn('[Buddy] Unknown node:', nodeId);
      return;
    }
    showNodeWithDelay(node.message, node.choices || []);
  }

  function showNodeWithDelay(message, choices) {
    if (!message) {
      addChoices(choices);
      return;
    }

    showTyping();
    const typeMs = Math.min(600 + message.length * 12, 1800);

    setTimeout(() => {
      removeTyping();
      addBuddyBubble(message);

      if (choices && choices.length > 0) {
        setTimeout(() => addChoices(choices), 200);
      }
    }, typeMs);
  }

  // ── OPEN / CLOSE ──────────────────────────────────────────
  function openChat() {
    isOpen = true;
    win.classList.add('open');
    fab.style.animation = 'none';
    fabDot.classList.remove('show');
    tooltip.classList.remove('show');

    if (!hasOpened) {
      hasOpened = true;
      setTimeout(() => handleNode('root'), 350);
    }

    resetIdleTimer();
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    setTimeout(() => { fab.style.animation = ''; }, 120);
  }

  fab.addEventListener('click', () => isOpen ? closeChat() : openChat());
  closeBtn.addEventListener('click', closeChat);

  // ── IDLE CHECK-IN ─────────────────────────────────────────
  function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      const msg = idlePool[Math.floor(Math.random() * idlePool.length)];
      // Show idle message as a standalone bubble (no choices)
      showTyping();
      setTimeout(() => {
        removeTyping();
        addBuddyBubble(msg);
      }, 900);
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