/**
 * DC Fan Hub — game.js
 * Tap batting mini-game.
 * 6 balls per innings. Time your tap as ball reaches crease.
 * Scoring: perfect tap = 4/6, early/late = 1/2, miss = dot/out
 */

const BOWLERS = [
  { name:'Bumrah', emoji:'🔥', speed:'FAST', deliveryTime:900  },
  { name:'Nortje',  emoji:'⚡', speed:'PACE', deliveryTime:800  },
  { name:'Rashid',  emoji:'🌀', speed:'SPIN', deliveryTime:1200 },
  { name:'Chahal',  emoji:'🔄', speed:'SPIN', deliveryTime:1100 },
  { name:'Shami',   emoji:'💨', speed:'SEAM', deliveryTime:950  },
  { name:'Natarajan',emoji:'🎯',speed:'SWING',deliveryTime:1000 },
];

const DC_PLAYERS = [
  'KL Rahul','Prithvi Shaw','Axar Patel','Tristan Stubbs','David Miller',
  'Nitish Rana','Sameer Rizvi','Abishek Porel','Ashutosh Sharma',
];

/* ── GAME STATE ─────────────────────────────────────────── */
let gameState = 'idle'; // idle | bowling | result | over
let runs = 0, balls = 0, wickets = 0;
let ballResults = []; // 'dot','1','2','4','6','W'
let currentBowler = null;
let ballAnimFrame = null;
let ballStartTime = 0;
let deliveryActive = false;

/* ── DOM REFS ───────────────────────────────────────────── */
const tapBtn       = document.getElementById('tapBtn');
const tapBtnLabel  = document.getElementById('tapBtnLabel');
const tapHint      = document.getElementById('tapHint');
const ballEl       = document.getElementById('ballEl');
const pitchLane    = document.getElementById('pitchLane');
const timingZone   = document.getElementById('timingZone');
const shotResult   = document.getElementById('shotResult');
const ballInds     = document.getElementById('ballIndicators');

/* ── INIT ───────────────────────────────────────────────── */
function init() {
  initFirebase();
  const username = getUsername();
  if (username) document.getElementById('userBadgeName').textContent = username;

  // Set random batter name
  const batter = DC_PLAYERS[Math.floor(Math.random() * DC_PLAYERS.length)];
  document.getElementById('batterName').textContent = batter;

  setupBallIndicators();
  loadHighScores();

  tapBtn.disabled = false;
  tapBtn.classList.add('pulse');
  tapBtnLabel.textContent = 'TAP TO START';
  tapBtn.addEventListener('click', handleTap);
  tapBtn.addEventListener('touchend', e => { e.preventDefault(); handleTap(); });

  document.getElementById('playAgainBtn')?.addEventListener('click', resetGame);
  document.getElementById('saveScoreBtn')?.addEventListener('click', saveScore);
}

function setupBallIndicators() {
  ballInds.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const d = document.createElement('div');
    d.className = 'ball-ind';
    d.id = 'ind_' + i;
    ballInds.appendChild(d);
  }
}

/* ── MAIN TAP HANDLER ───────────────────────────────────── */
function handleTap() {
  if (gameState === 'idle') {
    startInnings();
    return;
  }
  if (gameState === 'bowling' && deliveryActive) {
    judgeShot();
    return;
  }
  if (gameState === 'result') {
    nextBall();
    return;
  }
}

/* ── INNINGS ────────────────────────────────────────────── */
function startInnings() {
  gameState = 'bowling';
  balls = 0; runs = 0; wickets = 0; ballResults = [];
  updateScoreboard();
  setupBallIndicators();
  deliverBall();
}

function deliverBall() {
  if (balls >= 6) { endInnings(); return; }

  currentBowler = BOWLERS[Math.floor(Math.random() * BOWLERS.length)];
  document.getElementById('bowlerName').textContent = currentBowler.name;
  document.getElementById('bowlerFigure').textContent = currentBowler.emoji;

  shotResult.textContent = '';
  tapBtnLabel.textContent = 'TAP!';
  tapHint.textContent = 'Tap when the ball reaches the crease!';
  timingZone.classList.add('show');

  // Animate ball from top to bottom of pitch
  ballEl.style.display = 'block';
  const laneH = pitchLane.offsetHeight || 140;
  ballEl.style.top = '8%';
  ballEl.style.bottom = 'auto';

  deliveryActive = false;
  const duration = currentBowler.deliveryTime;
  ballStartTime  = performance.now();

  // Random variation to keep player on toes
  const actualDuration = duration + (Math.random() - 0.5) * 200;

  function animateBall(ts) {
    const elapsed  = ts - ballStartTime;
    const progress = Math.min(elapsed / actualDuration, 1);
    const topPct   = 8 + progress * 76; // 8% → 84%
    ballEl.style.top = topPct + '%';

    // Enable tapping when ball is in mid-zone (past 30%)
    if (progress > 0.3) deliveryActive = true;

    if (progress < 1) {
      ballAnimFrame = requestAnimationFrame(animateBall);
    } else {
      // Ball reached batter — auto dot/miss
      deliveryActive = false;
      cancelAnimationFrame(ballAnimFrame);
      resolveMiss();
    }
  }

  ballAnimFrame = requestAnimationFrame(animateBall);
}

/* ── JUDGE SHOT ─────────────────────────────────────────── */
function judgeShot() {
  if (!deliveryActive) return;
  cancelAnimationFrame(ballAnimFrame);
  deliveryActive = false;

  const elapsed   = performance.now() - ballStartTime;
  const duration  = currentBowler.deliveryTime;
  const progress  = elapsed / duration; // 0→1

  // Sweet spot: 0.75–0.92 (ball near crease)
  let outcome, label, runVal = 0;

  if (progress >= 0.75 && progress <= 0.92) {
    // PERFECT timing
    const rand = Math.random();
    if (rand < 0.35)      { outcome='six';    label='SIX! 🔥';      runVal=6; }
    else if (rand < 0.70) { outcome='four';   label='FOUR! 💥';     runVal=4; }
    else                   { outcome='two';    label='TWO RUNS';      runVal=2; }
  } else if (progress >= 0.60 && progress < 0.75) {
    // Early
    const rand = Math.random();
    if (rand < 0.5)        { outcome='two';    label='TWO RUNS';      runVal=2; }
    else                   { outcome='one';    label='ONE RUN';        runVal=1; }
  } else if (progress > 0.92 && progress <= 1.05) {
    // Late
    const rand = Math.random();
    if (rand < 0.4)        { outcome='one';    label='ONE RUN';        runVal=1; }
    else if (rand < 0.7)   { outcome='dot';    label='DOT BALL';       runVal=0; }
    else                   { outcome='out';    label='OUT! CAUGHT! 😱'; runVal=-1; }
  } else {
    // Very early — likely mishit
    const rand = Math.random();
    if (rand < 0.6)        { outcome='out';    label='OUT! EDGED! 😱'; runVal=-1; }
    else                   { outcome='dot';    label='DOT BALL';       runVal=0; }
  }

  resolveOutcome(outcome, label, runVal);
}

function resolveMiss() {
  // Ball passed without tap
  const rand = Math.random();
  if (rand < 0.3) {
    resolveOutcome('out', 'OUT! BOWLED! 😱', -1);
  } else {
    resolveOutcome('dot', 'DOT BALL', 0);
  }
}

function resolveOutcome(outcome, label, runVal) {
  ballEl.style.display = 'none';
  timingZone.classList.remove('show');
  deliveryActive = false;
  gameState = 'result';

  // Update runs/wickets
  if (runVal > 0) runs += runVal;
  if (outcome === 'out') wickets++;

  ballResults.push(outcome);
  balls++;

  // Show result
  shotResult.textContent = label;
  shotResult.style.color = outcome === 'out' ? '#f77e7e' : outcome === 'six' ? '#e8132b' : outcome === 'four' ? '#f5c518' : 'var(--dc-gold)';

  // Update ball indicator
  const ind = document.getElementById('ind_' + (balls-1));
  if (ind) {
    ind.className = 'ball-ind ' + (outcome === 'out' ? 'out' : outcome === 'six' ? 'six' : runVal > 0 ? 'scored' : 'dot');
  }

  updateScoreboard();

  if (balls >= 6 || wickets >= 3) {
    tapBtnLabel.textContent = 'INNINGS OVER';
    tapHint.textContent = '';
    setTimeout(endInnings, 1000);
  } else {
    tapBtnLabel.textContent = 'NEXT BALL →';
    tapHint.textContent = 'Tap for next delivery';
  }
}

function nextBall() {
  if (balls >= 6 || wickets >= 3) return;
  gameState = 'bowling';
  deliverBall();
}

/* ── SCOREBOARD ─────────────────────────────────────────── */
function updateScoreboard() {
  document.getElementById('gameRuns').textContent    = runs;
  document.getElementById('gameBalls').textContent   = balls;
  document.getElementById('gameWickets').textContent = wickets;
  document.getElementById('gameOver').textContent    = Math.floor(balls/6) + 1;
}

/* ── END INNINGS ────────────────────────────────────────── */
function endInnings() {
  gameState = 'over';
  const grade = getGrade(runs);
  document.getElementById('gameOverTitle').textContent = 'INNINGS OVER!';
  document.getElementById('gameOverScore').textContent = runs + ' (' + balls + ' balls)';
  document.getElementById('gameOverGrade').textContent = grade;
  document.getElementById('gameOverModal').hidden = false;
  updateHighScoreDisplay();
}

function getGrade(r) {
  if (r >= 50)  return '🏆 CENTURY MATERIAL! Incredible hitting!';
  if (r >= 36)  return '🔥 MATCH-WINNER! Outstanding!';
  if (r >= 24)  return '💪 SOLID INNINGS! Well played!';
  if (r >= 12)  return '👍 DECENT KNOCK. Keep practising!';
  return '📚 Hit the nets, champion. You\'ll get there!';
}

/* ── RESET ──────────────────────────────────────────────── */
function resetGame() {
  document.getElementById('gameOverModal').hidden = true;
  runs = 0; balls = 0; wickets = 0; ballResults = [];
  shotResult.textContent = '';
  updateScoreboard();
  setupBallIndicators();
  gameState = 'idle';
  tapBtnLabel.textContent = 'TAP TO START';
  tapHint.textContent = 'Tap when the ball reaches the crease!';
  tapBtn.classList.add('pulse');
}

/* ── HIGH SCORES ────────────────────────────────────────── */
async function saveScore() {
  let username = getUsername();
  if (!username) username = await requireUsername();
  if (!db) { showNotice('Not connected.'); return; }

  const scoreObj = {
    username, runs, balls, wickets,
    sr: balls > 0 ? Math.round(runs / balls * 100) : 0,
    savedAt: Date.now(),
  };

  // Only save if better than existing
  const existing = await db.ref('gameScores/' + username.replace(/[.#$[\]]/g,'_')).once('value');
  if (!existing.val() || existing.val().runs < runs) {
    await db.ref('gameScores/' + username.replace(/[.#$[\]]/g,'_')).set(scoreObj);
    showNotice('Score saved! 🏆');
    loadHighScores();
  } else {
    showNotice('Your best is ' + existing.val().runs + ' — keep trying!');
  }
  document.getElementById('gameOverModal').hidden = true;
  resetGame();
}

function loadHighScores() {
  if (!db) return;
  db.ref('gameScores').on('value', snap => {
    const scores = [];
    snap.forEach(c => scores.push(c.val()));
    scores.sort((a,b) => b.runs - a.runs);
    renderHighScores(scores);
  });
}

function renderHighScores(scores) {
  const el = document.getElementById('highScoreList');
  if (!el) return;
  const username = getUsername();
  if (!scores.length) { el.innerHTML = '<div class="empty-state">No scores yet. Be the first!</div>'; return; }
  el.innerHTML = '';
  scores.slice(0,10).forEach((s,i) => {
    const row = document.createElement('div');
    row.className = 'hiscore-row';
    if (s.username === username) row.style.borderColor = 'rgba(245,197,24,0.4)';
    row.innerHTML = `
      <span class="hiscore-rank">${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
      <span class="hiscore-name">${s.username}${s.username===username?' (you)':''}</span>
      <span class="hiscore-sr">SR ${s.sr||0}</span>
      <span class="hiscore-pts">${s.runs}</span>`;
    el.appendChild(row);
  });

  // My best badge
  const me = scores.find(s => s.username === username);
  const badge = document.getElementById('myBestBadge');
  if (me && badge) badge.textContent = 'Your best: ' + me.runs;
}

function updateHighScoreDisplay() {
  // Refresh after game over
  if (db) db.ref('gameScores').once('value', snap => {
    const scores = [];
    snap.forEach(c => scores.push(c.val()));
    scores.sort((a,b) => b.runs - a.runs);
    renderHighScores(scores);
  });
}

let noticeTimer = null;
function showNotice(msg) {
  const n = document.getElementById('hubNotice');
  if (!n) return;
  n.textContent = msg; n.style.opacity = '1';
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => n.style.opacity = '0', 3000);
}

window.addEventListener('DOMContentLoaded', init);
