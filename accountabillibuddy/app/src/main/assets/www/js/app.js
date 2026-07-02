/* ═══════════════════════════════════════════════
   Accountabillibuddy v0.1 — practice-buddy preview
   ═══════════════════════════════════════════════ */
'use strict';

const STORE_KEY = 'abb.state.v1';
const MILESTONES = [3, 7, 14, 30, 60, 100];
const $ = (sel) => document.querySelector(sel);

/* ── state ─────────────────────────────────── */
let S = load();

function load() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || null; }
  catch { return null; }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }

function freshState(name, goal, cat, time) {
  return {
    name, goal, cat, time,                 // time = "HH:MM"
    createdAt: dateKey(new Date()),
    days: {},                              // "YYYY-MM-DD" -> {you, youLate, youNote, buddy, buddyNote}
    sound: true, haptics: true,
    celebrated: [],                        // milestone numbers already shown
  };
}

/* ── date helpers ──────────────────────────── */
function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function todayKey() { return dateKey(new Date()); }
function niceDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}
function shortDate(key) {
  const d = new Date(key + 'T12:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ── buddy simulation (Sunny) ──────────────── */
const BUDDY_NOTES = [
  'did mine before breakfast — your turn! ☀️',
  'kept it small today, but kept it. proud of us.',
  'nearly skipped, then pictured our page empty. nope!',
  'done!! the hardest part was starting, as always.',
  'stamped! meet you here tomorrow 🌻',
  'that\'s another one in the book for me. go get yours!',
  'showed up sleepy. still counts. still proud.',
  'our streak made me do it. peer pressure, but wholesome.',
  'done early today — felt amazing. rooting for you!',
  'ticked mine off during lunch. the page looks lonely with one stamp…',
  'rain, zero motivation, did it anyway. your move 😄',
  'if you\'ve done it, stamp it! if not — five tiny minutes, go!',
];
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/* Sunny checks in at user's target time + deterministic offset (−25..+95 min) */
function buddyCheckinDate(key) {
  const [hh, mm] = S.time.split(':').map(Number);
  const offset = (hashStr(key + '🌻') % 121) - 25;
  const d = new Date(key + 'T12:00'); d.setHours(hh, mm + offset, 0, 0);
  return d;
}
function buddyNoteFor(key) { return BUDDY_NOTES[hashStr(key) % BUDDY_NOTES.length]; }

/* Materialize buddy check-ins up to now (idempotent) */
function syncBuddy() {
  const start = new Date(S.createdAt + 'T12:00');
  for (let d = start; dateKey(d) <= todayKey(); d = addDays(d, 1)) {
    const key = dateKey(d);
    const day = (S.days[key] = S.days[key] || {});
    if (!day.buddy && new Date() >= buddyCheckinDate(key)) {
      day.buddy = buddyCheckinDate(key).getTime();
      day.buddyNote = buddyNoteFor(key);
      if (key === todayKey() && document.body.dataset.ready) {
        renderHome(true);      // buddy stamps live while app is open
        chime();
      }
    }
  }
  save();
}

/* ── streaks & freezes (pure function of days) ── */
function computeStreaks() {
  const start = new Date(S.createdAt + 'T12:00');
  let pair = 0, you = 0, freezes = 0, earnedRun = 0;
  const frozen = {};
  for (let d = start; dateKey(d) <= todayKey(); d = addDays(d, 1)) {
    const key = dateKey(d), day = S.days[key] || {}, isToday = key === todayKey();
    if (day.you) {
      you++; earnedRun++;
      if (earnedRun % 7 === 0 && freezes < 3) freezes++;
      pair = day.buddy ? pair + 1 : pair;
    } else if (isToday) {
      /* today isn't a miss yet */
    } else if (freezes > 0) {
      freezes--; frozen[key] = true;      // streak survives, run resets
      earnedRun = 0;
    } else {
      pair = 0; you = 0; earnedRun = 0;
    }
  }
  return { pair, you, freezes, frozen };
}

/* ── audio & haptics ───────────────────────── */
let AC = null;
function ctx() { return (AC = AC || new (window.AudioContext || window.webkitAudioContext)()); }
function thunk() {
  if (!S.sound) return;
  try {
    const c = ctx(), t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.2);
    const buf = c.createBuffer(1, c.sampleRate * 0.06, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const n = c.createBufferSource(), ng = c.createGain(), f = c.createBiquadFilter();
    n.buffer = buf; f.type = 'lowpass'; f.frequency.value = 900;
    ng.gain.setValueAtTime(0.25, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    n.connect(f).connect(ng).connect(c.destination); n.start(t);
  } catch { /* audio unavailable */ }
}
function chime() {
  if (!S.sound) return;
  try {
    const c = ctx(), t = c.currentTime;
    [[660, 0], [880, 0.13]].forEach(([hz, dt]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = hz;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.5);
      o.connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + 0.55);
    });
  } catch { /* audio unavailable */ }
}
function buzz(ms) { if (S.haptics && navigator.vibrate) navigator.vibrate(ms); }

/* ── screens & nav ─────────────────────────── */
function show(name) {
  ['onboarding', 'home', 'journal', 'settings'].forEach((s) => {
    $('#screen-' + s).hidden = s !== name;
  });
  $('#tabbar').hidden = name === 'onboarding';
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.screen === name));
  if (name === 'home') renderHome();
  if (name === 'journal') renderJournal();
  if (name === 'settings') renderSettings();
}
document.querySelectorAll('.tab').forEach((t) =>
  t.addEventListener('click', () => { buzz(10); show(t.dataset.screen); }));

/* ── onboarding ────────────────────────────── */
let obStep = 0, obCat = 'other';
function obShow(n) {
  obStep = n;
  document.querySelectorAll('.ob-step').forEach((el) => (el.hidden = +el.dataset.step !== n));
  document.querySelectorAll('.ob-progress i').forEach((el, i) => el.classList.toggle('on', i <= n));
}
$('#ob-cats').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip'); if (!chip) return;
  obCat = chip.dataset.cat;
  document.querySelectorAll('#ob-cats .chip').forEach((c) => c.classList.toggle('on', c === chip));
});
document.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
  if (obStep === 0 && !$('#ob-name').value.trim()) return $('#ob-name').focus();
  if (obStep === 1 && !$('#ob-goal').value.trim()) return $('#ob-goal').focus();
  obShow(obStep + 1);
}));
$('[data-finish]').addEventListener('click', () => {
  S = freshState(
    $('#ob-name').value.trim(),
    $('#ob-goal').value.trim(),
    obCat,
    $('#ob-time').value || '07:30'
  );
  save(); obShow(3);
});
$('[data-start]').addEventListener('click', () => { syncBuddy(); show('home'); });

/* ── home ──────────────────────────────────── */
function stampHTML(ts, opts = {}) {
  const time = new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const cls = 'stamp' + (opts.buddy ? ' buddy' : '') + (opts.late ? ' late' : '') +
    (opts.animate ? ' animate' : '');
  const word = opts.buddy ? 'showed up' : (opts.late ? 'made it' : 'showed up');
  return `<div class="${cls}"><span class="big-check">✓</span>` +
    `<span class="stamp-word">${word}</span><span class="stamp-time">${time}</span></div>`;
}

function renderHome(animateBuddy = false) {
  const key = todayKey(), day = S.days[key] || {}, st = computeStreaks();

  $('#today-date').textContent = niceDate(new Date());
  $('#goal-line').textContent = `${S.name} · ${S.goal}`;
  $('#streak-num').textContent = st.pair;
  $('#streak-badge').classList.toggle('zero', st.pair === 0);
  const [hh, mm] = S.time.split(':');
  $('#target-time').textContent = `${+hh}:${mm}`;

  /* you */
  const youPhoto = $('#you-photo');
  if (day.you) {
    youPhoto.innerHTML = stampHTML(day.you, { late: day.youLate });
    $('#checkin-zone').classList.add('done');
    $('#note-field').style.display = '';
    $('#you-note').value = day.youNote || '';
  } else {
    youPhoto.innerHTML = '<div class="empty-hint script">waiting for<br>your stamp…</div>';
    $('#checkin-zone').classList.remove('done');
    $('#note-field').style.display = 'none';
  }
  $('#you-label').textContent = S.name ? S.name.toLowerCase() : 'you';

  /* buddy */
  const bp = $('#buddy-photo');
  if (day.buddy) {
    bp.innerHTML = stampHTML(day.buddy, { buddy: true, animate: animateBuddy });
    $('#buddy-note').hidden = false;
    $('#buddy-note-text').textContent = '🌻 ' + (day.buddyNote || '');
  } else {
    bp.innerHTML = '<div class="empty-hint script">Sunny hasn\'t<br>stamped yet</div>';
    $('#buddy-note').hidden = true;
  }

  renderWeekStrip(st);
  renderSeals(st);
  $('#freeze-line').textContent =
    st.freezes > 0
      ? `❄️ ${st.freezes} streak freeze${st.freezes > 1 ? 's' : ''} banked — a missed day won't break you`
      : 'check in 7 days in a row to earn a streak freeze ❄️';
}

function renderWeekStrip(st) {
  const strip = $('#week-strip'); strip.innerHTML = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(new Date(), -i), key = dateKey(d), day = S.days[key] || {};
    const el = document.createElement('div');
    el.className = 'day-dot';
    let mark = '';
    if (day.you && day.buddy) { el.classList.add('both'); mark = '★'; }
    else if (day.you || day.buddy) { el.classList.add('half'); mark = '✓'; }
    else if (st.frozen[key]) { el.classList.add('froze'); mark = '❄'; }
    else if (key >= S.createdAt && key < todayKey()) { el.classList.add('miss'); }
    if (i === 0) el.classList.add('today');
    el.innerHTML = `<div class="dot">${mark}</div>` +
      d.toLocaleDateString(undefined, { weekday: 'narrow' });
    strip.appendChild(el);
  }
}

function renderSeals(st) {
  const row = $('#seal-row'); row.innerHTML = '';
  MILESTONES.filter((m) => st.pair >= m).forEach((m) => {
    const s = document.createElement('div');
    s.className = 'wax-seal'; s.textContent = m; s.title = `${m}-day pair streak`;
    row.appendChild(s);
  });
}

/* check-in */
$('#btn-checkin').addEventListener('click', () => {
  const key = todayKey();
  const day = (S.days[key] = S.days[key] || {});
  if (day.you) return;
  const now = new Date();
  const [hh, mm] = S.time.split(':').map(Number);
  const target = new Date(); target.setHours(hh, mm, 0, 0);
  day.you = now.getTime();
  day.youLate = now - target > 4 * 3600 * 1000;
  save();
  thunk(); buzz(35);
  renderHome();
  const stamp = $('#you-photo .stamp');
  if (stamp) {
    stamp.classList.add('animate');
    dustPuff($('#you-photo'));
  }
  maybeCelebrate();
});

$('#you-note').addEventListener('change', () => {
  const day = (S.days[todayKey()] = S.days[todayKey()] || {});
  day.youNote = $('#you-note').value.slice(0, 120); save();
});

function dustPuff(container) {
  for (let i = 0; i < 8; i++) {
    const p = document.createElement('span');
    p.className = 'dust';
    const a = (i / 8) * Math.PI * 2;
    p.style.left = '50%'; p.style.top = '50%';
    p.style.setProperty('--dx', Math.cos(a) * (30 + Math.random() * 20) + 'px');
    p.style.setProperty('--dy', Math.sin(a) * (30 + Math.random() * 20) + 'px');
    container.appendChild(p);
    setTimeout(() => p.remove(), 600);
  }
}

/* milestones */
function maybeCelebrate() {
  const st = computeStreaks();
  const hit = MILESTONES.filter((m) => st.pair >= m && !S.celebrated.includes(m)).pop();
  if (!hit) return;
  S.celebrated.push(hit); save();
  $('#celebrate-seal').textContent = hit;
  $('#celebrate-title').textContent = { 3: 'three days!', 7: 'a whole week!', 14: 'two weeks!',
    30: 'a month!!', 60: 'sixty days!', 100: 'one hundred!' }[hit] || hit + ' days!';
  $('#celebrate-text').textContent =
    `${hit} days of you and Sunny showing up together. This page is yours forever.`;
  $('#celebrate').hidden = false;
  chime(); buzz([30, 60, 30]);
  confetti();
}
$('#celebrate-close').addEventListener('click', () => ($('#celebrate').hidden = true));
function confetti() {
  const colors = ['#D9A0A8', '#A8BFA0', '#92A8C4', '#E8A83C', '#C15F3C'];
  for (let i = 0; i < 36; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.2 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  }
}

/* ── journal ───────────────────────────────── */
function renderJournal() {
  const list = $('#journal-list'); list.innerHTML = '';
  const st = computeStreaks();
  const keys = [];
  for (let d = new Date(S.createdAt + 'T12:00'); dateKey(d) <= todayKey(); d = addDays(d, 1))
    keys.push(dateKey(d));
  keys.reverse();
  if (keys.length <= 1 && !(S.days[keys[0]] || {}).you) {
    list.innerHTML = '<p class="journal-empty">Your story starts with today\'s first stamp.</p>';
    return;
  }
  keys.forEach((key) => {
    const day = S.days[key] || {};
    const el = document.createElement('div');
    el.className = 'journal-day';
    const youCls = day.you ? 'on' : (st.frozen[key] ? 'froze' : '');
    el.innerHTML =
      `<div class="jd-date script">${shortDate(key)}</div>` +
      `<div class="mini-stamps">` +
      `<div class="mini ${youCls}">${day.you ? '✓' : (st.frozen[key] ? '❄' : '·')}</div>` +
      `<div class="mini buddy ${day.buddy ? 'on' : ''}">${day.buddy ? '✓' : '·'}</div>` +
      `</div>` +
      `<div class="jd-note">${day.youNote ? '“' + escapeHTML(day.youNote) + '”' : ''}</div>`;
    list.appendChild(el);
  });
}
function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ── settings ──────────────────────────────── */
function renderSettings() {
  $('#set-name').value = S.name; $('#set-goal').value = S.goal;
  $('#set-time').value = S.time;
  $('#set-sound').checked = S.sound; $('#set-haptics').checked = S.haptics;
}
$('#btn-save-settings').addEventListener('click', () => {
  S.name = $('#set-name').value.trim() || S.name;
  S.goal = $('#set-goal').value.trim() || S.goal;
  S.time = $('#set-time').value || S.time;
  S.sound = $('#set-sound').checked; S.haptics = $('#set-haptics').checked;
  save(); buzz(15); show('home');
});
$('#btn-reset').addEventListener('click', () => {
  if (confirm('Start over? Your whole scrapbook will be erased.')) {
    localStorage.removeItem(STORE_KEY); location.reload();
  }
});

/* ── boot ──────────────────────────────────── */
if (!S) { show('onboarding'); obShow(0); }
else { syncBuddy(); show('home'); }
document.body.dataset.ready = '1';
setInterval(syncBuddy, 30 * 1000);   // Sunny can stamp while the app is open
