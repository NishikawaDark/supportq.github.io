import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://damkluawdvsthjjcpzgp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_e-m7pdLACqrJAxRiPuy7UA_LXzHuEC6';
const SUPABASE_TABLE = 'journal';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JOURNAL_STORAGE_PREFIX = 'supportq_journal_';
const studentJournalId = sessionStorage.getItem('userId');
const isStudent = Boolean(studentJournalId);
const JOURNAL_STORAGE_KEY = JOURNAL_STORAGE_PREFIX + (studentJournalId || 'guest');

const journalEntryTitle = document.getElementById('journalEntryTitle');
const journalEntryBody = document.getElementById('journalEntryBody');
const saveJournalBtn = document.getElementById('saveJournalBtn');
const deleteJournalBtn = document.getElementById('deleteJournalBtn');
const newJournalBtn = document.getElementById('newJournalBtn');
const favoriteBtn = document.getElementById('favoriteBtn');
const journalWordCount = document.getElementById('journalWordCount');
const journalSearch = document.getElementById('journalSearch');
const journalList = document.getElementById('journalList');
const journalEmptyMessage = document.getElementById('journalEmptyMessage');
const filterChips = Array.from(document.querySelectorAll('.filter-chip'));
const moodButtons = Array.from(document.querySelectorAll('.journal-chip[data-type="mood"]'));
const tagButtons = Array.from(document.querySelectorAll('.journal-chip[data-type="tag"]'));
const journalSummaryTotal = document.getElementById('journalSummaryTotal');
const journalSummaryFavorites = document.getElementById('journalSummaryFavorites');

let journals = [];
let currentJournalId = null;
let currentFavorite = false;
let currentMood = 'reflective';
let currentTag = 'personal';
let activeFilter = 'all';

async function loadJournals() {
  if (!isStudent) {
    try {
      const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
      journals = stored ? JSON.parse(stored) : [];
    } catch (err) {
      journals = [];
      console.warn('Failed to load journal entries.', err);
    }
    return;
  }

  const { data, error } = await supabase
    .from(SUPABASE_TABLE)
    .select('*')
    .eq('student_id', Number(studentJournalId))
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Supabase journal load failed:', error.message);
    try {
      const stored = localStorage.getItem(JOURNAL_STORAGE_KEY);
      journals = stored ? JSON.parse(stored) : [];
    } catch (err) {
      journals = [];
    }
    return;
  }

  journals = data || [];
}

function saveJournals() {
  localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journals));
}

function showToast(message) {
  const toastEl = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toastEl || !toastMsg) return;
  toastMsg.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
}

function formatDate(date) {
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getWordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function updateSummary() {
  journalSummaryTotal.textContent = journals.length;
  journalSummaryFavorites.textContent = journals.filter(entry => entry.favorite).length;
}

async function persistJournal(entry) {
  if (!isStudent) {
    saveJournals();
    return;
  }

  const payload = {
    student_id: Number(studentJournalId),
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    tag: entry.tag,
    favorite: entry.favorite,
    word_count: entry.wordCount,
    updated_at: entry.updated_at,
    date: entry.date,
    time: entry.time
  };

  if (currentJournalId) {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .update(payload)
      .eq('id', entry.id)
      .eq('student_id', Number(studentJournalId));

    if (error) {
      throw error;
    }
  } else {
    const { data, error } = await supabase
      .from(SUPABASE_TABLE)
      .insert([payload])
      .select('id');

    if (error) {
      throw error;
    }

    if (data && data.length) {
      entry.id = data[0].id;
      currentJournalId = entry.id;
    }
  }

  saveJournals();
}

function getFilteredJournals() {
  const searchTerm = journalSearch.value.trim().toLowerCase();
  const now = new Date();
  return journals
    .slice()
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .filter(entry => {
      const text = `${entry.title} ${entry.content}`.toLowerCase();
      if (searchTerm && !text.includes(searchTerm)) return false;
      if (activeFilter === 'favorites' && !entry.favorite) return false;
      if (activeFilter === 'today') {
        const entryDate = new Date(entry.updated_at).toISOString().slice(0, 10);
        return entryDate === new Date().toISOString().slice(0, 10);
      }
      if (activeFilter === 'week') {
        const entryDate = new Date(entry.updated_at);
        const diffDays = Math.floor((new Date() - entryDate) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }
      return true;
    });
}

function renderJournalList() {
  const filtered = getFilteredJournals();
  journalList.innerHTML = '';
  if (!filtered.length) {
    journalEmptyMessage.style.display = 'block';
    return;
  }

  journalEmptyMessage.style.display = 'none';

  for (const entry of filtered) {
    const item = document.createElement('div');
    item.className = 'journal-item';
    if (entry.id === currentJournalId) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <div class="journal-item-title">${entry.title}</div>
      <div class="journal-item-meta">
        <span>${entry.date} · ${entry.time}</span>
        <span>${entry.tag.charAt(0).toUpperCase() + entry.tag.slice(1)}</span>
      </div>
      <div class="journal-item-preview">${entry.content.slice(0, 120)}${entry.content.length > 120 ? '…' : ''}</div>
    `;

    item.addEventListener('click', () => openJournal(entry.id));
    journalList.appendChild(item);
  }
}

function highlightActiveChips() {
  moodButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.value === currentMood));
  tagButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.value === currentTag));
  favoriteBtn.querySelector('i').className = currentFavorite ? 'fas fa-star' : 'far fa-star';
}

function resetEditor() {
  currentJournalId = null;
  currentFavorite = false;
  currentMood = 'reflective';
  currentTag = 'personal';
  journalEntryTitle.value = '';
  journalEntryBody.value = '';
  journalWordCount.textContent = '0 words';
  highlightActiveChips();
}

function openJournal(id) {
  const entry = journals.find(item => item.id === id);
  if (!entry) return;
  currentJournalId = id;
  journalEntryTitle.value = entry.title;
  journalEntryBody.value = entry.content;
  currentFavorite = entry.favorite;
  currentMood = entry.mood;
  currentTag = entry.tag;
  journalWordCount.textContent = `${getWordCount(entry.content)} words`;
  highlightActiveChips();
  renderJournalList();
}

function getSelectedMood() {
  const active = moodButtons.find(btn => btn.classList.contains('active'));
  return active ? active.dataset.value : 'reflective';
}

function getSelectedTag() {
  const active = tagButtons.find(btn => btn.classList.contains('active'));
  return active ? active.dataset.value : 'personal';
}

async function saveJournal() {
  const title = journalEntryTitle.value.trim();
  const content = journalEntryBody.value.trim();
  if (!title) {
    alert('Please enter a title for your journal entry.');
    journalEntryTitle.focus();
    return;
  }

  const now = new Date();
  const entry = {
    title,
    content,
    mood: getSelectedMood(),
    tag: getSelectedTag(),
    favorite: currentFavorite,
    wordCount: getWordCount(content),
    updated_at: now.toISOString(),
    date: formatDate(now),
    time: formatTime(now)
  };

  if (currentJournalId) {
    entry.id = currentJournalId;
    const existingIndex = journals.findIndex(item => item.id === currentJournalId);
    if (existingIndex !== -1) {
      journals[existingIndex] = { ...journals[existingIndex], ...entry };
    }
  }

  try {
    await persistJournal(entry);
    if (!currentJournalId) {
      if (entry.id != null) {
        currentJournalId = entry.id;
      }
      journals.unshift(entry);
    }
    if (!isStudent) {
      saveJournals();
    }
    updateSummary();
    renderJournalList();
    showToast('Journal entry saved.');
  } catch (error) {
    console.error('Journal save failed:', error);
    alert('Failed to save journal entry. Please try again.');
  }
}

async function deleteJournal() {
  if (!currentJournalId) return;
  if (!confirm('Delete this journal entry?')) return;

  if (isStudent) {
    const { error } = await supabase
      .from(SUPABASE_TABLE)
      .delete()
      .eq('id', currentJournalId)
      .eq('student_id', Number(studentJournalId));

    if (error) {
      console.error('Journal delete failed:', error);
      alert('Failed to delete journal entry. Please try again.');
      return;
    }
  }

  journals = journals.filter(entry => entry.id !== currentJournalId);
  if (!isStudent) {
    saveJournals();
  }
  currentJournalId = null;
  resetEditor();
  updateSummary();
  renderJournalList();
  showToast('Journal entry deleted.');
}

async function toggleFavorite() {
  currentFavorite = !currentFavorite;
  highlightActiveChips();
  if (currentJournalId) {
    const entry = journals.find(item => item.id === currentJournalId);
    if (entry) {
      entry.favorite = currentFavorite;
      try {
        await persistJournal(entry);
      } catch (error) {
        console.error('Favorite toggle failed:', error);
        alert('Failed to update favorite state.');
        return;
      }
      updateSummary();
      renderJournalList();
    }
  }
}

function updateWordCount() {
  journalWordCount.textContent = `${getWordCount(journalEntryBody.value)} words`;
}

function setActiveFilter(filter) {
  activeFilter = filter;
  filterChips.forEach(chip => chip.classList.toggle('active', chip.dataset.filter === filter));
  renderJournalList();
}

function bindEvents() {
  saveJournalBtn.addEventListener('click', saveJournal);
  deleteJournalBtn.addEventListener('click', deleteJournal);
  newJournalBtn.addEventListener('click', () => {
    resetEditor();
    renderJournalList();
  });
  favoriteBtn.addEventListener('click', toggleFavorite);
  journalEntryBody.addEventListener('input', updateWordCount);
  journalSearch.addEventListener('input', renderJournalList);
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => setActiveFilter(chip.dataset.filter));
  });
  moodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentMood = btn.dataset.value;
      highlightActiveChips();
    });
  });
  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      currentTag = btn.dataset.value;
      highlightActiveChips();
    });
  });
}

async function initJournal() {
  await loadJournals();
  resetEditor();
  updateSummary();
  bindEvents();
  renderJournalList();
  setActiveFilter('all');
}

document.addEventListener('DOMContentLoaded', initJournal);
