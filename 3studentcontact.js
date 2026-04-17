// ============================================================
//  3studentcontact.js
//  Student-side chat with counselors.
//  Depends on: navbar-user.js (loaded before this), Supabase ESM
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL = 'https://damkluawdvsthjjcpzgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e-m7pdLACqrJAxRiPuy7UA_LXzHuEC6';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── SESSION ──────────────────────────────────────────────────
const _rawId    = sessionStorage.getItem('userId');
const studentId = _rawId && !isNaN(Number(_rawId)) ? Number(_rawId) : null;

/** Fallback: recover userId from email if session was missing it */
async function ensureStudentId() {
  if (studentId) return true;
  const email = sessionStorage.getItem('userEmail');
  if (!email) return false;
  const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
  if (data) {
    window._recoveredStudentId = data.id;
    sessionStorage.setItem('userId', String(data.id));
    return true;
  }
  return false;
}

function getStudentId() {
  return studentId || window._recoveredStudentId || null;
}

// ── SIDEBAR NAV ──────────────────────────────────────────────
const NAV_ROUTES = {
  navDashboard:   '3studentdashboard.html',
  navContact:     '3studentcontact.html',
  navAssessments: '3assessmentstudent.html',
  navResources:   '3studentresources.html',
};

Object.entries(NAV_ROUTES).forEach(([id, href]) => {
  document.getElementById(id)?.addEventListener('click', () => {
    window.location.href = href;
  });
});

// ── TOAST ────────────────────────────────────────────────────
const toastEl  = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
let toastTimer;

function showToast(msg, duration = 3000) {
  toastMsg.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ── UTILS ────────────────────────────────────────────────────
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  const today     = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(text || ''));
  return el.innerHTML;
}

// ── CHAT DOM REFS ────────────────────────────────────────────
const chatEmptyState  = document.getElementById('chatEmptyState');
const chatPanelInner  = document.getElementById('chatPanelInner');
const chatPanelAvatar = document.getElementById('chatPanelAvatar');
const chatPanelName   = document.getElementById('chatPanelName');
const chatPanelBody   = document.getElementById('chatPanelBody');
const chatPanelInput  = document.getElementById('chatPanelInput');
const chatPanelSend   = document.getElementById('chatPanelSend');

let activeAdmin = null;   // { id, name, initials }
let realtimeSub = null;

// ── UNREAD BADGES ────────────────────────────────────────────
function setUnreadBadge(adminId, count) {
  const item = document.querySelector(`.counselor-item[data-id="${adminId}"]`);
  if (!item) return;
  let badge = item.querySelector('.unread-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'unread-badge';
      item.appendChild(badge);
    }
    badge.textContent = count;
  } else {
    badge?.remove();
  }
}

async function fetchUnreadCounts() {
  const sid = getStudentId();
  if (!sid) return {};
  const { data } = await supabase
    .from('messages')
    .select('sender')
    .eq('receiver', sid)
    .eq('seen', 0);
  const counts = {};
  (data || []).forEach(m => { counts[m.sender] = (counts[m.sender] || 0) + 1; });
  return counts;
}

// ── MESSAGE ELEMENTS ─────────────────────────────────────────
async function deleteMessage(msgId, msgEl) {
  if (!confirm('Delete this message?')) return;
  const { error } = await supabase.from('messages').delete().eq('id', msgId);
  if (error) {
    alert('Failed to delete: ' + error.message);
  } else {
    msgEl.remove();
  }
}

function buildMsgEl(msg) {
  const sid       = getStudentId();
  const isStudent = msg.sender === sid;
  const msgEl     = document.createElement('div');
  msgEl.className    = `chat-msg ${isStudent ? 'student' : 'admin'}`;
  msgEl.dataset.msgId = msg.id;

  msgEl.innerHTML = `
    <div class="chat-bubble-wrap">
      <div class="chat-bubble">${escapeHtml(msg.files)}</div>
      ${isStudent ? `<button class="delete-btn" title="Delete message"><i class="fa-solid fa-trash"></i></button>` : ''}
    </div>
    <span class="chat-time">${formatTime(msg.date)}</span>
  `;

  if (isStudent) {
    msgEl.querySelector('.delete-btn').addEventListener('click', () => deleteMessage(msg.id, msgEl));
  }

  return msgEl;
}

function appendDateDividerIfNeeded(isoDate) {
  const label = formatDate(isoDate);
  const last  = chatPanelBody.querySelector('.chat-date-divider:last-of-type');
  if (!last || last.textContent !== label) {
    const div = document.createElement('div');
    div.className   = 'chat-date-divider';
    div.textContent = label;
    chatPanelBody.appendChild(div);
  }
}

function renderMessages(messages) {
  chatPanelBody.innerHTML = '';
  if (!messages?.length) {
    chatPanelBody.innerHTML = '<p class="chat-loading">No messages yet. Send a message!</p>';
    return;
  }
  let lastDate = null;
  messages.forEach(msg => {
    const d = formatDate(msg.date);
    if (d !== lastDate) {
      const divider = document.createElement('div');
      divider.className   = 'chat-date-divider';
      divider.textContent = d;
      chatPanelBody.appendChild(divider);
      lastDate = d;
    }
    chatPanelBody.appendChild(buildMsgEl(msg));
  });
  chatPanelBody.scrollTop = chatPanelBody.scrollHeight;
}

// ── LOAD & SUBSCRIBE ─────────────────────────────────────────
async function loadMessages(adminId) {
  await ensureStudentId();
  const sid = getStudentId();

  if (!sid) {
    chatPanelBody.innerHTML = `<p class="chat-loading" style="color:#e53935;">
      Session error — please <a href="index.html">log in again</a>.
    </p>`;
    return;
  }

  chatPanelBody.innerHTML = '<p class="chat-loading">Loading messages…</p>';

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender.eq.${sid},receiver.eq.${adminId}),and(sender.eq.${adminId},receiver.eq.${sid})`)
    .order('date', { ascending: true });

  if (error) {
    chatPanelBody.innerHTML = '<p class="chat-loading" style="color:#e53935;">Error loading messages.</p>';
    return;
  }

  renderMessages(data);

  // Mark incoming messages as seen
  await supabase.from('messages')
    .update({ seen: 1 })
    .eq('sender', adminId)
    .eq('receiver', sid)
    .eq('seen', 0);

  setUnreadBadge(adminId, 0);
}

function subscribeToMessages(adminId) {
  if (realtimeSub) {
    supabase.removeChannel(realtimeSub);
    realtimeSub = null;
  }

  const sid = getStudentId();

  realtimeSub = supabase
    .channel(`chat_student_${sid}_admin_${adminId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      const relevant = (msg.sender === sid && msg.receiver === adminId)
                    || (msg.sender === adminId && msg.receiver === sid);
      if (!relevant) return;

      appendDateDividerIfNeeded(msg.date);
      chatPanelBody.appendChild(buildMsgEl(msg));
      chatPanelBody.scrollTop = chatPanelBody.scrollHeight;

      if (msg.sender === adminId) {
        showToast('New message from ' + (activeAdmin?.name || 'counselor'));
        supabase.from('messages').update({ seen: 1 }).eq('id', msg.id);
        setUnreadBadge(adminId, 0);
      }
    })
    .subscribe();
}

// ── OPEN CHAT PANEL ──────────────────────────────────────────
function openChatPanel(admin) {
  activeAdmin = admin;
  chatPanelAvatar.textContent     = admin.initials;
  chatPanelName.textContent       = admin.name;
  chatEmptyState.style.display    = 'none';
  chatPanelInner.style.display    = 'flex';
  loadMessages(admin.id);
  subscribeToMessages(admin.id);
  setTimeout(() => chatPanelInput.focus(), 150);
}

// ── SEND MESSAGE ─────────────────────────────────────────────
async function sendMessage() {
  const text = chatPanelInput.value.trim();
  if (!text || !activeAdmin) return;

  const sid = getStudentId();
  if (!sid) { alert('Session error. Please log in again.'); return; }

  chatPanelInput.value    = '';
  chatPanelInput.disabled = true;
  chatPanelSend.disabled  = true;

  const { error } = await supabase.from('messages').insert([{
    sender:   sid,
    receiver: activeAdmin.id,
    files:    text,
    date:     new Date().toISOString(),
    seen:     0,
  }]);

  chatPanelInput.disabled = false;
  chatPanelSend.disabled  = false;
  chatPanelInput.focus();

  if (error) alert('Failed to send: ' + error.message);
}

chatPanelSend.addEventListener('click', sendMessage);
chatPanelInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

// ── LOAD COUNSELORS ──────────────────────────────────────────
const AVATAR_COLORS = [
  'background:linear-gradient(135deg,#f9a825,#f9d338);color:#132A3F;',
  'background:linear-gradient(135deg,#439ab0,#5ab5d6);color:#fff;',
  'background:linear-gradient(135deg,#6a5acd,#9b8fef);color:#fff;',
  'background:linear-gradient(135deg,#2ecc71,#1abc9c);color:#fff;',
];

async function loadCounselors() {
  const container = document.getElementById('counselorList');

  const [{ data, error }, unreadCounts] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'admin'),
    fetchUnreadCounts(),
  ]);

  if (error || !data?.length) {
    container.innerHTML = '<p class="chat-loading" style="color:#aab0ba;">No counselors available right now.</p>';
    return;
  }

  container.innerHTML = '';

  data.forEach((admin, idx) => {
    const ini     = getInitials(admin.name || 'Admin');
    const unread  = unreadCounts[admin.id] || 0;
    const color   = AVATAR_COLORS[idx % AVATAR_COLORS.length];

    const item = document.createElement('div');
    item.className  = 'counselor-item';
    item.dataset.id = admin.id;
    item.innerHTML  = `
      <div class="counselor-avatar" style="${color}">${ini}</div>
      <div class="counselor-info">
        <p class="counselor-name">${admin.name || 'Counselor'}</p>
        <p class="counselor-role">${admin.email || 'Guidance Counselor'}</p>
      </div>
      ${unread > 0 ? `<div class="unread-badge">${unread}</div>` : ''}
      <div class="counselor-radio"></div>
    `;

    item.addEventListener('click', () => {
      document.querySelectorAll('.counselor-item').forEach(c => c.classList.remove('selected'));
      item.classList.add('selected');
      item.style.transform = 'scale(1.015)';
      setTimeout(() => { item.style.transform = ''; }, 180);
      openChatPanel({ id: admin.id, name: admin.name || 'Counselor', initials: ini });
    });

    container.appendChild(item);
  });
}

// ── GLOBAL UNREAD WATCHER ────────────────────────────────────
function watchGlobalUnread() {
  const sid = getStudentId();
  if (!sid) return;

  supabase.channel('student_unread_watcher')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if (msg.receiver !== sid) return;
      if (activeAdmin && msg.sender === activeAdmin.id) return; // already in that chat
      const current = parseInt(
        document.querySelector(`.counselor-item[data-id="${msg.sender}"] .unread-badge`)?.textContent || '0'
      );
      setUnreadBadge(msg.sender, current + 1);
    })
    .subscribe();
}

// ── INIT ─────────────────────────────────────────────────────
loadCounselors();
watchGlobalUnread();