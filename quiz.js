/**
 * DC Fan Hub — quiz.js
 * 8-question quiz assigns a DC player twin + fan type flair.
 * Flair saved to localStorage and Firebase, shown in chat.
 */

/* ── QUESTIONS ─────────────────────────────────────────── */
const QUESTIONS = [
  {
    q: "Match day — DC need 20 off the last over. What's your energy?",
    options: [
      { text: "Calm. We've got this. Trust the process.", tags: ['calm','leader'] },
      { text: "SCREAMING at the screen. Every. Single. Ball.", tags: ['loud','passionate'] },
      { text: "Hiding behind a pillow. Can't watch.", tags: ['nervous','superstitious'] },
      { text: "Calculating the required run rate in my head.", tags: ['analytical','stats'] },
    ]
  },
  {
    q: "Your favourite type of DC win is…",
    options: [
      { text: "A dominant, clinical chase — no drama needed.", tags: ['calm','analytical'] },
      { text: "Last-ball thriller. The chaos IS the fun.", tags: ['loud','passionate'] },
      { text: "A bowling masterclass — wickets all game.", tags: ['analytical','defensive'] },
      { text: "Doesn't matter HOW, just that we win.", tags: ['passionate','superstitious'] },
    ]
  },
  {
    q: "Pick your seat at the stadium:",
    options: [
      { text: "Front row, right behind the dugout. Close to the action.", tags: ['passionate','leader'] },
      { text: "Upper tier. Great view, can see the whole field.", tags: ['analytical','calm'] },
      { text: "Wherever my lucky spot is — same seat every match.", tags: ['superstitious'] },
      { text: "Wherever I can hear the crowd loudest.", tags: ['loud','passionate'] },
    ]
  },
  {
    q: "DC are chasing 180. You're batting at 7. First ball you face?",
    options: [
      { text: "Defend and assess the field first.", tags: ['calm','defensive'] },
      { text: "Go for it immediately — no fear.", tags: ['aggressive','passionate'] },
      { text: "Pick my spot, wait for a bad ball, then unleash.", tags: ['analytical','calm'] },
      { text: "Whatever feels right in that moment.", tags: ['instinct','passionate'] },
    ]
  },
  {
    q: "How do you follow DC matches when you can't watch live?",
    options: [
      { text: "Minute-by-minute ball-by-ball commentary refresh.", tags: ['stats','analytical'] },
      { text: "Scoreboard only — commentary makes me nervous.", tags: ['superstitious','nervous'] },
      { text: "Group chat with fellow DC fans, going wild together.", tags: ['loud','passionate'] },
      { text: "I always find a way to watch. No excuses.", tags: ['passionate','leader'] },
    ]
  },
  {
    q: "Favourite DC player archetype?",
    options: [
      { text: "The reliable all-rounder — always delivers.", tags: ['calm','leader'] },
      { text: "The explosive opener — sets the tone from ball one.", tags: ['aggressive','loud'] },
      { text: "The crafty spinner — outsmarting batters.", tags: ['analytical','calm'] },
      { text: "The match-winner who comes through under pressure.", tags: ['passionate','instinct'] },
    ]
  },
  {
    q: "DC lose a close match. What do you do?",
    options: [
      { text: "Analyse what went wrong, move on. It's cricket.", tags: ['analytical','calm'] },
      { text: "Rant for 2 hours, then sleep it off.", tags: ['loud','passionate'] },
      { text: "It's the superstition — I wore the wrong jersey.", tags: ['superstitious'] },
      { text: "Start believing in the next game immediately.", tags: ['leader','passionate'] },
    ]
  },
  {
    q: "If you were a DC player, you'd be known for…",
    options: [
      { text: "Captaining with ice-cold composure.", tags: ['calm','leader','analytical'] },
      { text: "Hitting sixes that silence the stadium.", tags: ['aggressive','loud'] },
      { text: "Taking wickets no one saw coming.", tags: ['analytical','instinct'] },
      { text: "Being the first one celebrating a teammate's success.", tags: ['passionate','loud'] },
    ]
  },
];

/* ── DC PLAYER RESULTS ────────────────────────────────── */
const PLAYER_RESULTS = [
  {
    id: 'axar_patel',
    name: 'Axar Patel',
    desc: "The heartbeat of Delhi Capitals. Cool under pressure, always delivers when it matters. Your team trusts you completely and you never let them down.",
    tags: ['calm','leader','analytical'],
    traits: ['Ice-cool', 'Dependable', 'Match-winner', 'Captain material'],
    fanType: null,
  },
  {
    id: 'kl_rahul',
    name: 'KL Rahul',
    desc: "Elegant, methodical, class personified. You read situations better than anyone and execute perfectly. Stats back you up at every turn.",
    tags: ['calm','analytical','defensive'],
    traits: ['Elegant', 'Data-driven', 'Consistent', 'Class act'],
    fanType: null,
  },
  {
    id: 'kuldeep_yadav',
    name: 'Kuldeep Yadav',
    desc: "The mystery spinner. You see things others miss and love outsmarting the opposition. Quiet before the storm, devastating when unleashed.",
    tags: ['analytical','instinct','calm'],
    traits: ['Tactical', 'Tricky', 'Patient', 'Unreadable'],
    fanType: null,
  },
  {
    id: 'axar_patel_aggressive',
    name: 'Mitchell Starc',
    desc: "Raw pace, no fear. You go straight at the problem, full throttle. Loud, lethal, impossible to ignore.",
    tags: ['aggressive','loud','passionate'],
    traits: ['Fearless', 'Explosive', 'Direct', 'Game-changer'],
    fanType: null,
  },
  {
    id: 'prithvi_shaw',
    name: 'Prithvi Shaw',
    desc: "Pure instinct and flair. You live in the moment, back yourself to the hilt and when it clicks — it's pure magic.",
    tags: ['instinct','aggressive','passionate'],
    traits: ['Instinctive', 'Fearless', 'Explosive', 'Exciting'],
    fanType: null,
  },
  {
    id: 'tristan_stubbs',
    name: 'Tristan Stubbs',
    desc: "The finisher who thrives in chaos. Nerves of steel when the pressure is at its peak. You make the impossible look routine.",
    tags: ['passionate','nervous','superstitious','instinct'],
    traits: ['Clutch player', 'Pressure lover', 'Unflappable', 'Finisher'],
    fanType: null,
  },
  {
    id: 'nitish_rana',
    name: 'Nitish Rana',
    desc: "The passionate heartbeat in the dressing room. You feel everything deeply, celebrate loudly and never stop believing in the cause.",
    tags: ['loud','passionate','leader'],
    traits: ['Heart on sleeve', 'Big celebrations', 'Never gives up', 'Team glue'],
    fanType: null,
  },
];

/* ── FAN TYPES ─────────────────────────────────────────── */
const FAN_TYPES = [
  { id:'stats_nerd',     label:'📊 Stats Nerd',          tags:['stats','analytical'],             desc:'You know every average, every economy rate. Cricket is data.' },
  { id:'loud_fan',       label:'📣 The Loud One',         tags:['loud','passionate'],               desc:'You ARE the 12th man. Your energy lifts the whole stadium.' },
  { id:'superstitious',  label:'🧿 The Superstitious One',tags:['superstitious'],                   desc:'Same seat. Same jersey. Same ritual. Never breaking the streak.' },
  { id:'calm_analyst',   label:'🧊 Ice-Cold Analyst',     tags:['calm','analytical'],               desc:'Nothing rattles you. You see chess moves where others see chaos.' },
  { id:'passionate',     label:'❤️ Die-Hard DC Fan',      tags:['passionate','leader'],             desc:'DC runs through your veins. Win or lose, you show up every time.' },
  { id:'instinct',       label:'⚡ Pure Instinct',         tags:['instinct','aggressive'],           desc:'You play and watch on feel. Logic? Overrated. Vibes? Everything.' },
];

/* ── STATE ─────────────────────────────────────────────── */
let currentQ    = 0;
let scores      = {}; // tag → count
let answers     = [];

/* ── INIT ─────────────────────────────────────────────── */
function init() {
  initFirebase();
  const username = getUsername();
  if (username) document.getElementById('userBadgeName').textContent = username;

  // Show existing flair if already done
  const saved = getSavedFlair();
  if (saved) {
    const block = document.getElementById('existingFlair');
    block.style.display = 'block';
    block.innerHTML = `Your current flair: <strong>${saved.playerName}</strong> · <strong>${saved.fanTypeLabel}</strong><br><span style="font-size:11px;color:var(--dc-muted)">Retake to change it.</span>`;
  }

  document.getElementById('startQuizBtn')?.addEventListener('click', startQuiz);
  document.getElementById('retakeBtn')?.addEventListener('click', () => {
    currentQ = 0; scores = {}; answers = [];
    showScreen('screenQuestion');
    renderQuestion();
  });
}

function getSavedFlair() {
  try { return JSON.parse(localStorage.getItem('dc_flair') || 'null'); } catch { return null; }
}

/* ── QUIZ FLOW ─────────────────────────────────────────── */
function startQuiz() {
  currentQ = 0; scores = {}; answers = [];
  showScreen('screenQuestion');
  renderQuestion();
}

function renderQuestion() {
  const q   = QUESTIONS[currentQ];
  const pct = ((currentQ) / QUESTIONS.length) * 100;

  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('qNum').textContent = `Question ${currentQ + 1} of ${QUESTIONS.length}`;
  document.getElementById('qText').textContent = q.q;

  const opts = document.getElementById('qOptions');
  opts.innerHTML = '';
  const letters = ['A','B','C','D'];

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.setAttribute('role','radio');
    btn.setAttribute('aria-label', opt.text);

    const letter = document.createElement('span');
    letter.className = 'quiz-option-letter';
    letter.textContent = letters[i];

    const text = document.createElement('span');
    text.textContent = opt.text;

    btn.append(letter, text);
    btn.addEventListener('click', () => selectOption(opt.tags, btn));
    opts.appendChild(btn);
  });
}

function selectOption(tags, btn) {
  // Visual feedback
  document.querySelectorAll('.quiz-option').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Score tags
  tags.forEach(t => scores[t] = (scores[t] || 0) + 1);
  answers.push(tags);

  // Advance after short delay
  setTimeout(() => {
    currentQ++;
    if (currentQ >= QUESTIONS.length) {
      showResult();
    } else {
      renderQuestion();
    }
  }, 380);
}

/* ── RESULT ─────────────────────────────────────────────── */
function showResult() {
  // Find best matching player
  const player = PLAYER_RESULTS.reduce((best, p) => {
    const score = p.tags.reduce((s, t) => s + (scores[t] || 0), 0);
    const bestScore = best.tags.reduce((s, t) => s + (scores[t] || 0), 0);
    return score > bestScore ? p : best;
  });

  // Find best matching fan type
  const fanType = FAN_TYPES.reduce((best, f) => {
    const score = f.tags.reduce((s, t) => s + (scores[t] || 0), 0);
    const bestScore = best.tags.reduce((s, t) => s + (scores[t] || 0), 0);
    return score > bestScore ? f : best;
  });

  // Populate result screen
  document.getElementById('resultPlayer').textContent = player.name;
  document.getElementById('resultDesc').textContent   = player.desc;
  document.getElementById('resultFanType').textContent = fanType.label;

  const traits = document.getElementById('resultTraits');
  traits.innerHTML = '';
  player.traits.forEach(t => {
    const chip = document.createElement('span');
    chip.className = 'trait-chip';
    chip.textContent = t;
    traits.appendChild(chip);
  });

  // Save flair
  const flair = {
    playerId:     player.id,
    playerName:   player.name,
    fanTypeId:    fanType.id,
    fanTypeLabel: fanType.label,
    takenAt:      Date.now(),
  };
  localStorage.setItem('dc_flair', JSON.stringify(flair));

  // Save to Firebase if logged in
  const username = getUsername();
  if (db && username) {
    db.ref('flairs/' + username.replace(/[.#$[\]]/g,'_')).set({ ...flair, username });
  }

  showScreen('screenResult');
  document.getElementById('progressFill').style.width = '100%';
}

/* ── HELPERS ─────────────────────────────────────────────── */
function showScreen(id) {
  document.querySelectorAll('.quiz-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}

window.addEventListener('DOMContentLoaded', init);
