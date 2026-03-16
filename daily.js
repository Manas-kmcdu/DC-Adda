/**
 * DC Fan Hub — daily.js
 * Daily XI Challenge:
 * - Pick 11 from full squad
 * - Submit once per day per user
 * - See all submissions as vertical cards
 * - Vote for your favourite submission
 * - Resets at midnight IST each day
 */

/* ── STATE ─────────────────────────────────────────────── */
let players    = [];
let myPicks    = [];       // array of player ids (max 11)
let submissions = {};      // Firebase snapshot
let sortMode   = 'votes';
let roleFilter = 'all';
let username   = null;
let todayKey   = '';       // YYYY-MM-DD in IST
let hasSubmitted = false;
let noticeTimer  = null;

function showNotice(msg) {
  const n = document.getElementById('hubNotice');
  if (!n) return;
  n.textContent = msg; n.style.opacity = '1';
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => n.style.opacity = '0', 3200);
}

/* ── INIT ─────────────────────────────────────────────── */
async function init() {
  initFirebase();
  username = getUsername();
  if (username) document.getElementById('userBadgeName').textContent = username;

  todayKey = getTodayKey();
  updateDateDisplay();
  startCountdown();

  await loadPlayers();
  renderPool();
  renderSelectedList();
  setupFilters();
  setupButtons();

  if (db) {
    listenSubmissions();
  }

  // Check if already submitted today
  checkAlreadySubmitted();
}

/* ── DATE HELPERS ─────────────────────────────────────── */
function getTodayKey() {
  // IST = UTC+5:30
  const now = new Date(Date.now() + 5.5*60*60*1000);
  return now.toISOString().slice(0,10); // YYYY-MM-DD
}

function updateDateDisplay() {
  const el = document.getElementById('dailyDate');
  if (el) {
    const d = new Date(Date.now() + 5.5*60*60*1000);
    el.textContent = d.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' });
  }
  const countEl = document.getElementById('submissionCount');
  // updated by listener
}

function startCountdown() {
  setInterval(() => {
    const now   = new Date(Date.now() + 5.5*60*60*1000);
    const msLeft = (24*60*60*1000) - (now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds())*1000;
    const h = Math.floor(msLeft/3600000);
    const m = Math.floor((msLeft%3600000)/60000);
    const s = Math.floor((msLeft%60000)/1000);
    const el = document.getElementById('dailyResets');
    if (el) el.textContent = `Resets in: ${h}h ${m}m ${s}s`;
  }, 1000);
}

/* ── LOAD PLAYERS ─────────────────────────────────────── */
async function loadPlayers() {
  try {
    const r = await fetch('players.json');
    players = await r.json();
  } catch(e) { players = []; }
}

/* ── POOL RENDER ──────────────────────────────────────── */
function renderPool() {
  const grid = document.getElementById('dailyPoolGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let list = players;
  if (roleFilter !== 'all') list = players.filter(p => p.role === roleFilter);

  list.forEach(p => {
    const chip = document.createElement('div');
    const picked = myPicks.includes(p.id);
    const full   = myPicks.length >= 11 && !picked;
    chip.className = 'daily-pick-chip' + (picked?' picked':'') + (full?' full':'');

    if (p.overseas) {
      const os = document.createElement('span');
      os.className = 'os-tag'; os.textContent = 'OS';
      chip.appendChild(os);
    }
    const nm = document.createElement('span');
    nm.style.flex = '1';
    nm.textContent = p.name;
    const rt = buildRoleTag(p.role);
    chip.append(nm, rt);

    chip.addEventListener('click', () => togglePick(p.id));
    grid.appendChild(chip);
  });
}

function togglePick(pid) {
  if (hasSubmitted) return;
  if (myPicks.includes(pid)) {
    myPicks = myPicks.filter(id => id !== pid);
  } else {
    if (myPicks.length >= 11) { showNotice('Already 11 players selected!'); return; }
    myPicks.push(pid);
  }
  renderPool();
  renderSelectedList();
  updateSubmitBtn();
}

/* ── SELECTED LIST ────────────────────────────────────── */
function renderSelectedList() {
  const el = document.getElementById('dailySelectedList');
  const countEl = document.getElementById('pickedCount');
  if (!el) return;

  if (countEl) countEl.textContent = myPicks.length + ' / 11';

  if (!myPicks.length) {
    el.innerHTML = '<div class="daily-empty-pick">Tap players below to build your XI</div>';
    return;
  }

  el.innerHTML = '';
  myPicks.forEach((pid, i) => {
    const p = players.find(pl => pl.id === pid);
    if (!p) return;
    const row = document.createElement('div');
    row.className = 'daily-sel-row';

    const num = document.createElement('span');
    num.className = 'daily-sel-num'; num.textContent = i + 1;

    const nm = document.createElement('span');
    nm.className = 'daily-sel-name'; nm.textContent = p.name;

    const rt = buildRoleTag(p.role);

    if (p.overseas) {
      const os = document.createElement('span');
      os.className = 'os-tag'; os.textContent = 'OS';
      row.append(num, nm, os, rt);
    } else {
      row.append(num, nm, rt);
    }

    const rm = document.createElement('button');
    rm.className = 'daily-sel-rm'; rm.textContent = '✕';
    rm.setAttribute('aria-label', 'Remove ' + p.name);
    rm.addEventListener('click', () => togglePick(pid));
    row.appendChild(rm);

    el.appendChild(row);
  });
}

function updateSubmitBtn() {
  const btn = document.getElementById('submitDailyBtn');
  if (btn) btn.disabled = myPicks.length !== 11 || hasSubmitted;
}

/* ── SUBMIT ───────────────────────────────────────────── */
async function submitXI() {
  if (!username) username = await requireUsername();
  if (myPicks.length !== 11) { showNotice('Pick exactly 11 players!'); return; }
  if (!db) { showNotice('Not connected.'); return; }

  const flair = (() => { try { return JSON.parse(localStorage.getItem('dc_flair') || 'null'); } catch { return null; } })();

  const subObj = {
    username,
    players: myPicks,
    votes: 0,
    submittedAt: Date.now(),
    flair: flair ? flair.fanTypeLabel : null,
  };

  const key = safeKey(username);
  await db.ref(`dailyXI/${todayKey}/${key}`).set(subObj);

  // Mark as submitted today
  localStorage.setItem('dc_daily_submitted_' + todayKey, '1');
  hasSubmitted = true;
  showSubmittedBanner();
  updateSubmitBtn();
  showNotice('XI submitted! Now vote for others 👇');
}

function checkAlreadySubmitted() {
  hasSubmitted = !!localStorage.getItem('dc_daily_submitted_' + todayKey);
  if (hasSubmitted) showSubmittedBanner();
  updateSubmitBtn();
}

function showSubmittedBanner() {
  const b = document.getElementById('submittedBanner');
  if (b) b.style.display = 'flex';
}

/* ── LISTEN SUBMISSIONS ───────────────────────────────── */
function listenSubmissions() {
  db.ref(`dailyXI/${todayKey}`).on('value', snap => {
    submissions = {};
    snap.forEach(c => submissions[c.key] = c.val());

    const count = Object.keys(submissions).length;
    const countEl = document.getElementById('submissionCount');
    if (countEl) countEl.textContent = count + ' submission' + (count !== 1 ? 's' : '') + ' today';

    renderSubmissions();
  });
}

/* ── RENDER SUBMISSIONS ───────────────────────────────── */
function renderSubmissions() {
  const el = document.getElementById('submissionsList');
  if (!el) return;

  let list = Object.entries(submissions).map(([k,v]) => ({ key:k, ...v }));

  if (sortMode === 'votes') {
    list.sort((a,b) => (b.votes||0) - (a.votes||0));
  } else {
    list.sort((a,b) => b.submittedAt - a.submittedAt);
  }

  if (!list.length) {
    el.innerHTML = '<div class="empty-state">No submissions yet. Be the first!</div>';
    return;
  }

  el.innerHTML = '';
  list.forEach((sub, rank) => {
    el.appendChild(buildSubmissionCard(sub, rank));
  });
}

function buildSubmissionCard(sub, rank) {
  const card = document.createElement('div');
  const isMe = sub.username === username;
  card.className = 'submission-card' + (isMe ? ' mine' : '');

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'sub-card-header';

  const rankEl = document.createElement('span');
  rankEl.style.cssText = 'font-family:var(--font-display);font-size:16px;color:var(--dc-gold)';
  rankEl.textContent = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : '#' + (rank+1);

  const uname = document.createElement('span');
  uname.className = 'sub-username';
  uname.textContent = sub.username + (isMe ? ' (you)' : '');

  const timeEl = document.createElement('span');
  timeEl.className = 'sub-time';
  timeEl.textContent = sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';

  hdr.append(rankEl, uname, timeEl);

  if (sub.flair) {
    const fl = document.createElement('span');
    fl.className = 'sub-flair'; fl.textContent = sub.flair;
    hdr.appendChild(fl);
  }
  card.appendChild(hdr);

  // XI list
  const xiList = document.createElement('div');
  xiList.className = 'sub-xi-list';
  (sub.players || []).forEach((pid, i) => {
    const p = players.find(pl => pl.id === pid);
    const row = document.createElement('div');
    row.className = 'sub-xi-row';
    const num = document.createElement('span'); num.className = 'sub-xi-num'; num.textContent = i+1;
    const nm  = document.createElement('span'); nm.className  = 'sub-xi-name'; nm.textContent = p ? p.name : pid;
    row.append(num, nm);
    if (p) row.appendChild(buildRoleTag(p.role));
    if (p?.overseas) { const os = document.createElement('span'); os.className='os-tag'; os.textContent='OS'; row.appendChild(os); }
    xiList.appendChild(row);
  });
  card.appendChild(xiList);

  // Vote footer
  const footer = document.createElement('div');
  footer.className = 'sub-vote-footer';

  // Check if user has voted for this
  const myVotedKey = 'dc_daily_vote_' + todayKey;
  const myVotedFor = localStorage.getItem(myVotedKey);
  const hasVoted   = myVotedFor === sub.key;
  const canVote    = !isMe && username; // can't vote for own XI

  const voteBtn = document.createElement('button');
  voteBtn.className = 'vote-btn' + (hasVoted ? ' voted' : '');
  voteBtn.innerHTML = (hasVoted ? '❤️' : '🤍') + ' <span>' + (hasVoted ? 'Voted' : 'Vote') + '</span>';
  voteBtn.disabled = isMe;
  if (isMe) voteBtn.style.opacity = '0.4';
  voteBtn.title = isMe ? "Can't vote for your own XI" : hasVoted ? 'Change vote' : 'Vote for this XI';

  voteBtn.addEventListener('click', () => castVote(sub.key, myVotedFor));

  const voteCount = document.createElement('div');
  voteCount.style.marginLeft = 'auto';
  voteCount.style.display = 'flex';
  voteCount.style.flexDirection = 'column';
  voteCount.style.alignItems = 'flex-end';
  voteCount.style.gap = '1px';
  const vc = document.createElement('span'); vc.className = 'vote-count'; vc.textContent = sub.votes || 0;
  const vl = document.createElement('span'); vl.className = 'vote-label'; vl.textContent = 'votes';
  voteCount.append(vc, vl);

  footer.append(voteBtn, voteCount);
  card.appendChild(footer);

  return card;
}

/* ── VOTING ───────────────────────────────────────────── */
async function castVote(targetKey, previousVoteKey) {
  if (!username) { username = await requireUsername(); }
  if (!db) { showNotice('Not connected.'); return; }

  const myVotedKey = 'dc_daily_vote_' + todayKey;

  // Remove previous vote if exists
  if (previousVoteKey && previousVoteKey !== targetKey) {
    const prev = submissions[previousVoteKey];
    if (prev) {
      const prevVotes = Math.max(0, (prev.votes || 0) - 1);
      await db.ref(`dailyXI/${todayKey}/${previousVoteKey}/votes`).set(prevVotes);
    }
  }

  // Toggle vote on target
  if (previousVoteKey === targetKey) {
    // Un-vote
    const cur = submissions[targetKey];
    const newVotes = Math.max(0, (cur?.votes || 0) - 1);
    await db.ref(`dailyXI/${todayKey}/${targetKey}/votes`).set(newVotes);
    localStorage.removeItem(myVotedKey);
    showNotice('Vote removed.');
  } else {
    // Vote
    const cur = submissions[targetKey];
    const newVotes = (cur?.votes || 0) + 1;
    await db.ref(`dailyXI/${todayKey}/${targetKey}/votes`).set(newVotes);
    localStorage.setItem(myVotedKey, targetKey);
    showNotice('Voted! ❤️');
  }
}

/* ── HELPERS ──────────────────────────────────────────── */
function safeKey(name) { return name.replace(/[.#$[\] ]/g,'_'); }

function setupFilters() {
  document.querySelectorAll('.filter-btn[data-df]').forEach(btn => {
    btn.addEventListener('click', () => {
      roleFilter = btn.dataset.df;
      document.querySelectorAll('.filter-btn[data-df]').forEach(b => b.classList.toggle('active', b===btn));
      renderPool();
    });
  });

  document.querySelectorAll('.filter-btn[data-sort]').forEach(btn => {
    btn.addEventListener('click', () => {
      sortMode = btn.dataset.sort;
      document.querySelectorAll('.filter-btn[data-sort]').forEach(b => b.classList.toggle('active', b===btn));
      renderSubmissions();
    });
  });
}

function setupButtons() {
  document.getElementById('submitDailyBtn')?.addEventListener('click', submitXI);
  document.getElementById('clearDailyBtn')?.addEventListener('click', () => {
    if (hasSubmitted) return;
    myPicks = [];
    renderPool(); renderSelectedList(); updateSubmitBtn();
  });
  document.getElementById('editSubmissionBtn')?.addEventListener('click', () => {
    hasSubmitted = false;
    localStorage.removeItem('dc_daily_submitted_' + todayKey);
    document.getElementById('submittedBanner').style.display = 'none';
    updateSubmitBtn();
    showNotice('You can resubmit your XI now.');
  });
}

window.addEventListener('DOMContentLoaded', init);
