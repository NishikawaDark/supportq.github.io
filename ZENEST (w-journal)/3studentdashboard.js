// ============================================================
//  3studentdashboard.js
//  Reads check-in history from Supabase and populates the
//  student dashboard: stat cards, check-in history, unsubmitted days.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://damkluawdvsthjjcpzgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e-m7pdLACqrJAxRiPuy7UA_LXzHuEC6';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── SESSION ─────────────────────────────────────────────────
const studentId = Number(sessionStorage.getItem('userId')) || null;

// ── SIDEBAR NAV ──────────────────────────────────────────────
const PAGE_MAP = {
  dashboard:   '3studentdashboard.html',
  counselors:  '3studentcontact.html',
  assessments: '3assessmentstudent.html',
  resources:   '3studentresources.html',
};

document.querySelectorAll('.sidebar button[data-tab]').forEach(btn => {
  const tab = btn.dataset.tab;
  if (!PAGE_MAP[tab]) return;
  btn.addEventListener('click', () => { window.location.href = PAGE_MAP[tab]; });
});

document.getElementById('goToAssessBtn')?.addEventListener('click', () => {
  window.location.href = '3assessmentstudent.html';
});

// ── HELPERS ──────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoStr) {
  return new Date(isoStr).toLocaleDateString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function moodEmoji(score) {
  if (score >= 8) return '😊';
  if (score >= 5) return '😐';
  return '😔';
}

function moodLabel(score) {
  if (score >= 8) return 'Good';
  if (score >= 5) return 'Okay';
  return 'Rough';
}

function moodColor(score) {
  if (score >= 8) return '#22c55e';
  if (score >= 5) return '#f9a825';
  return '#ef4444';
}

// ── STAT CARDS ───────────────────────────────────────────────
function updateStatCards(checkins) {
  const todayEl        = document.getElementById('dashTodayStatus');
  const rateEl         = document.getElementById('dashCompletionRate');
  const totalEl        = document.getElementById('dashTotalReports');
  const reminderTitle  = document.getElementById('reminderTitle');
  const reminderDesc   = document.getElementById('reminderDesc');
  const goBtn          = document.getElementById('goToAssessBtn');

  // Total check-ins ever
  if (totalEl) totalEl.textContent = checkins.length;

  // Did they submit today?
  const today     = todayStr();
  const doneToday = checkins.some(c => c.submitted_at?.slice(0, 10) === today);

  if (todayEl) {
    todayEl.textContent = doneToday ? '✅ Done' : '⏳ Pending';
    todayEl.style.color = doneToday ? '#22c55e' : '#f9a825';
  }

  if (doneToday) {
    if (reminderTitle) reminderTitle.textContent = 'Check-in Complete!';
    if (reminderDesc)  reminderDesc.textContent  = "You've already logged today's check-in. See you tomorrow!";
    if (goBtn)         goBtn.textContent          = '📋 View History';
  }

  // Completion rate — last 14 days
  const submitted = new Set(checkins.map(c => c.submitted_at?.slice(0, 10)));
  let submittedCount = 0;
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (submitted.has(d.toISOString().slice(0, 10))) submittedCount++;
  }
  const rate = Math.round((submittedCount / 14) * 100);
  if (rateEl) rateEl.textContent = rate + '%';
}

// ── CHECK-IN HISTORY ─────────────────────────────────────────
function renderHistory(checkins) {
  const list = document.getElementById('historyList');
  if (!list) return;

  if (!checkins.length) {
    list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem 0;">
      No check-ins yet. <a href="3assessmentstudent.html" style="color:var(--teal);font-weight:700;">Submit your first one!</a>
    </p>`;
    return;
  }

  list.innerHTML = '';
  // Show most recent 10
  const recent = [...checkins].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)).slice(0, 10);

  recent.forEach(c => {
    const mood  = c.mood_rating ?? 5;
    const date  = formatDate(c.submitted_at);
    const color = moodColor(mood);
    const emoji = moodEmoji(mood);
    const label = moodLabel(mood);

    // Build the tags row
    const tags = [];
    if (c.overwhelmed === 'yes')  tags.push({ text: 'Overwhelmed', bg: '#fef2f2', color: '#dc2626' });
    if (c.felt_safe   === 'no')   tags.push({ text: 'Felt unsafe',  bg: '#fef2f2', color: '#dc2626' });
    if (c.stress_level >= 8)      tags.push({ text: `Stress ${c.stress_level}/10`, bg: '#fff4e5', color: '#c97a00' });
    if (c.mood_rating >= 8)       tags.push({ text: 'Great mood',   bg: '#dcfce7', color: '#16a34a' });
    if (c.activities)             tags.push({ text: c.activities.split(',')[0]?.trim(), bg: '#ede9fe', color: '#7c3aed' });

    const tagsHtml = tags.slice(0, 3).map(t =>
      `<span style="background:${t.bg};color:${t.color};padding:2px 9px;border-radius:20px;font-size:0.72rem;font-weight:700;">${t.text}</span>`
    ).join('');

    const item = document.createElement('div');
    item.style.cssText = `
      display:flex; align-items:center; gap:14px;
      padding:12px 14px; border-radius:12px;
      background:var(--surface-alt); border:1.5px solid var(--border);
      transition:box-shadow 0.18s;
    `;

    item.innerHTML = `
      <div style="width:44px;height:44px;border-radius:50%;
        background:${color}22;border:2px solid ${color};
        display:flex;align-items:center;justify-content:center;
        font-size:1.3rem;flex-shrink:0;">${emoji}</div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:0.88rem;font-weight:700;color:var(--text-primary);">${date}</span>
          <span style="background:${color}22;color:${color};padding:1px 9px;border-radius:20px;font-size:0.72rem;font-weight:700;">${label}</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;">${tagsHtml}</div>
        ${c.notes ? `<p style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">"${c.notes}"</p>` : ''}
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-size:1.1rem;font-weight:800;color:${color};">${mood}<span style="font-size:0.7rem;color:var(--text-muted);">/10</span></div>
        <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px;">mood</div>
      </div>
    `;

    list.appendChild(item);
  });
}

// ── UNSUBMITTED DAYS ─────────────────────────────────────────
function renderUnsubmitted(checkins) {
  const list = document.getElementById('unsubmittedList');
  if (!list) return;

  const submitted = new Set(checkins.map(c => c.submitted_at?.slice(0, 10)));
  const missed    = [];

  for (let i = 1; i <= 14; i++) {       // start from 1 — skip today
    const d = new Date();
    d.setDate(d.getDate() - i);
    const str = d.toISOString().slice(0, 10);
    if (!submitted.has(str)) missed.push(str);
  }

  if (!missed.length) {
    list.innerHTML = `<p style="color:#22c55e;font-size:0.85rem;font-weight:700;text-align:center;padding:0.5rem 0;">
      🎉 Perfect — no missed days in the last 2 weeks!
    </p>`;
    return;
  }

  list.innerHTML = '';
  missed.forEach(dateStr => {
    const label = new Date(dateStr + 'T12:00:00').toLocaleDateString([], {
      weekday: 'long', month: 'short', day: 'numeric',
    });

    const item = document.createElement('div');
    item.style.cssText = `
      display:flex; align-items:center; gap:10px;
      padding:10px 14px; border-radius:10px;
      background:var(--surface-alt); border:1.5px solid var(--border);
    `;
    item.innerHTML = `
      <i class="fa-solid fa-calendar-xmark" style="color:#f9a825;font-size:1rem;flex-shrink:0;"></i>
      <span style="font-size:0.85rem;font-weight:600;color:var(--text-secondary);flex:1;">${label}</span>
      <span style="font-size:0.72rem;color:var(--text-muted);font-weight:600;">No check-in</span>
    `;
    list.appendChild(item);
  });
}

// ── MAIN LOAD ────────────────────────────────────────────────
async function loadDashboard() {
  if (!studentId) return;

  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error('Dashboard load error:', error.message);
    return;
  }

  const checkins = data || [];
  updateStatCards(checkins);
  renderHistory(checkins);
  renderUnsubmitted(checkins);
}

document.addEventListener('DOMContentLoaded', loadDashboard);