import * as THREE from 'three';
import { input, setupInput, consumeAction, consumeCamera } from './input.js';

// =============================================================
//  Liberty Clone — a tiny 3D open-world driving sandbox.
//  Everything is built from primitives so there are no external
//  assets to load — keeps the Android bundle small and reliable.
// =============================================================

const WORLD = {
  half: 190, // world extends from -half..half on X and Z
  block: 46, // distance between road centre-lines
  roadW: 13, // road width
};

// ---- core three.js setup -------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fc7ff);
scene.fog = new THREE.Fog(0x8fc7ff, 130, 320);

const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
camera.position.set(0, 12, 18);

// ---- lighting ------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x55502f, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
sun.position.set(80, 130, 40);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 360;
const S = 150;
sun.shadow.camera.left = -S;
sun.shadow.camera.right = S;
sun.shadow.camera.top = S;
sun.shadow.camera.bottom = -S;
sun.shadow.bias = -0.0004;
scene.add(sun);
scene.add(sun.target);

// =============================================================
//  World generation
// =============================================================
const colliders = []; // array of AABBs {minX,maxX,minZ,maxZ}
const buildingMeshes = [];

function addCollider(minX, maxX, minZ, maxZ) {
  colliders.push({ minX, maxX, minZ, maxZ });
}

// ground
const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a7d3a });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2 + 80, WORLD.half * 2 + 80), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// roads: one big dark plane grid is cheaper than many strips — build a
// canvas texture for the asphalt + lane markings.
function makeRoadTexture() {
  const span = WORLD.half * 2;
  const px = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, px, px);
  const toPx = (w) => ((w + WORLD.half) / span) * px;
  const roadPx = (WORLD.roadW / span) * px;
  ctx.fillStyle = '#2b2e33';
  for (let g = -WORLD.half; g <= WORLD.half; g += WORLD.block) {
    const c = toPx(g);
    ctx.fillRect(0, c - roadPx / 2, px, roadPx); // horizontal
    ctx.fillRect(c - roadPx / 2, 0, roadPx, px); // vertical
  }
  // lane dashes
  ctx.strokeStyle = '#e8d24a';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 14]);
  for (let g = -WORLD.half; g <= WORLD.half; g += WORLD.block) {
    const c = toPx(g);
    ctx.beginPath(); ctx.moveTo(0, c); ctx.lineTo(px, c); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c, 0); ctx.lineTo(c, px); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}
const roadPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
  new THREE.MeshLambertMaterial({ map: makeRoadTexture(), transparent: true })
);
roadPlane.rotation.x = -Math.PI / 2;
roadPlane.position.y = 0.02;
roadPlane.receiveShadow = true;
scene.add(roadPlane);

// buildings — fill each block (the area between roads) with a cluster.
const buildingPalette = [0x9aa7b4, 0xb98c6a, 0x7e8aa0, 0xc4b59a, 0x6f7d8c, 0xa86b5c, 0x8d9bb0];
function buildCity() {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const margin = WORLD.roadW / 2 + 2.5;
  for (let bx = -WORLD.half + WORLD.block / 2; bx < WORLD.half; bx += WORLD.block) {
    for (let bz = -WORLD.half + WORLD.block / 2; bz < WORLD.half; bz += WORLD.block) {
      // leave a central plaza open
      if (Math.abs(bx) < WORLD.block && Math.abs(bz) < WORLD.block) continue;
      const blockMinX = bx - WORLD.block / 2 + margin;
      const blockMaxX = bx + WORLD.block / 2 - margin;
      const blockMinZ = bz - WORLD.block / 2 + margin;
      const blockMaxZ = bz + WORLD.block / 2 - margin;
      const cols = 2;
      const rows = 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (Math.random() < 0.18) continue; // some gaps / parks
          const cellMinX = THREE.MathUtils.lerp(blockMinX, blockMaxX, i / cols) + 1;
          const cellMaxX = THREE.MathUtils.lerp(blockMinX, blockMaxX, (i + 1) / cols) - 1;
          const cellMinZ = THREE.MathUtils.lerp(blockMinZ, blockMaxZ, j / rows) + 1;
          const cellMaxZ = THREE.MathUtils.lerp(blockMinZ, blockMaxZ, (j + 1) / rows) - 1;
          const w = cellMaxX - cellMinX;
          const d = cellMaxZ - cellMinZ;
          if (w < 4 || d < 4) continue;
          const cx = (cellMinX + cellMaxX) / 2;
          const cz = (cellMinZ + cellMaxZ) / 2;
          const distFromCentre = Math.hypot(cx, cz);
          const h = THREE.MathUtils.randFloat(10, 14 + Math.max(0, 60 - distFromCentre) * 0.9);
          const mat = new THREE.MeshLambertMaterial({ color: buildingPalette[(Math.random() * buildingPalette.length) | 0] });
          const m = new THREE.Mesh(geo, mat);
          m.scale.set(w, h, d);
          m.position.set(cx, h / 2, cz);
          m.castShadow = true;
          m.receiveShadow = true;
          scene.add(m);
          buildingMeshes.push(m);
          addCollider(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2);
        }
      }
    }
  }
}
buildCity();

// a few trees in the central plaza for flavour
function addTree(x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 3, 6),
    new THREE.MeshLambertMaterial({ color: 0x6b4a2b })
  );
  trunk.position.set(x, 1.5, z);
  trunk.castShadow = true;
  const leaves = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 8, 6),
    new THREE.MeshLambertMaterial({ color: 0x2f6d2f })
  );
  leaves.position.set(x, 4.6, z);
  leaves.castShadow = true;
  scene.add(trunk, leaves);
}
// trees sit in the plaza corners, clear of the roads that run along x=0 / z=0
for (const [tx, tz] of [[14, 14], [-14, 14], [14, -14], [-14, -14], [20, 20], [-20, 20], [20, -20], [-20, -20]]) {
  addTree(tx, tz);
}

// world boundary walls (invisible-ish low walls so you can't drive off)
const wall = WORLD.half + 6;
addCollider(-wall - 6, -wall, -wall - 6, wall + 6);
addCollider(wall, wall + 6, -wall - 6, wall + 6);
addCollider(-wall - 6, wall + 6, -wall - 6, -wall);
addCollider(-wall - 6, wall + 6, wall, wall + 6);

// =============================================================
//  Collision helper — resolve a circle (x,z,r) out of all AABBs.
//  Returns true if a collision was resolved.
// =============================================================
function resolveCircle(pos, r) {
  let hit = false;
  for (const c of colliders) {
    const closestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) || 0.0001;
      const push = (r - d) / d;
      pos.x += dx * push;
      pos.z += dz * push;
      hit = true;
    }
  }
  return hit;
}

// =============================================================
//  Vehicles
// =============================================================
function makeCarMesh(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 4.2), bodyMat);
  body.position.y = 0.7;
  body.castShadow = true;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.7, 2.0),
    new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.2, roughness: 0.3 })
  );
  cabin.position.set(0, 1.25, -0.1);
  cabin.castShadow = true;
  g.add(body, cabin);
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.35, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.8 });
  const offsets = [
    [0.95, -1.3], [-0.95, -1.3], [0.95, 1.3], [-0.95, 1.3],
  ];
  for (const [ox, oz] of offsets) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(ox, 0.45, oz);
    w.castShadow = true;
    g.add(w);
  }
  // headlights
  const hlGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
  const hlMat = new THREE.MeshStandardMaterial({ color: 0xfff7d6, emissive: 0xfff2c0, emissiveIntensity: 0.6 });
  for (const ox of [0.6, -0.6]) {
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.position.set(ox, 0.7, 2.1);
    g.add(hl);
  }
  return g;
}

const carColors = [0xd23b3b, 0x2e7bd2, 0xf0c020, 0x29a36a, 0xdddddd, 0x8c3bd2, 0xe87b2a, 0x222831];
const cars = [];

// ---- road-grid navigation for AI traffic ----
// Intersections sit at integer node coords (ix,iz) -> world (ix*block, iz*block).
const NMIN = -4;
const NMAX = 4;
const LANE = 3.4; // perpendicular lane offset so opposing traffic doesn't overlap
const DIRS = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
const clampNode = (n) => Math.max(NMIN, Math.min(NMAX, n));

function laneTarget(ix, iz, dir) {
  const w = new THREE.Vector3(ix * WORLD.block, 0, iz * WORLD.block);
  if (dir.x !== 0) w.z += dir.x > 0 ? LANE : -LANE; // drive on the right
  else w.x += dir.z > 0 ? -LANE : LANE;
  return w;
}

// Pick the next intersection to head for (no U-turns, stay on the grid).
function setNextLeg(car) {
  const opts = [];
  for (const d of DIRS) {
    if (d.x === -car.dir.x && d.z === -car.dir.z) continue;
    const nx = car.ix + d.x;
    const nz = car.iz + d.z;
    if (nx < NMIN || nx > NMAX || nz < NMIN || nz > NMAX) continue;
    opts.push(d);
  }
  if (!opts.length) opts.push({ x: -car.dir.x, z: -car.dir.z }); // dead end: U-turn
  const straight = opts.find((o) => o.x === car.dir.x && o.z === car.dir.z);
  const d = straight && Math.random() < 0.6 ? straight : opts[(Math.random() * opts.length) | 0];
  car.dir = { x: d.x, z: d.z };
  car.tx = clampNode(car.ix + d.x);
  car.tz = clampNode(car.iz + d.z);
  car.target = laneTarget(car.tx, car.tz, car.dir);
}

// Hand a car (back) to the AI from wherever it currently is.
function carToTraffic(car) {
  car.ai = true;
  car.ix = clampNode(Math.round(car.pos.x / WORLD.block));
  car.iz = clampNode(Math.round(car.pos.z / WORLD.block));
  const fwd = { x: Math.sin(car.heading), z: Math.cos(car.heading) };
  car.dir = Math.abs(fwd.x) > Math.abs(fwd.z)
    ? { x: Math.sign(fwd.x) || 1, z: 0 }
    : { x: 0, z: Math.sign(fwd.z) || 1 };
  setNextLeg(car);
}

function spawnTraffic() {
  const used = new Set();
  for (let i = 0; i < 14; i++) {
    let ix, iz, guard = 0;
    if (i === 0) { ix = 0; iz = 0; } // one near the player's spawn to grab quickly
    else {
      do {
        ix = THREE.MathUtils.randInt(NMIN, NMAX);
        iz = THREE.MathUtils.randInt(NMIN, NMAX);
        guard++;
      } while (used.has(`${ix},${iz}`) && guard < 50);
    }
    used.add(`${ix},${iz}`);
    const dir = DIRS[(Math.random() * DIRS.length) | 0];
    const mesh = makeCarMesh(carColors[i % carColors.length]);
    const car = {
      mesh,
      pos: laneTarget(ix, iz, dir).clone(),
      heading: Math.atan2(dir.x, dir.z),
      speed: 0,
      ai: true,
      ix, iz,
      dir: { x: dir.x, z: dir.z },
      cruise: THREE.MathUtils.randFloat(11, 19),
    };
    setNextLeg(car);
    mesh.position.copy(car.pos);
    mesh.rotation.y = car.heading;
    scene.add(mesh);
    cars.push(car);
  }
}
spawnTraffic();

// =============================================================
//  Pedestrians
// =============================================================
const peds = [];
function makePed(color) {
  const g = new THREE.Group();
  const torsoMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.5, 4, 8), torsoMat);
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe0b78a })
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(body, head);

  // Limbs: each is a box hung from a pivot group so it swings from the joint.
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  function limb(w, h, d, mat) {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.y = -h / 2;
    pivot.add(m);
    return pivot;
  }
  const legL = limb(0.16, 0.56, 0.18, legMat); legL.position.set(0.13, 0.6, 0);
  const legR = limb(0.16, 0.56, 0.18, legMat); legR.position.set(-0.13, 0.6, 0);
  const armMat = new THREE.MeshLambertMaterial({ color });
  const armL = limb(0.13, 0.5, 0.13, armMat); armL.position.set(0.36, 1.28, 0);
  const armR = limb(0.13, 0.5, 0.13, armMat); armR.position.set(-0.36, 1.28, 0);
  g.add(legL, legR, armL, armR);

  g.userData = { body, head, torsoMat, armMat, legs: [legL, legR], arms: [armL, armR] };
  return g;
}

// Drive a character's limbs through a walk cycle (amp 0 = standing still).
function animateWalk(refs, phase, amp) {
  const s = Math.sin(phase) * amp;
  refs.legs[0].rotation.x = s;
  refs.legs[1].rotation.x = -s;
  refs.arms[0].rotation.x = -s * 0.85;
  refs.arms[1].rotation.x = s * 0.85;
}
const pedColors = [0x2b6cb0, 0xb02b2b, 0x2bb05a, 0xb0a52b, 0x6a2bb0, 0x444444, 0xcc6699];
function spawnPeds() {
  for (let i = 0; i < 26; i++) {
    let x, z, guard = 0;
    do {
      x = THREE.MathUtils.randFloat(-WORLD.half + 10, WORLD.half - 10);
      z = THREE.MathUtils.randFloat(-WORLD.half + 10, WORLD.half - 10);
      guard++;
    } while (resolveCircle({ x, z }, 1.2) && guard < 30);
    const mesh = makePed(pedColors[i % pedColors.length]);
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh,
      refs: mesh.userData,
      head: mesh.userData.head,
      pos: new THREE.Vector3(x, 0, z),
      dir: Math.random() * Math.PI * 2,
      changeIn: Math.random() * 3,
      walkPhase: Math.random() * 6,
      knocked: false,
      flyVel: new THREE.Vector3(),
      respawnIn: 0,
      headOff: false,
      headVel: new THREE.Vector3(),
      headSpin: new THREE.Vector3(),
      stump: null,
    });
  }
}
spawnPeds();

// =============================================================
//  Pickups (cash)
// =============================================================
const pickups = [];
function makeCoin() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb300, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 })
  );
  m.rotation.x = Math.PI / 2;
  return m;
}
function randomRoadPoint() {
  const gx = Math.round(THREE.MathUtils.randInt(-3, 3)) * WORLD.block;
  const gz = Math.round(THREE.MathUtils.randInt(-3, 3)) * WORLD.block;
  const alongX = Math.random() < 0.5;
  const x = alongX ? gx + THREE.MathUtils.randFloat(-20, 20) : gx;
  const z = alongX ? gz : gz + THREE.MathUtils.randFloat(-20, 20);
  return { x: THREE.MathUtils.clamp(x, -WORLD.half + 6, WORLD.half - 6), z: THREE.MathUtils.clamp(z, -WORLD.half + 6, WORLD.half - 6) };
}
function spawnPickups() {
  for (let i = 0; i < 20; i++) {
    const p = randomRoadPoint();
    const mesh = makeCoin();
    mesh.position.set(p.x, 1.1, p.z);
    scene.add(mesh);
    pickups.push({ mesh, pos: new THREE.Vector3(p.x, 1.1, p.z) });
  }
}
spawnPickups();

// =============================================================
//  Player (on foot)
// =============================================================
const player = {
  pos: new THREE.Vector3(6, 0, 6),
  facing: 0,
  inCar: null, // car object or null
  radius: 0.5,
  walkPhase: 0,
  knocked: false,
  flyVel: new THREE.Vector3(),
  downTimer: 0,
  grace: 0,
};
const playerMesh = makePed(0x14223f); // distinct blue jacket
const playerRefs = playerMesh.userData;
scene.add(playerMesh);

// =============================================================
//  Camera follow
// =============================================================
const camModes = [
  { dist: 9.5, height: 4.6, look: 1.5 }, // default chase
  { dist: 15, height: 7.5, look: 1.5 }, // far
  { dist: 6, height: 3.2, look: 1.2 }, // close
];
let camModeIdx = 0;
let camYaw = 0;
const camTarget = new THREE.Vector3();
const camDesired = new THREE.Vector3();

function updateCamera(dt, focusPos, focusYaw, moving) {
  const mode = camModes[camModeIdx];
  // ease the camera yaw toward the subject's heading
  let targetYaw = focusYaw;
  let diff = targetYaw - camYaw;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const ease = player.inCar ? 3.5 : (moving ? 4.5 : 1.2);
  camYaw += diff * Math.min(1, ease * dt);

  const back = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  camDesired.copy(focusPos)
    .addScaledVector(back, -mode.dist)
    .add(new THREE.Vector3(0, mode.height, 0));
  // keep camera above ground
  if (camDesired.y < 1.5) camDesired.y = 1.5;
  camera.position.lerp(camDesired, Math.min(1, 8 * dt));
  camTarget.lerp(focusPos.clone().add(new THREE.Vector3(0, mode.look, 0)), Math.min(1, 10 * dt));
  camera.lookAt(camTarget);
}

// =============================================================
//  HUD
// =============================================================
const ui = {
  cash: document.querySelector('[data-cash]'),
  wanted: document.getElementById('wanted'),
  speed: document.querySelector('[data-speed]'),
  speedo: document.getElementById('speedo'),
  hint: document.getElementById('hint'),
};
let cash = 0;
let wanted = 0; // 0..5 (float, decays)
let hintTimer = 0;

function showHint(text, time = 2) {
  ui.hint.textContent = text;
  ui.hint.classList.add('show');
  hintTimer = time;
}
function refreshHud() {
  ui.cash.textContent = cash.toLocaleString();
  const stars = Math.round(wanted);
  ui.wanted.textContent = '★'.repeat(stars) + '☆'.repeat(Math.max(0, 5 - stars));
  if (stars === 0) ui.wanted.textContent = '';
}

// minimap
const mm = document.getElementById('minimap');
const mmx = mm.getContext('2d');
const MM_RANGE = 95; // world units shown from centre to edge
function drawMinimap(focusPos, focusYaw) {
  const w = mm.width;
  const c = w / 2;
  const scale = c / MM_RANGE;
  mmx.clearRect(0, 0, w, w);
  mmx.save();
  mmx.beginPath();
  mmx.arc(c, c, c, 0, Math.PI * 2);
  mmx.clip();
  mmx.fillStyle = '#3a7d3a';
  mmx.fillRect(0, 0, w, w);
  // roads (north-up, centred on player)
  mmx.strokeStyle = '#2b2e33';
  mmx.lineWidth = Math.max(2, WORLD.roadW * scale);
  for (let g = -WORLD.half; g <= WORLD.half; g += WORLD.block) {
    const sx = c + (g - focusPos.x) * scale;
    const sz = c + (g - focusPos.z) * scale;
    mmx.beginPath(); mmx.moveTo(sx, 0); mmx.lineTo(sx, w); mmx.stroke();
    mmx.beginPath(); mmx.moveTo(0, sz); mmx.lineTo(w, sz); mmx.stroke();
  }
  // pickups
  mmx.fillStyle = '#ffd34d';
  for (const p of pickups) {
    const sx = c + (p.pos.x - focusPos.x) * scale;
    const sz = c + (p.pos.z - focusPos.z) * scale;
    mmx.beginPath(); mmx.arc(sx, sz, 2.5, 0, Math.PI * 2); mmx.fill();
  }
  // cars
  mmx.fillStyle = '#cfd6df';
  for (const car of cars) {
    if (car === player.inCar) continue;
    const sx = c + (car.pos.x - focusPos.x) * scale;
    const sz = c + (car.pos.z - focusPos.z) * scale;
    mmx.beginPath(); mmx.arc(sx, sz, 2, 0, Math.PI * 2); mmx.fill();
  }
  mmx.restore();
  // player arrow
  mmx.save();
  mmx.translate(c, c);
  mmx.rotate(-focusYaw + Math.PI);
  mmx.fillStyle = '#ff3b3b';
  mmx.beginPath();
  mmx.moveTo(0, -7); mmx.lineTo(5, 6); mmx.lineTo(0, 3); mmx.lineTo(-5, 6); mmx.closePath();
  mmx.fill();
  mmx.restore();
}

// =============================================================
//  Game logic update
// =============================================================
const CAR = {
  accel: 26,
  maxFwd: 38,
  maxRev: 14,
  drag: 1.4,
  brakeForce: 40,
  steer: 2.4,
  radius: 2.3,
};
const FOOT = { speed: 7.5, accel: 16 };
const tmp = new THREE.Vector3();

// melee attack state
let attackCooldown = 0;
let attackSwing = 0;

// Radial deadzone helper so a slightly off-centre stick (or a touch that
// drifts) doesn't register as a constant turn — this is what made "straight"
// curve into a circle.
function deadzone(v, d = 0.14) {
  if (Math.abs(v) < d) return 0;
  return (v - Math.sign(v) * d) / (1 - d);
}

// ---- blood splatter particles ----
const blood = [];
const bloodGeo = new THREE.SphereGeometry(0.09, 5, 4);
const bloodMat = new THREE.MeshLambertMaterial({ color: 0xb01515 });
function spawnBlood(at, n = 9) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(bloodGeo, bloodMat);
    m.position.copy(at);
    scene.add(m);
    blood.push({
      m,
      v: new THREE.Vector3((Math.random() - 0.5) * 6, 3 + Math.random() * 5, (Math.random() - 0.5) * 6),
      life: 1.1,
    });
  }
}
function updateBlood(dt) {
  for (let i = blood.length - 1; i >= 0; i--) {
    const b = blood[i];
    b.v.y -= 20 * dt;
    b.m.position.addScaledVector(b.v, dt);
    if (b.m.position.y < 0.05) { b.m.position.y = 0.05; b.v.set(0, 0, 0); }
    b.life -= dt;
    if (b.life <= 0) { scene.remove(b.m); blood.splice(i, 1); }
  }
}

// Pop a pedestrian's head off and send the body sprawling.
function decapitate(ped, dir, force) {
  ped.knocked = true;
  ped.respawnIn = 6;
  if (!ped.headOff && ped.head) {
    ped.headOff = true;
    scene.attach(ped.head); // detach into world space, keeping position
    ped.headVel.copy(dir).multiplyScalar(force).setY(8 + Math.random() * 3);
    ped.headSpin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
    const stump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.24, 0.14, 8),
      new THREE.MeshLambertMaterial({ color: 0x8a1f1f })
    );
    stump.position.set(0, 1.46, 0);
    ped.mesh.add(stump);
    ped.stump = stump;
    spawnBlood(ped.pos.clone().setY(1.5));
  }
  ped.flyVel.copy(dir).multiplyScalar(force * 0.4);
  ped.flyVel.y = 3;
}

// Swing at the nearest pedestrian in front of the player.
function tryAttack() {
  attackSwing = 0.2;
  const fwd = new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
  let target = null;
  let bestD = 2.6 * 2.6;
  for (const ped of peds) {
    if (ped.knocked) continue;
    const to = ped.pos.clone().sub(player.pos); to.y = 0;
    const d = to.lengthSq();
    if (d < bestD && to.normalize().dot(fwd) > 0.1) { bestD = d; target = ped; }
  }
  if (target) {
    const dir = target.pos.clone().sub(player.pos).setY(0).normalize();
    decapitate(target, dir, 9);
    bumpWanted(1);
    cash += 10;
    showHint('OFF WITH THE HEAD! +$10');
  }
}

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of cars) {
    const d = car.pos.distanceToSquared(player.pos);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

// Oriented-box hitbox test: is world point p inside this car's body (padded)?
const CAR_HALF_F = 2.2; // half length (along travel)
const CAR_HALF_R = 1.05; // half width
function pointInCar(car, p, pad) {
  const dx = p.x - car.pos.x;
  const dz = p.z - car.pos.z;
  const sin = Math.sin(car.heading);
  const cos = Math.cos(car.heading);
  const localF = dx * sin + dz * cos;     // forward axis
  const localR = dx * cos - dz * sin;     // right axis
  return Math.abs(localF) < CAR_HALF_F + pad && Math.abs(localR) < CAR_HALF_R + pad;
}

// Knock a pedestrian down (ragdoll), decapitating on a fast enough hit.
function hitPed(ped, dir, speed) {
  if (speed > 17 && Math.random() < 0.5) {
    decapitate(ped, dir, speed * 0.4 + 6);
  } else {
    ped.knocked = true;
    ped.respawnIn = 6;
    ped.flyVel.copy(dir).multiplyScalar(speed * 0.5 + 4);
    ped.flyVel.y = 6 + Math.random() * 4;
  }
}

// Launch the player into a ragdoll when a car hits them on foot.
function knockPlayer(dir, speed) {
  player.knocked = true;
  player.inCar = null;
  player.downTimer = 2.2;
  player.grace = 0;
  player.flyVel.copy(dir).multiplyScalar(speed * 0.45 + 4);
  player.flyVel.y = 6 + Math.random() * 3;
  spawnBlood(player.pos.clone().setY(1));
  showHint('Splat!');
}

function updateFoot(dt) {
  // camera-relative movement. f = camera forward (into screen),
  // r = camera right (screen-right). Earlier the right vector was inverted,
  // which flipped left/right AND fed back through the follow-cam so that
  // holding "forward" slowly curved into a circle.
  const mx = deadzone(input.moveX);
  const my = deadzone(input.moveY);
  const f = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
  const r = new THREE.Vector3(-f.z, 0, f.x);
  tmp.set(0, 0, 0)
    .addScaledVector(f, my)
    .addScaledVector(r, mx);
  const mag = tmp.length();
  let moving = false;

  // attack (hold ATTACK / Space while on foot to swing repeatedly)
  if (input.brake && attackCooldown <= 0) {
    tryAttack();
    attackCooldown = 0.45;
  }
  attackSwing = Math.max(0, attackSwing - dt);

  if (mag > 0.05) {
    tmp.normalize();
    player.facing = Math.atan2(tmp.x, tmp.z);
    const sp = FOOT.speed * Math.min(1, mag);
    player.pos.addScaledVector(tmp, sp * dt);
    resolveCircle(player.pos, player.radius);
    player.pos.x = THREE.MathUtils.clamp(player.pos.x, -WORLD.half - 4, WORLD.half + 4);
    player.pos.z = THREE.MathUtils.clamp(player.pos.z, -WORLD.half - 4, WORLD.half + 4);
    moving = true;
  }

  // walk cycle / idle ease-out
  if (moving) {
    player.walkPhase += dt * 9 * Math.min(1, mag);
    animateWalk(playerRefs, player.walkPhase, 0.6);
  } else {
    for (const l of [...playerRefs.legs, ...playerRefs.arms]) l.rotation.x *= 1 - Math.min(1, dt * 12);
  }
  // punch: throw the right arm forward + lean while swinging
  if (attackSwing > 0) {
    const k = attackSwing / 0.2;
    playerRefs.arms[1].rotation.x = -1.6 * k;
    playerRefs.body.rotation.x = -0.18 * k;
  } else {
    playerRefs.body.rotation.x = 0;
  }

  playerMesh.position.copy(player.pos);
  playerMesh.rotation.y = player.facing;
  playerMesh.visible = true;

  // hijack the nearest car (moving traffic included)
  if (consumeAction()) {
    const car = nearestCar(5.5);
    if (car) {
      player.inCar = car;
      car.ai = false;
      playerMesh.visible = false;
      bumpWanted(0.5);
      showHint('Carjacked!');
    } else {
      showHint('No car nearby');
    }
  }
  updateCamera(dt, player.pos.clone().setY(1), player.facing, moving);
}

function updateCar(dt) {
  const car = player.inCar;
  const throttle = deadzone(input.moveY); // -1..1
  const steerIn = deadzone(input.moveX);

  // acceleration / reverse
  if (throttle > 0.05) car.speed += CAR.accel * throttle * dt;
  else if (throttle < -0.05) car.speed += CAR.accel * throttle * dt * 0.8;
  // natural drag
  car.speed -= car.speed * CAR.drag * dt * 0.3;
  // brake / handbrake
  if (input.brake) {
    const sign = Math.sign(car.speed);
    car.speed -= sign * CAR.brakeForce * dt;
    if (Math.sign(car.speed) !== sign) car.speed = 0;
  }
  car.speed = THREE.MathUtils.clamp(car.speed, -CAR.maxRev, CAR.maxFwd);

  // steering scales with speed and direction of travel
  const speedFactor = THREE.MathUtils.clamp(Math.abs(car.speed) / 10, 0, 1);
  car.heading -= steerIn * CAR.steer * dt * speedFactor * Math.sign(car.speed || 1);

  const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
  const prev = car.pos.clone();
  car.pos.addScaledVector(fwd, car.speed * dt);

  // collision against buildings
  if (resolveCircle(car.pos, CAR.radius)) {
    car.speed *= 0.3; // crunch
    // small wanted bump for serious crashes
    if (Math.abs(car.speed) > 6) bumpWanted(0.15);
  }
  car.pos.x = THREE.MathUtils.clamp(car.pos.x, -WORLD.half - 2, WORLD.half + 2);
  car.pos.z = THREE.MathUtils.clamp(car.pos.z, -WORLD.half - 2, WORLD.half + 2);

  // shove other cars out of the way (and get shoved back)
  for (const o of cars) {
    if (o === car) continue;
    const to = car.pos.clone().sub(o.pos); to.y = 0;
    const d = to.length();
    if (d > 0.001 && d < 3.4) {
      to.multiplyScalar(1 / d);
      const push = 3.4 - d;
      car.pos.addScaledVector(to, push * 0.55);
      o.pos.addScaledVector(to, -push * 0.45);
      o.mesh.position.copy(o.pos);
      car.speed *= 0.9;
      o.speed *= 0.4;
    }
  }

  car.mesh.position.copy(car.pos);
  car.mesh.rotation.y = car.heading;
  // subtle body roll on steering
  car.mesh.rotation.z = -steerIn * speedFactor * 0.06;

  // run over pedestrians (oriented hitbox)
  if (Math.abs(car.speed) > 4) {
    for (const ped of peds) {
      if (ped.knocked) continue;
      if (pointInCar(car, ped.pos, 0.4)) {
        const dir = ped.pos.clone().sub(prev).setY(0).normalize();
        hitPed(ped, dir, Math.abs(car.speed));
        bumpWanted(1);
        cash += 5; // chaos pays, apparently
        showHint('Watch it! +$5');
      }
    }
  }

  // keep player position with the car
  player.pos.copy(car.pos);

  // exit car — hand it back to the AI traffic flow
  if (consumeAction()) {
    player.inCar = null;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    player.pos.copy(car.pos).addScaledVector(side, 2.2);
    resolveCircle(player.pos, player.radius);
    car.speed = Math.max(0, car.speed * 0.4);
    carToTraffic(car);
    showHint('On foot.');
  }

  // speedo
  ui.speedo.hidden = false;
  ui.speed.textContent = Math.round(Math.abs(car.speed) * 3.6);

  updateCamera(dt, car.pos.clone().setY(1.2), car.heading, true);
}

function bumpWanted(amount) {
  wanted = Math.min(5, wanted + amount);
}

function updatePeds(dt) {
  for (const ped of peds) {
    if (ped.knocked) {
      // simple ballistic ragdoll for the body
      ped.flyVel.y -= 22 * dt;
      ped.pos.addScaledVector(ped.flyVel, dt);
      if (ped.pos.y < 0) { ped.pos.y = 0; ped.flyVel.set(0, 0, 0); }
      ped.mesh.position.copy(ped.pos);
      if (ped.pos.y > 0.02) { // tumble while airborne, settle on the ground
        ped.mesh.rotation.x += dt * 6;
        ped.mesh.rotation.z += dt * 4;
      } else {
        ped.mesh.rotation.x = Math.PI / 2; // lying down
      }

      // the severed head flies and bounces on its own
      if (ped.headOff && ped.head) {
        ped.headVel.y -= 20 * dt;
        ped.head.position.addScaledVector(ped.headVel, dt);
        ped.head.rotation.x += ped.headSpin.x * dt;
        ped.head.rotation.y += ped.headSpin.y * dt;
        ped.head.rotation.z += ped.headSpin.z * dt;
        if (ped.head.position.y < 0.26) {
          ped.head.position.y = 0.26;
          ped.headVel.x *= 0.6;
          ped.headVel.z *= 0.6;
          ped.headVel.y = Math.abs(ped.headVel.y) * 0.35;
          ped.headSpin.multiplyScalar(0.7);
        }
      }

      ped.respawnIn -= dt;
      if (ped.respawnIn <= 0) {
        // respawn somewhere fresh, fully reassembled
        let x, z, guard = 0;
        do {
          x = THREE.MathUtils.randFloat(-WORLD.half + 10, WORLD.half - 10);
          z = THREE.MathUtils.randFloat(-WORLD.half + 10, WORLD.half - 10);
          guard++;
        } while (resolveCircle({ x, z }, 1.2) && guard < 30);
        ped.pos.set(x, 0, z);
        ped.knocked = false;
        ped.mesh.rotation.set(0, 0, 0);
        if (ped.headOff && ped.head) {
          ped.mesh.add(ped.head); // re-parent head back onto the body
          ped.head.position.set(0, 1.62, 0);
          ped.head.rotation.set(0, 0, 0);
          ped.headOff = false;
        }
        if (ped.stump) { ped.mesh.remove(ped.stump); ped.stump = null; }
      }
      continue;
    }
    ped.changeIn -= dt;
    if (ped.changeIn <= 0) {
      ped.dir += THREE.MathUtils.randFloatSpread(Math.PI);
      ped.changeIn = 1.5 + Math.random() * 3;
    }
    const step = new THREE.Vector3(Math.sin(ped.dir), 0, Math.cos(ped.dir)).multiplyScalar(1.4 * dt);
    ped.pos.add(step);
    if (resolveCircle(ped.pos, 0.5) ||
        Math.abs(ped.pos.x) > WORLD.half - 4 || Math.abs(ped.pos.z) > WORLD.half - 4) {
      ped.dir += Math.PI; // turn around at obstacles
      ped.pos.add(step.multiplyScalar(-1));
    }
    ped.mesh.position.copy(ped.pos);
    ped.mesh.rotation.y = ped.dir;
    // stroll animation
    ped.walkPhase += dt * 7;
    animateWalk(ped.refs, ped.walkPhase, 0.5);
  }
}

// AI traffic: cruise the road grid, brake for cars ahead, turn at junctions.
function updateTraffic(dt) {
  for (const car of cars) {
    if (!car.ai || car === player.inCar) continue;
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));

    // brake if something is close ahead (another car or the player on foot).
    // NOTE: traffic yields to *cars* and to *the player*, but not to wandering
    // pedestrians — jaywalkers get run over.
    let blocked = false;
    for (const o of cars) {
      if (o === car) continue;
      const to = o.pos.clone().sub(car.pos); to.y = 0;
      const d = to.length();
      if (d < 6.5 && d > 0.001 && to.multiplyScalar(1 / d).dot(fwd) > 0.7) { blocked = true; break; }
    }
    if (!player.inCar && !player.knocked) {
      const toP = player.pos.clone().sub(car.pos); toP.y = 0;
      const dp = toP.length();
      if (dp < 8 && dp > 0.001 && toP.multiplyScalar(1 / dp).dot(fwd) > 0.45) blocked = true;
    }

    const targetSpeed = blocked ? 0 : car.cruise;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 3);

    // steer toward the lane target, smoothing the heading
    const toT = car.target.clone().sub(car.pos); toT.y = 0;
    const dist = toT.length();
    const desired = Math.atan2(toT.x, toT.z);
    let diff = desired - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += diff * Math.min(1, dt * 6);

    const f2 = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    car.pos.addScaledVector(f2, car.speed * dt);
    car.mesh.position.copy(car.pos);
    car.mesh.rotation.set(0, car.heading, 0);

    // traffic can mow down pedestrians and the player
    if (car.speed > 3) {
      for (const ped of peds) {
        if (ped.knocked) continue;
        if (pointInCar(car, ped.pos, 0.4)) hitPed(ped, f2.clone(), car.speed);
      }
      if (!player.inCar && !player.knocked && player.grace <= 0 && pointInCar(car, player.pos, 0.5)) {
        knockPlayer(f2.clone(), car.speed);
      }
    }

    if (dist < 2.2) { car.ix = car.tx; car.iz = car.tz; setNextLeg(car); }
  }
}

// Player ragdoll while down after being hit by a car.
function updatePlayerRagdoll(dt) {
  player.flyVel.y -= 22 * dt;
  player.pos.addScaledVector(player.flyVel, dt);
  if (player.pos.y < 0) { player.pos.y = 0; player.flyVel.set(0, 0, 0); }
  playerMesh.position.copy(player.pos);
  playerMesh.visible = true;
  if (player.pos.y > 0.02) {
    playerMesh.rotation.x += dt * 7;
    playerMesh.rotation.z += dt * 5;
  } else {
    playerMesh.rotation.set(Math.PI / 2, player.facing, 0); // lying down
  }
  player.downTimer -= dt;
  if (player.downTimer <= 0) {
    player.knocked = false;
    player.grace = 1.2; // brief immunity so you don't get instantly re-hit
    playerMesh.rotation.set(0, player.facing, 0);
    resolveCircle(player.pos, player.radius);
  }
  updateCamera(dt, player.pos.clone().setY(1), player.facing, false);
}

function updatePickups(dt, t) {
  const focus = player.pos;
  for (const p of pickups) {
    p.mesh.rotation.z = t * 2.5;
    p.mesh.position.y = 1.1 + Math.sin(t * 3 + p.pos.x) * 0.15;
    if (p.pos.distanceToSquared(focus) < (player.inCar ? 3.2 : 1.6) ** 2) {
      cash += 50;
      showHint('+$50');
      const np = randomRoadPoint();
      p.pos.set(np.x, 1.1, np.z);
      p.mesh.position.set(np.x, 1.1, np.z);
    }
  }
}

// =============================================================
//  Main loop
// =============================================================
let last = performance.now();
let started = false;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!started) { renderer.render(scene, camera); return; }
  const t = now / 1000;

  if (consumeCamera()) {
    camModeIdx = (camModeIdx + 1) % camModes.length;
  }

  if (attackCooldown > 0) attackCooldown -= dt;
  if (player.grace > 0) player.grace -= dt;

  if (player.knocked) {
    updatePlayerRagdoll(dt);
    ui.speedo.hidden = true;
  } else if (player.inCar) {
    updateCar(dt);
    document.querySelector('[data-btn="action"]').textContent = 'EXIT';
    document.querySelector('[data-btn="brake"]').textContent = 'BRAKE';
  } else {
    updateFoot(dt);
    ui.speedo.hidden = true;
    document.querySelector('[data-btn="action"]').textContent = 'ENTER';
    document.querySelector('[data-btn="brake"]').textContent = 'ATTACK';
  }

  updateTraffic(dt);
  updatePeds(dt);
  updatePickups(dt, t);
  updateBlood(dt);

  // wanted decays slowly
  if (wanted > 0) wanted = Math.max(0, wanted - dt * 0.06);

  // hint fade
  if (hintTimer > 0) {
    hintTimer -= dt;
    if (hintTimer <= 0) ui.hint.classList.remove('show');
  }

  // keep the sun shadow frustum centred on the action
  sun.position.set(player.pos.x + 80, 130, player.pos.z + 40);
  sun.target.position.copy(player.pos);

  refreshHud();
  const focusYaw = player.inCar ? player.inCar.heading : player.facing;
  drawMinimap(player.pos, focusYaw);

  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// =============================================================
//  Boot
// =============================================================
setupInput();

const overlay = document.getElementById('overlay');
document.getElementById('start-btn').addEventListener('click', () => {
  overlay.classList.add('hidden');
  started = true;
  last = performance.now();
  showHint('ATTACK to knock heads off · ENTER a car to drive', 4);
}, { once: true });

// expose for quick console poking during dev
window.__game = { player, cars, peds, pickups };
