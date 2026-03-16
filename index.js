/**
 * DC Fan Hub — index.js
 * Home page: Live chat, match schedule, screening rooms.
 */

/* ── STATE ───────────────────────────────────────────── */
let currentChannel = 'general';
let username       = null;
let chatListener   = null;
let onlineRef      = null;
let onlineKey      = null;

/* ── NOTICE ──────────────────────────────────────────── */
let noticeTimer = null;
function showNotice(msg) {
  const n = document.getElementById('hubNotice');
  if (!n) return;
  n.textContent = msg; n.style.opacity = '1';
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => n.style.opacity = '0', 3000);
}

/* ── INIT ────────────────────────────────────────────── */
async function init() {
  initFirebase();
  username = getUsername();
  updateUserBadge();
  loadMatches();
  loadRooms();
  setupChat();
  setupRoomModal();
  setupChannelTabs();
  loadStats();
  setActiveNav();
  // Mark user online
  if (username && db) trackOnline();
}

function updateUserBadge() {
  const el = document.getElementById('userBadgeName');
  if (el) el.textContent = username || 'Guest';
  document.getElementById('userBadge')?.addEventListener('click', () => {
    localStorage.removeItem('dc_hub_username');
    showUsernameModal(name => { username = name; updateUserBadge(); if (db) trackOnline(); });
  });
}

/* ── ONLINE TRACKING ─────────────────────────────────── */
function trackOnline() {
  if (!db || !username) return;
  onlineRef = db.ref('online/' + username.replace(/\s/g,'_'));
  onlineRef.set({ name: username, ts: Date.now() });
  onlineRef.onDisconnect().remove();

  db.ref('online').on('value', snap => {
    const count = snap.numChildren();
    const el = document.getElementById('onlineCount');
    if (el) el.textContent = count + ' online';
    const stat = document.getElementById('statOnline');
    if (stat) stat.textContent = count;
  });
}

/* ── STATS ───────────────────────────────────────────── */
function loadStats() {
  if (!db) return;
  // Message count today
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  db.ref('chat/general').orderByChild('ts').startAt(todayStart.getTime()).on('value', snap => {
    const stat = document.getElementById('statMsgs');
    if (stat) stat.textContent = snap.numChildren();
  });
  // Fantasy team count
  db.ref('fantasy/teams').on('value', snap => {
    const stat = document.getElementById('statFantasy');
    if (stat) stat.textContent = snap.numChildren();
  });
}

/* ── MATCHES ─────────────────────────────────────────── */
function loadMatches() {
  if (!db) { renderMatches([]); return; }
  // Use plain .on('value') without orderByChild to avoid index issues
  // Sort client-side instead
  db.ref('matches').on('value', snap => {
    const matches = [];
    snap.forEach(child => matches.push({ id: child.key, ...child.val() }));
    matches.sort((a,b) => (a.ts||0) - (b.ts||0));
    renderMatches(matches);
    populateRoomMatchSelect(matches);
  });
}

function renderMatches(matches) {
  const el = document.getElementById('matchList');
  if (!el) return;
  if (!matches.length) {
    el.innerHTML = '<div class="empty-state">No matches scheduled yet.</div>'; return;
  }
  const now = Date.now();
  el.innerHTML = '';
  matches.forEach(m => {
    const card = document.createElement('div');
    const isLive = m.ts <= now && now <= m.ts + 4*60*60*1000 && !m.result;
    card.className = 'match-card' + (isLive ? ' live' : '');

    const vs = document.createElement('div');
    vs.className = 'match-vs';
    vs.textContent = 'DC vs ' + (m.opponent || '?');

    const right = document.createElement('div');
    right.style.cssText = 'display:flex;flex-direction:column;align-items:flex-end;gap:3px';
    const date = document.createElement('div');
    date.className = 'match-date';
    date.textContent = fmtDate(m.ts) + ' · ' + fmtTime(m.ts);

    if (isLive) {
      const live = document.createElement('span');
      live.className = 'badge badge-red';
      live.textContent = '● LIVE';
      right.appendChild(live);
    } else if (m.result) {
      const res = document.createElement('div');
      res.className = 'match-result';
      res.textContent = m.result;
      right.appendChild(res);
    }
    right.appendChild(date);
    card.append(vs, right);
    el.appendChild(card);
  });

  // Update live dot
  const hasLive = matches.some(m => m.ts <= now && now <= m.ts + 4*60*60*1000 && !m.result);
  const dot = document.getElementById('matchLiveDot');
  const lbl = document.getElementById('matchLiveLabel');
  if (dot) dot.className = 'live-dot' + (hasLive ? ' on' : '');
  if (lbl) { lbl.textContent = hasLive ? 'LIVE NOW' : 'Scheduled'; lbl.className = hasLive ? 'badge badge-red' : 'badge badge-muted'; }
}

function populateRoomMatchSelect(matches) {
  const sel = document.getElementById('roomMatch');
  if (!sel) return;
  sel.innerHTML = '<option value="">— No match selected —</option>';
  matches.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = 'DC vs ' + (m.opponent || '?') + ' · ' + fmtDate(m.ts);
    sel.appendChild(opt);
  });
}

/* ── SCREENING ROOMS ─────────────────────────────────── */
function loadRooms() {
  if (!db) return;
  db.ref('rooms').on('value', snap => {
    const rooms = [];
    snap.forEach(c => rooms.push({ id: c.key, ...c.val() }));
    renderRooms(rooms);
  });
}

function renderRooms(rooms) {
  const el = document.getElementById('roomList');
  if (!el) return;
  if (!rooms.length) {
    el.innerHTML = '<div class="empty-state">No screening rooms yet. Create one to watch together!</div>'; return;
  }
  el.innerHTML = '';
  rooms.forEach(r => {
    const card = document.createElement('div');
    card.className = 'room-card';

    const info = document.createElement('div');
    info.style.flex = '1';
    const name = document.createElement('div');
    name.className = 'room-name';
    name.textContent = r.name || 'Screening Room';
    const matchTag = document.createElement('div');
    matchTag.className = 'room-match-tag';
    matchTag.textContent = r.matchLabel || 'Open room · ' + fmtDate(r.createdAt);
    info.append(name, matchTag);

    const join = document.createElement('a');
    join.className = 'room-join-btn';
    join.href = r.link;
    join.target = '_blank';
    join.rel = 'noopener noreferrer';
    join.textContent = '▶ Join';

    const del = document.createElement('button');
    del.className = 'room-delete-btn';
    del.textContent = '✕';
    del.title = 'Delete room';
    del.addEventListener('click', () => {
      if (confirm('Delete this room?')) db.ref('rooms/' + r.id).remove();
    });

    card.append(info, join, del);
    el.appendChild(card);
  });
}

function setupRoomModal() {
  document.getElementById('createRoomBtn')?.addEventListener('click', async () => {
    if (!username) username = await requireUsername();
    document.getElementById('roomModal').hidden = false;
  });
  document.getElementById('roomModalClose')?.addEventListener('click', () => {
    document.getElementById('roomModal').hidden = true;
  });
  document.getElementById('roomSaveBtn')?.addEventListener('click', saveRoom);
  document.getElementById('roomModal')?.addEventListener('click', e => {
    if (e.target.id === 'roomModal') e.target.hidden = true;
  });
}

async function saveRoom() {
  const name  = document.getElementById('roomName')?.value.trim();
  const link  = document.getElementById('roomLink')?.value.trim();
  const matchSel = document.getElementById('roomMatch');
  if (!name) { showNotice('Please enter a room name.'); return; }
  if (!link || !link.startsWith('http')) { showNotice('Please enter a valid Google Meet link.'); return; }

  const matchId    = matchSel?.value || '';
  const matchLabel = matchSel?.options[matchSel.selectedIndex]?.text || '';

  await db.ref('rooms').push({
    name, link, matchId,
    matchLabel: matchId ? matchLabel : '',
    createdBy: username,
    createdAt: Date.now(),
  });
  document.getElementById('roomModal').hidden = true;
  document.getElementById('roomName').value = '';
  document.getElementById('roomLink').value = '';
  showNotice('Room created! ✅');
}

/* ── LIVE CHAT ───────────────────────────────────────── */
function setupChat() {
  subscribeChannel(currentChannel);
  document.getElementById('chatSendBtn')?.addEventListener('click', sendMessage);
  document.getElementById('chatInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => sendReaction(btn.dataset.emoji));
  });
}

function setupChannelTabs() {
  document.querySelectorAll('.channel-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentChannel = btn.dataset.channel;
      document.querySelectorAll('.channel-btn').forEach(b => b.classList.toggle('active', b === btn));
      // Clear messages
      const msgs = document.getElementById('chatMessages');
      if (msgs) msgs.innerHTML = '<div class="chat-welcome"><span>📡 Loading ' + currentChannel + ' channel…</span></div>';
      subscribeChannel(currentChannel);
    });
  });
}

function subscribeChannel(channel) {
  if (chatListener && db) db.ref('chat/' + chatListener).off();
  chatListener = channel;

  if (!db) {
    document.getElementById('chatMessages').innerHTML =
      '<div class="chat-welcome"><span>⚠️ Could not connect to chat. Check Firebase config.</span></div>';
    return;
  }

  // Load last 60 messages
  db.ref('chat/' + channel)
    .orderByChild('ts')
    .limitToLast(60)
    .on('value', snap => {
      const msgs = [];
      snap.forEach(c => msgs.push({ key: c.key, ...c.val() }));
      renderMessages(msgs);
    });
}

function renderMessages(msgs) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;

  container.innerHTML = '';
  if (!msgs.length) {
    container.innerHTML = '<div class="chat-welcome"><span>No messages yet. Say hello! 👋</span></div>';
    return;
  }

  msgs.forEach(m => container.appendChild(buildMsgEl(m)));
  if (wasAtBottom) container.scrollTop = container.scrollHeight;
}

function buildMsgEl(m) {
  const div = document.createElement('div');

  if (m.type === 'reaction') {
    div.className = 'chat-msg reaction-msg';
    div.innerHTML = `<span title="${m.user}">${m.emoji}</span>`;
    return div;
  }

  div.className = 'chat-msg' + (m.user === username ? ' mine' : '');
  const hdr = document.createElement('div');
  hdr.className = 'msg-header';
  const user = document.createElement('span');
  user.className = 'msg-user';
  user.textContent = m.user || 'Fan';
  // Flair badge
  if (m.flair) {
    const fl = document.createElement('span');
    fl.style.cssText = 'font-size:9px;background:rgba(232,19,43,0.12);border:1px solid rgba(232,19,43,0.3);border-radius:10px;padding:1px 6px;color:var(--dc-red);font-weight:600;';
    fl.textContent = m.flair;
    hdr.append(user, fl);
  } else {
    hdr.appendChild(user);
  }
  const time = document.createElement('span');
  time.className = 'msg-time';
  time.style.marginLeft = 'auto';
  time.textContent = m.ts ? new Date(m.ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) : '';
  hdr.appendChild(time);

  const text = document.createElement('div');
  text.className = 'msg-text';
  text.textContent = m.text || '';

  div.append(hdr, text);
  return div;
}

async function sendMessage() {
  if (!username) username = await requireUsername();
  const input = document.getElementById('chatInput');
  const text  = input?.value.trim();
  if (!text) return;
  if (!db) { showNotice('Not connected to chat.'); return; }

  // Attach flair if user has taken the quiz
  let flair = null;
  try { flair = JSON.parse(localStorage.getItem('dc_flair') || 'null'); } catch {}

  await db.ref('chat/' + currentChannel).push({
    user: username, text, ts: Date.now(), type: 'message',
    flair: flair ? flair.fanTypeLabel : null,
  });
  input.value = '';

  // Auto-scroll
  const msgs = document.getElementById('chatMessages');
  if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

async function sendReaction(emoji) {
  if (!username) username = await requireUsername();
  if (!db) return;
  await db.ref('chat/' + currentChannel).push({
    user: username, emoji, ts: Date.now(), type: 'reaction'
  });
}

/* ── BOOT ────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', init);
