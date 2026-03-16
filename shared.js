/**
 * DC Fan Hub — shared.js
 * Loaded by every page. Firebase init, helpers, username, scoring.
 */

/* ── FIREBASE CONFIG ─────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyAWA7VUvNRjU26UpbCZXyXnRKo91ypuEpU",
  authDomain:        "dc-adda.firebaseapp.com",
  databaseURL:       "https://dc-adda-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "dc-adda",
  storageBucket:     "dc-adda.firebasestorage.app",
  messagingSenderId: "439526901841",
  appId:             "1:439526901841:web:c4e10b34dc3c58183bd070",
  measurementId:     "G-FBDW9DT02H"
};

/* ── FIREBASE INIT ────────────────────────────────────── */
let db = null;

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    return true;
  } catch(e) {
    console.error('[Firebase] init failed', e);
    return false;
  }
}

/* ── ROLE HELPERS ────────────────────────────────────── */
const ROLE_LABELS = { bat:'Batsman', bowl:'Bowler', ar:'All-rounder', wk:'Wicket-keeper' };
const ROLE_COLORS = {
  bat:  { bg:'#1a3a5c', text:'#7ec8f7', label:'BAT'  },
  bowl: { bg:'#3a1a1a', text:'#f77e7e', label:'BOWL' },
  ar:   { bg:'#2a2a00', text:'#f5c518', label:'AR'   },
  wk:   { bg:'#1a2a1a', text:'#7ef77e', label:'WK'   },
};

function buildRoleTag(role) {
  const c = ROLE_COLORS[role] || { bg:'#333', text:'#fff', label: role.toUpperCase() };
  const span = document.createElement('span');
  span.className = 'role-tag';
  span.textContent = c.label;
  span.style.cssText = `background:${c.bg};color:${c.text};border:1px solid ${c.text};font-size:8px;font-weight:800;padding:2px 5px;border-radius:3px;letter-spacing:0.04em;line-height:1;display:inline-flex;align-items:center;flex-shrink:0;`;
  return span;
}

/* ── USERNAME ─────────────────────────────────────────── */
const LS_USERNAME = 'dc_hub_username';

function getUsername()       { return localStorage.getItem(LS_USERNAME) || null; }
function setUsername(name)   { localStorage.setItem(LS_USERNAME, name.trim()); }

function requireUsername() {
  return new Promise(resolve => {
    const u = getUsername();
    if (u) { resolve(u); return; }
    showUsernameModal(resolve);
  });
}

function showUsernameModal(onSave) {
  // Remove existing modal if any
  document.getElementById('__usernameModal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = '__usernameModal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#062041;border:1px solid rgba(255,255,255,0.18);border-radius:16px;padding:32px 24px;width:min(380px,95vw);text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.7);">
      <div style="width:48px;height:48px;background:#e8132b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:22px;color:#fff;margin:0 auto 16px;box-shadow:0 0 0 2px #f5c518;">DC</div>
      <h3 style="font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:0.05em;margin-bottom:8px;">Welcome to DC Fan Hub</h3>
      <p style="font-size:12px;color:#8fa8c8;margin-bottom:18px;line-height:1.5;">Choose a display name to join the chat and fantasy league.<br>No password needed.</p>
      <input type="text" id="__uInput" style="width:100%;background:#0b2c55;border:1.5px solid rgba(255,255,255,0.18);border-radius:8px;padding:11px 14px;color:#f5f7fa;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;outline:none;box-sizing:border-box;" placeholder="Your fan name e.g. DCFan42" maxlength="20" autocomplete="off"/>
      <div id="__uErr" style="font-size:11px;color:#e8132b;min-height:16px;margin-top:6px;"></div>
      <button id="__uSave" style="width:100%;margin-top:14px;background:#e8132b;color:#fff;border:none;border-radius:8px;padding:11px;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:0.06em;cursor:pointer;">Let's Go →</button>
    </div>`;
  document.body.appendChild(overlay);

  const input  = overlay.querySelector('#__uInput');
  const errEl  = overlay.querySelector('#__uErr');
  const saveBtn= overlay.querySelector('#__uSave');
  input.focus();

  const save = () => {
    const val = input.value.trim();
    if (!val || val.length < 2) { errEl.textContent = 'Name must be at least 2 characters.'; return; }
    if (!/^[a-zA-Z0-9_ ]+$/.test(val)) { errEl.textContent = 'Letters, numbers, spaces and _ only.'; return; }
    setUsername(val);
    overlay.remove();
    if (onSave) onSave(val);
  };
  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
  input.addEventListener('focus', () => { input.style.borderColor = '#f5c518'; });
  input.addEventListener('blur',  () => { input.style.borderColor = 'rgba(255,255,255,0.18)'; });
}

/* ── FLAIR ────────────────────────────────────────────── */
function getSavedFlair() {
  try { return JSON.parse(localStorage.getItem('dc_flair') || 'null'); } catch { return null; }
}

/* ── FANTASY SCORING ──────────────────────────────────── */
const SCORING = {
  run:1, run50Bonus:10, run100Bonus:20,
  wicket:20, wicket3Bonus:10, wicket5Bonus:20,
  catch:8, stumping:8, momBonus:25,
  econ:[{max:5,pts:8},{max:6,pts:6},{max:7,pts:4},{max:9,pts:0},{max:10,pts:-2},{max:999,pts:-4}],
  sr:[{min:170,pts:8},{min:150,pts:6},{min:130,pts:4},{min:100,pts:0},{min:70,pts:-2},{min:0,pts:-4}],
};

function computePlayerPoints(s={}) {
  let pts=0;
  const runs=s.runs||0; pts+=runs*SCORING.run;
  if(runs>=100)pts+=SCORING.run100Bonus; else if(runs>=50)pts+=SCORING.run50Bonus;
  const balls=s.balls||0;
  if(balls>=10){const sr=(runs/balls)*100;for(const b of SCORING.sr){if(sr>=b.min){pts+=b.pts;break;}}}
  const wkts=s.wickets||0; pts+=wkts*SCORING.wicket;
  if(wkts>=5)pts+=SCORING.wicket5Bonus; else if(wkts>=3)pts+=SCORING.wicket3Bonus;
  const overs=s.overs||0;
  if(overs>=2){const ec=(s.runsConceded||0)/overs;for(const b of SCORING.econ){if(ec<=b.max){pts+=b.pts;break;}}}
  pts+=(s.catches||0)*SCORING.catch+(s.stumpings||0)*SCORING.stumping;
  if(s.mom)pts+=SCORING.momBonus;
  return Math.round(pts);
}

function computeTeamPoints(team,matchStats){
  let total=0; const breakdown={};
  for(const pid of(team.players||[])){
    const s=matchStats[pid]||{}; let pts=computePlayerPoints(s);
    if(pid===team.captain)pts=Math.round(pts*2);
    if(pid===team.viceCaptain)pts=Math.round(pts*1.5);
    breakdown[pid]=pts; total+=pts;
  }
  return {total,breakdown};
}

/* ── NOTICE TOAST ─────────────────────────────────────── */
let _noticeTimer=null;
function showNotice(msg) {
  let n=document.getElementById('hubNotice');
  if(!n){n=document.createElement('div');n.id='hubNotice';
    Object.assign(n.style,{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%)',
    background:'#0e335f',color:'#f5f7fa',border:'1px solid rgba(255,255,255,0.2)',borderRadius:'10px',
    padding:'12px 22px',zIndex:'8888',fontFamily:"'DM Sans',sans-serif",fontSize:'13px',fontWeight:'600',
    boxShadow:'0 8px 24px rgba(0,0,0,0.5)',pointerEvents:'none',transition:'opacity 0.3s',
    maxWidth:'90vw',textAlign:'center',opacity:'0'});
    document.body.appendChild(n);
  }
  n.textContent=msg; n.style.opacity='1';
  if(_noticeTimer)clearTimeout(_noticeTimer);
  _noticeTimer=setTimeout(()=>n.style.opacity='0',3000);
}

/* ── DATE HELPERS ─────────────────────────────────────── */
function fmtDate(ts){return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});}
function fmtTime(ts){return new Date(ts).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});}
function safeKey(n){return(n||'').replace(/[.#$[\] ]/g,'_');}
