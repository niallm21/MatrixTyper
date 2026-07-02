/* ═══════════════════════════════════════════════
   Accountabillibuddy v0.2 — the dopamine update
   Every reward triggers off ONE thing only: a real
   check-in on a real goal. No engagement for its
   own sake; the addiction points at showing up.
   ═══════════════════════════════════════════════ */
'use strict';

const STORE_KEY = 'abb.state.v1';
const MILESTONES = [3, 7, 14, 30, 60, 100];
const $ = (sel) => document.querySelector(sel);

/* ── sticker catalog ───────────────────────────
   Variable-ratio reward: every check-in earns a
   sticker; RARITY is the variable part. Pity rule
   guarantees a rare+ at least every 7 check-ins. */
const RARITY = {
  common:   { label: 'common',   weight: 55, early: 45 },
  uncommon: { label: 'uncommon', weight: 30, early: 32 },
  rare:     { label: 'rare',     weight: 12, early: 18 },
  precious: { label: 'precious', weight: 3,  early: 5  },
};
const STICKERS = [
  // common — everyday scrapbook flora & bits
  ['c1', '🌼', 'little daisy', 'common'], ['c2', '🌿', 'pressed fern', 'common'],
  ['c3', '🍓', 'sweet berry', 'common'], ['c4', '🍋', 'zesty lemon', 'common'],
  ['c5', '🌷', 'spring tulip', 'common'], ['c6', '🐞', 'lucky ladybug', 'common'],
  ['c7', '🍄', 'forest cap', 'common'], ['c8', '🌻', 'sunny\'s twin', 'common'],
  ['c9', '☕', 'morning cup', 'common'], ['c10', '🧵', 'gold thread', 'common'],
  ['c11', '🍂', 'autumn leaf', 'common'], ['c12', '🫐', 'blueberries', 'common'],
  // uncommon — little companions
  ['u1', '🦔', 'brave hedgehog', 'uncommon'], ['u2', '🐝', 'busy bee', 'uncommon'],
  ['u3', '🐢', 'steady turtle', 'uncommon'], ['u4', '🦆', 'pond duck', 'uncommon'],
  ['u5', '🍰', 'victory cake', 'uncommon'], ['u6', '🌈', 'after the rain', 'uncommon'],
  ['u7', '🎈', 'red balloon', 'uncommon'], ['u8', '🧸', 'old friend', 'uncommon'],
  ['u9', '🪴', 'growing thing', 'uncommon'], ['u10', '📚', 'well-read', 'uncommon'],
  // rare — foil-edged
  ['r1', '🌙', 'paper moon', 'rare'], ['r2', '⭐', 'gold star', 'rare'],
  ['r3', '🦋', 'foil butterfly', 'rare'], ['r4', '🕊️', 'peace dove', 'rare'],
  ['r5', '🍯', 'amber honey', 'rare'], ['r6', '🎻', 'tiny violin', 'rare'],
  ['r7', '🗝️', 'brass key', 'rare'],
  // precious — holographic
  ['p1', '👑', 'the crown', 'precious'], ['p2', '🏆', 'the trophy', 'precious'],
  ['p3', '💫', 'shooting star', 'precious'], ['p4', '🔮', 'crystal ball', 'precious'],
  ['p5', '🪞', 'magic mirror', 'precious'],
].map(([id, emoji, name, rarity]) => ({ id, emoji, name, rarity }));
const BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

/* ── quest pool (weekly, deterministic pick) ── */
const QUESTS = [
  { id: 'early3', text: 'stamp before your target time 3×', goal: 3,
    count: (d) => d.filter((x) => x.youEarly).length },
  { id: 'notes2', text: 'leave 2 notes on your pages', goal: 2,
    count: (d) => d.filter((x) => x.youNote).length },
  { id: 'both5', text: 'you + Sunny both stamp, 5 days', goal: 5,
    count: (d) => d.filter((x) => x.you && x.buddy).length },
  { id: 'first3', text: 'beat Sunny to the page 3×', goal: 3,
    count: (d) => d.filter((x) => x.you && x.buddy && x.you < x.buddy).length },
  { id: 'weekend', text: 'stamp Saturday AND Sunday', goal: 2,
    count: (d) => d.filter((x) => x.you && (x._dow === 0 || x._dow === 6)).length },
];

/* ── titles: identity progression ───────────── */
const TITLES = [
  [100, 'legend of the book'], [60, 'unstoppable'], [30, 'keeper of pages'],
  [15, 'the regular'], [7, 'one week strong'], [3, 'getting started'], [1, 'day one'],
];

/* ── state ─────────────────────────────────── */
let S = load();
function load() {
  try { return migrate(JSON.parse(localStorage.getItem(STORE_KEY))); }
  catch { return null; }
}
function migrate(s) {
  if (!s) return null;
  s.stickers = s.stickers || {};           // id -> count
  s.pity = s.pity || 0;                    // check-ins since last rare+
  s.questRewards = s.questRewards || {};   // weekKey -> true
  s.celebrated = s.celebrated || [];
  s.why = s.why || '';                     // the promise note
  if (s.reminder === undefined) s.reminder = true;
  return s;
}
/* tell the Android shell to schedule (or clear) the daily notification */
function syncReminder() {
  if (!window.ABBNative) return;
  try {
    if (S.reminder) {
      const [h, m] = S.time.split(':').map(Number);
      window.ABBNative.setReminder(h, m);
    } else {
      window.ABBNative.clearReminder();
    }
  } catch { /* bridge unavailable (browser preview) */ }
}
function save() { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
function freshState(name, goal, cat, time) {
  return migrate({
    name, goal, cat, time,
    createdAt: dateKey(new Date()),
    days: {}, sound: true, haptics: true, celebrated: [],
  });
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
/* Monday-start key of the week a date belongs to */
function weekKey(d) {
  const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dateKey(x);
}
function weekDays() {
  const start = new Date(weekKey(new Date()) + 'T12:00'), out = [];
  for (let i = 0; i < 7; i++) {
    const key = dateKey(addDays(start, i));
    if (key > todayKey()) break;
    const day = { ...(S.days[key] || {}) };
    day._dow = addDays(start, i).getDay();
    out.push(day);
  }
  return out;
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
const REACTIONS = ['❤️', '🎉', '⭐', '🥳', '💛'];
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function buddyCheckinDate(key) {
  const [hh, mm] = S.time.split(':').map(Number);
  const offset = (hashStr(key + '🌻') % 121) - 25;
  const d = new Date(key + 'T12:00'); d.setHours(hh, mm + offset, 0, 0);
  return d;
}
function buddyNoteFor(key) { return BUDDY_NOTES[hashStr(key) % BUDDY_NOTES.length]; }

/* once a week (deterministic day), Sunny leaves a gift sticker on the page */
function giftFor(key) {
  const d = new Date(key + 'T12:00');
  const giftDow = hashStr(weekKey(d) + 'giftday') % 7;
  if (d.getDay() !== giftDow) return null;
  const pool = STICKERS.filter((s) => s.rarity === 'uncommon' || s.rarity === 'rare');
  return pool[hashStr(key + 'gift') % pool.length].id;
}
function syncBuddy() {
  const start = new Date(S.createdAt + 'T12:00');
  for (let d = start; dateKey(d) <= todayKey(); d = addDays(d, 1)) {
    const key = dateKey(d);
    const day = (S.days[key] = S.days[key] || {});
    if (!day.buddy && new Date() >= buddyCheckinDate(key)) {
      day.buddy = buddyCheckinDate(key).getTime();
      day.buddyNote = buddyNoteFor(key);
      day.gift = giftFor(key);
      if (key === todayKey() && document.body.dataset.ready) { renderHome(true); chime(); }
    }
    /* Sunny reacts to your stamp a couple of minutes later */
    if (day.you && !day.react && Date.now() >= (day.reactAt || 0)) {
      if (!day.reactAt) {
        day.reactAt = day.you + 60000 + (hashStr(key + 'r') % 120000);
      } else {
        day.react = REACTIONS[hashStr(key + '💛') % REACTIONS.length];
        if (key === todayKey() && document.body.dataset.ready) { renderHome(); chime(); }
      }
    }
  }
  save();
}

/* ── streaks, freezes & the mend ritual ────── */
/* A single missed day (with no freeze left) can be MENDED: stamp the next
   3 days in a row and the tear is stitched — the streak survives. */
function mendedDays() {
  const out = {};
  const start = new Date(S.createdAt + 'T12:00');
  for (let d = start; dateKey(d) < todayKey(); d = addDays(d, 1)) {
    const key = dateKey(d);
    if ((S.days[key] || {}).you) continue;
    let ok = true;
    for (let i = 1; i <= 3; i++) {
      const k = dateKey(addDays(d, i));
      if (k > todayKey() || !(S.days[k] || {}).you) { ok = false; break; }
    }
    if (ok) out[key] = true;
  }
  return out;
}
function computeStreaks() {
  const start = new Date(S.createdAt + 'T12:00');
  const mended = mendedDays();
  let pair = 0, you = 0, freezes = 0, earnedRun = 0, totalStamps = 0, maxPair = 0;
  const frozen = {};
  let lastBreak = null;                      // {key, pairBefore} of most recent tear
  for (let d = start; dateKey(d) <= todayKey(); d = addDays(d, 1)) {
    const key = dateKey(d), day = S.days[key] || {}, isToday = key === todayKey();
    if (day.you) {
      you++; earnedRun++; totalStamps++;
      if (earnedRun % 7 === 0 && freezes < 3) freezes++;
      pair = day.buddy ? pair + 1 : pair;
      maxPair = Math.max(maxPair, pair);
    } else if (isToday) {
      /* today isn't a miss yet */
    } else if (freezes > 0) {
      freezes--; frozen[key] = true; earnedRun = 0;
    } else if (mended[key]) {
      earnedRun = 0;                         // stitched: streak survives, run resets
    } else {
      lastBreak = { key, pairBefore: pair };
      pair = 0; you = 0; earnedRun = 0;
    }
  }
  /* repair in progress? only the most recent tear, only a 1-day gap,
     only while the 3 mending days are still being collected */
  let repair = null;
  if (lastBreak && lastBreak.pairBefore >= 2) {
    let done = 0, clean = true;
    for (let i = 1; i <= 3; i++) {
      const k = dateKey(addDays(new Date(lastBreak.key + 'T12:00'), i));
      if (k > todayKey()) break;
      if ((S.days[k] || {}).you) done++;
      else if (k < todayKey()) { clean = false; break; }
    }
    if (clean && done < 3) repair = { done, needed: 3, prev: lastBreak.pairBefore };
  }
  return { pair, you, freezes, frozen, totalStamps, maxPair, mended, repair };
}
function titleFor(totalStamps) {
  const t = TITLES.find(([n]) => totalStamps >= n);
  return t ? t[1] : '';
}

/* ── sticker drop engine ───────────────────── */
function rollSticker(early) {
  let tiers = Object.entries(RARITY).map(([k, v]) => [k, early ? v.early : v.weight]);
  if (S.pity >= 6) tiers = tiers.filter(([k]) => k === 'rare' || k === 'precious');
  const total = tiers.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total, tier = tiers[tiers.length - 1][0];
  for (const [k, w] of tiers) { if ((r -= w) < 0) { tier = k; break; } }
  const pool = STICKERS.filter((s) => s.rarity === tier);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  S.pity = (tier === 'rare' || tier === 'precious') ? 0 : S.pity + 1;
  S.stickers[pick.id] = (S.stickers[pick.id] || 0) + 1;
  return pick;
}
function grantSticker(day, early) {
  const s = rollSticker(early);
  /* stick along the page margins so it never covers the note field or buttons */
  const leftSide = Math.random() < 0.5;
  day.sticker = {
    id: s.id,
    x: leftSide ? 1 + Math.random() * 8 : 76 + Math.random() * 10,
    y: 34 + Math.random() * 46,
    rot: -18 + Math.random() * 36,
  };
  save();
  return s;
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
function peelSound() {
  if (!S.sound) return;
  try {
    const c = ctx(), t = c.currentTime;
    const buf = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (i / ch.length) * 0.6;
    const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    n.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(1200, t);
    f.frequency.exponentialRampToValueAtTime(4200, t + 0.22);
    g.gain.value = 0.22;
    n.connect(f).connect(g).connect(c.destination); n.start(t);
  } catch { /* audio unavailable */ }
}
function sparkle(rarity) {
  if (!S.sound) return;
  try {
    const c = ctx(), t = c.currentTime;
    const notes = rarity === 'precious' ? [523, 659, 784, 1047] :
                  rarity === 'rare' ? [523, 659, 784] : [523, 659];
    notes.forEach((hz, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = hz;
      const dt = i * 0.09;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.14, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.6);
      o.connect(g).connect(c.destination); o.start(t + dt); o.stop(t + dt + 0.65);
    });
  } catch { /* audio unavailable */ }
}
function buzz(ms) { if (S.haptics && navigator.vibrate) navigator.vibrate(ms); }

/* ── screens & nav ─────────────────────────── */
function show(name) {
  ['onboarding', 'home', 'journal', 'stickers', 'settings'].forEach((s) => {
    $('#screen-' + s).hidden = s !== name;
  });
  $('#tabbar').hidden = name === 'onboarding';
  document.querySelectorAll('.tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.screen === name));
  if (name === 'home') renderHome();
  if (name === 'journal') renderJournal();
  if (name === 'stickers') renderStickerBook();
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
    $('#ob-name').value.trim(), $('#ob-goal').value.trim(),
    obCat, $('#ob-time').value || '07:30');
  save(); obShow(3);
});
$('[data-start]').addEventListener('click', () => { syncBuddy(); syncReminder(); show('home'); });

/* ── home ──────────────────────────────────── */
function stampHTML(ts, opts = {}) {
  const time = new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const cls = 'stamp' + (opts.buddy ? ' buddy' : '') + (opts.late ? ' late' : '') +
    (opts.early ? ' early' : '') + (opts.animate ? ' animate' : '');
  const word = opts.late ? 'made it' : (opts.early ? 'early bird' : 'showed up');
  return `<div class="${cls}"><span class="big-check">✓</span>` +
    `<span class="stamp-word">${word}</span><span class="stamp-time">${time}</span></div>`;
}
function flameTier(pair) {
  return pair >= 30 ? 't4' : pair >= 14 ? 't3' : pair >= 7 ? 't2' : pair >= 3 ? 't2' : pair >= 1 ? 't1' : 't0';
}

function renderHome(animateBuddy = false) {
  const key = todayKey(), day = S.days[key] || {}, st = computeStreaks();

  $('#today-date').textContent = niceDate(new Date());
  $('#goal-line').textContent = `${S.name} · ${S.goal}`;
  $('#title-line').textContent = titleFor(st.totalStamps);
  $('#streak-num').textContent = st.pair;
  const badge = $('#streak-badge');
  badge.className = 'streak-badge ' + flameTier(st.pair);
  badge.classList.toggle('zero', st.pair === 0);
  const [hh, mm] = S.time.split(':');
  $('#target-time').textContent = `${+hh}:${mm}`;

  /* crown: who reached the page first today? */
  const youFirst = day.you && day.buddy && day.you < day.buddy;
  const buddyFirst = day.you && day.buddy && day.buddy < day.you;

  /* you */
  const youPhoto = $('#you-photo');
  if (day.you) {
    youPhoto.innerHTML = stampHTML(day.you, { late: day.youLate, early: day.youEarly }) +
      (youFirst ? '<span class="crown">👑</span>' : '') +
      (day.react ? `<span class="react-doodle">${day.react}</span>` : '');
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
    bp.innerHTML = stampHTML(day.buddy, { buddy: true, animate: animateBuddy }) +
      (buddyFirst ? '<span class="crown">👑</span>' : '');
    $('#buddy-note').hidden = false;
    $('#buddy-note-text').textContent = '🌻 ' + (day.buddyNote || '');
    /* unclaimed gift waits on Sunny's polaroid */
    if (day.gift && !day.giftClaimed) {
      const g = document.createElement('button');
      g.className = 'gift-tag'; g.textContent = '🎁'; g.id = 'gift-tag';
      g.setAttribute('aria-label', 'open Sunny\'s gift');
      bp.appendChild(g);
      g.addEventListener('click', () => {
        openReveal(BY_ID[day.gift], 'Sunny left this on your page…', 'gift');
        buzz(15);
      });
    }
  } else {
    bp.innerHTML = '<div class="empty-hint script">Sunny hasn\'t<br>stamped yet</div>';
    $('#buddy-note').hidden = true;
  }

  /* today's stickers on the page */
  const layer = $('#sticker-layer'); layer.innerHTML = '';
  [day.sticker, day.giftSticker].filter(Boolean).forEach((placed) => {
    const s = BY_ID[placed.id];
    if (!s) return;
    const el = document.createElement('div');
    el.className = 'sticker-frame ' + s.rarity;
    el.style.left = placed.x + '%'; el.style.top = placed.y + '%';
    el.style.transform = `rotate(${placed.rot}deg)`;
    el.textContent = s.emoji;
    layer.appendChild(el);
  });

  /* daily washi tape — palette grows with your best-ever streak */
  const washiColors = ['#D9A0A8', '#A8BFA0', '#92A8C4'];
  if (st.maxPair >= 7) washiColors.push('#C97B5D', '#E8A83C');
  if (st.maxPair >= 30) washiColors.push('#B9A8D0', '#E8938C');
  const washis = document.querySelectorAll('#today-page .washi');
  washis.forEach((w, i) => {
    w.style.background = washiColors[(hashStr(key) + i * 3) % washiColors.length];
  });

  /* evening tension: the streak is on the line — and your own words */
  const tension = !day.you && new Date().getHours() >= 18;
  $('#tension-line').hidden = !tension;
  if (tension) {
    const line = st.pair > 0
      ? `today's page is still open… 🔥 ${st.pair} on the line`
      : 'today\'s page is still open…';
    $('#tension-line').innerHTML = escapeHTML(line) +
      (S.why ? `<span class="why-quote">you wrote: “${escapeHTML(S.why)}”</span>` : '');
  }
  badge.classList.toggle('tension', tension && st.pair > 0);

  /* mend ritual progress */
  const oldRepair = $('#repair-line'); if (oldRepair) oldRepair.remove();
  if (st.repair) {
    const r = document.createElement('div');
    r.className = 'repair-line'; r.id = 'repair-line';
    r.innerHTML =
      `<span class="script">🪡 mend the tear: stamp ${st.repair.needed} days in a row ` +
      `and your ${st.repair.prev}-day streak lives on</span>` +
      `<div class="repair-bar"><i style="width:${(st.repair.done / st.repair.needed) * 100}%"></i></div>`;
    $('#today-page').after(r);
  }

  /* promise-note prompt (once, after the first few days) */
  $('#why-card').hidden = !!S.why || st.totalStamps < 2;

  renderWeekStrip(st);
  renderSeals(st);
  renderQuests();
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
    else if (st.frozen[key]) { el.classList.add('froze'); mark = '❄'; }
    else if (st.mended[key]) { el.classList.add('mend'); mark = '🪡'; }
    else if (day.you || day.buddy) { el.classList.add('half'); mark = '✓'; }
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

/* ── quests ────────────────────────────────── */
function activeQuests() {
  const wk = weekKey(new Date()), h = hashStr(wk);
  const picks = [];
  for (let i = 0; picks.length < 3; i++) {
    const q = QUESTS[(h + i * 7) % QUESTS.length];
    if (!picks.includes(q)) picks.push(q);
  }
  return picks;
}
function renderQuests() {
  const days = weekDays(), wk = weekKey(new Date());
  const list = $('#quest-list'); list.innerHTML = '';
  let allDone = true;
  activeQuests().forEach((q) => {
    const n = Math.min(q.count(days), q.goal), done = n >= q.goal;
    allDone = allDone && done;
    const el = document.createElement('div');
    el.className = 'quest' + (done ? ' done' : '');
    el.innerHTML =
      `<div class="quest-row"><span>${q.text}</span>` +
      `<span class="${done ? 'q-done' : ''}">${done ? '✓ done' : n + '/' + q.goal}</span></div>` +
      `<div class="qbar"><i style="width:${(n / q.goal) * 100}%"></i></div>`;
    list.appendChild(el);
  });

  /* race tally: who got to the page first this week */
  const youWins = days.filter((d) => d.you && d.buddy && d.you < d.buddy).length;
  const buddyWins = days.filter((d) => d.you && d.buddy && d.buddy < d.you).length;
  $('#race-tally').textContent = `first to the page — you ${youWins} · Sunny ${buddyWins}`;

  /* golden week reward: all three quests → precious sticker */
  if (allDone && !S.questRewards[wk]) {
    S.questRewards[wk] = true; save();
    const pool = STICKERS.filter((s) => s.rarity === 'precious');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    S.stickers[pick.id] = (S.stickers[pick.id] || 0) + 1; save();
    setTimeout(() => openReveal(pick, 'golden week! all three quests done —'), 600);
  }
  if (S.questRewards[wk]) {
    const g = document.createElement('div');
    g.className = 'golden-week script'; g.textContent = '✨ golden week — all quests complete ✨';
    list.appendChild(g);
  }
}

/* ── check-in ──────────────────────────────── */
$('#btn-checkin').addEventListener('click', () => {
  const key = todayKey();
  const day = (S.days[key] = S.days[key] || {});
  if (day.you) return;
  const now = new Date();
  const [hh, mm] = S.time.split(':').map(Number);
  const target = new Date(); target.setHours(hh, mm, 0, 0);
  day.you = now.getTime();
  day.youEarly = now <= target;
  day.youLate = now - target > 4 * 3600 * 1000;
  const sticker = grantSticker(day, day.youEarly);
  save();
  thunk(); buzz(35);
  renderHome();
  const stamp = $('#you-photo .stamp');
  if (stamp) { stamp.classList.add('animate'); dustPuff($('#you-photo')); }
  /* anticipation gap, then the reveal — the pause IS the dopamine */
  setTimeout(() => openReveal(sticker, 'a sticker fell out of today\'s page…'), 900);
});

$('#you-note').addEventListener('change', () => {
  const day = (S.days[todayKey()] = S.days[todayKey()] || {});
  day.youNote = $('#you-note').value.slice(0, 120); save();
  renderQuests();
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

/* ── sticker reveal flow ───────────────────── */
let pendingSticker = null, pendingKind = null;
function openReveal(sticker, lead, kind) {
  pendingSticker = sticker; pendingKind = kind || 'drop';
  $('#reveal-lead').textContent = lead;
  $('#mystery').hidden = false;
  $('#reveal-result').hidden = true;
  $('#reveal').hidden = false;
}
$('#mystery').addEventListener('click', () => {
  const s = pendingSticker; if (!s) return;
  peelSound(); buzz(20);
  $('#mystery').hidden = true;
  const frame = $('#reveal-sticker');
  frame.className = 'sticker-frame big ' + s.rarity;
  frame.textContent = s.emoji;
  $('#reveal-name').textContent = s.name;
  const tag = $('#reveal-rarity');
  tag.className = 'rarity-tag ' + s.rarity;
  tag.textContent = RARITY[s.rarity].label + (s.rarity === 'precious' ? ' ✦' : '');
  $('#reveal-result').hidden = false;
  sparkle(s.rarity);
  if (s.rarity === 'precious') confetti();
});
$('#reveal-stick').addEventListener('click', () => {
  if (pendingKind === 'gift' && pendingSticker) {
    const day = (S.days[todayKey()] = S.days[todayKey()] || {});
    day.giftClaimed = true;
    S.stickers[pendingSticker.id] = (S.stickers[pendingSticker.id] || 0) + 1;
    const leftSide = Math.random() < 0.5;
    day.giftSticker = {
      id: pendingSticker.id,
      x: leftSide ? 1 + Math.random() * 8 : 76 + Math.random() * 10,
      y: 34 + Math.random() * 46,
      rot: -18 + Math.random() * 36,
    };
    save();
  }
  $('#reveal').hidden = true; pendingSticker = null; pendingKind = null;
  buzz(15); renderHome(); maybeCelebrate();
});

/* ── milestones & mend celebrations ────────── */
function maybeCelebrate() {
  const st = computeStreaks();
  /* a tear was just stitched shut */
  const justMended = Object.keys(st.mended)
    .find((k) => dateKey(addDays(new Date(k + 'T12:00'), 3)) === todayKey() &&
                 !S.celebrated.includes('mend-' + k));
  if (justMended) {
    S.celebrated.push('mend-' + justMended); save();
    $('#celebrate-seal').textContent = '🪡';
    $('#celebrate-title').textContent = 'the tear is mended!';
    $('#celebrate-text').textContent =
      `Three days in a row — the missed page is stitched shut and your ${st.pair}-day ` +
      'streak lives on. Broken-and-repaired is a better story than never-broken.';
    $('#celebrate').hidden = false;
    chime(); buzz([30, 60, 30]); confetti();
    return;
  }
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

/* ── sticker book ──────────────────────────── */
function renderStickerBook() {
  const owned = Object.keys(S.stickers).filter((id) => S.stickers[id] > 0);
  $('#collect-progress').textContent =
    `${owned.length} of ${STICKERS.length} collected — every check-in earns one`;
  const grid = $('#sticker-grid'); grid.innerHTML = '';
  STICKERS.forEach((s) => {
    const n = S.stickers[s.id] || 0;
    const cell = document.createElement('div');
    cell.className = 'cell' + (n ? '' : ' locked');
    cell.innerHTML =
      `<div class="sticker-frame ${n ? s.rarity : ''}" style="position:relative">` +
      `${n ? s.emoji : '?'}` +
      `${n > 1 ? `<span class="count">×${n}</span>` : ''}</div>` +
      `<div class="cell-name">${n ? s.name : '· · ·'}</div>`;
    grid.appendChild(cell);
  });
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
  let curMonth = null;
  keys.forEach((key) => {
    const month = key.slice(0, 7);
    if (month !== curMonth) {
      curMonth = month;
      const mdays = keys.filter((k) => k.startsWith(month)).map((k) => S.days[k] || {});
      const stamps = mdays.filter((d) => d.you).length;
      const both = mdays.filter((d) => d.you && d.buddy).length;
      const skn = mdays.filter((d) => d.sticker || d.giftSticker).length;
      const mc = document.createElement('div');
      mc.className = 'month-card';
      mc.innerHTML =
        `<div class="washi washi-rose"></div>` +
        `<div class="month-name script">${new Date(key + 'T12:00')
          .toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toLowerCase()}</div>` +
        `<div class="month-stats">` +
        `<span class="mstat">🖋️ ${stamps} stamps</span>` +
        `<span class="mstat">★ ${both} together</span>` +
        `<span class="mstat">🌼 ${skn} stickers</span>` +
        `</div>`;
      list.appendChild(mc);
    }
    const day = S.days[key] || {};
    const sk = (day.sticker && BY_ID[day.sticker.id]) ||
               (day.giftSticker && BY_ID[day.giftSticker.id]);
    const el = document.createElement('div');
    el.className = 'journal-day';
    const youCls = day.you ? 'on' : (st.frozen[key] ? 'froze' : '');
    const youMark = day.you ? '✓' : (st.frozen[key] ? '❄' : (st.mended[key] ? '🪡' : '·'));
    el.innerHTML =
      `<div class="jd-date script">${shortDate(key)}</div>` +
      `<div class="mini-stamps">` +
      `<div class="mini ${youCls}">${youMark}</div>` +
      `<div class="mini buddy ${day.buddy ? 'on' : ''}">${day.buddy ? '✓' : '·'}</div>` +
      `${sk ? `<div class="mini" title="${sk.name}">${sk.emoji}</div>` : ''}` +
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
  $('#set-time').value = S.time; $('#set-why').value = S.why;
  $('#set-reminder').checked = S.reminder;
  $('#set-sound').checked = S.sound; $('#set-haptics').checked = S.haptics;
}
$('#btn-save-settings').addEventListener('click', () => {
  S.name = $('#set-name').value.trim() || S.name;
  S.goal = $('#set-goal').value.trim() || S.goal;
  S.time = $('#set-time').value || S.time;
  S.why = $('#set-why').value.trim();
  S.reminder = $('#set-reminder').checked;
  S.sound = $('#set-sound').checked; S.haptics = $('#set-haptics').checked;
  save(); syncReminder(); buzz(15); show('home');
});
$('#why-save').addEventListener('click', () => {
  const v = $('#why-input').value.trim();
  if (!v) return $('#why-input').focus();
  S.why = v; save(); buzz(15); renderHome();
});
$('#btn-reset').addEventListener('click', () => {
  if (confirm('Start over? Your whole scrapbook will be erased.')) {
    localStorage.removeItem(STORE_KEY); location.reload();
  }
});

/* ── boot ──────────────────────────────────── */
if (!S) { show('onboarding'); obShow(0); }
else { syncBuddy(); syncReminder(); show('home'); }
document.body.dataset.ready = '1';
setInterval(syncBuddy, 30 * 1000);   // Sunny can stamp & react while the app is open
