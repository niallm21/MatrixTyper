import * as THREE from 'three';
import { buildWorld, CELL, WALL_H, worldToCell } from './world.js';
import { Controls } from './controls.js';
import { Entity } from './entity.js';
import { AudioManager } from './audio.js';
import { HUD } from './hud.js';

const COLS = 22, ROWS = 22;
const EYE = 1.62;
const PLAYER_R = 0.34;
const WALK = 3.1, RUN = 5.3;

const app = document.getElementById('app');

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.appendChild(renderer.domElement);

// ---------- scene / camera ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0b06);
scene.fog = new THREE.FogExp2(0x0c0b06, 0.05);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 80);

// ---------- world ----------
const world = buildWorld(scene, COLS, ROWS, Math.random);

// ---------- player ----------
const player = {
  pos: world.spawn.clone(),
  yaw: 0, pitch: 0,
  stamina: 1, bob: 0,
};
player.pos.y = EYE;

const controls = new Controls(renderer.domElement);
const audio = new AudioManager();
const hud = new HUD();

// touch device tweaks
if (controls.isTouch) {
  document.body.classList.add('touch');
  document.getElementById('ctrlHint').textContent = 'Left stick to move • drag right to look • RUN to sprint';
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, controls.isTouch ? 1.5 : 2));

// ---------- entity ----------
const distFromSpawn = world.maze.distanceField(1, 1);
let bestD = 0;
for (const d of distFromSpawn) bestD = Math.max(bestD, d);
const entCandidates = [];
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  const d = distFromSpawn[world.maze.idx(x, y)];
  if (d > bestD * 0.42 && d < bestD * 0.78) entCandidates.push({ x, y });
}
const startCell = entCandidates.length
  ? entCandidates[(Math.random() * entCandidates.length) | 0]
  : { x: COLS - 2, y: ROWS - 2 };
const entity = new Entity(scene, world, startCell);

// ---------- state ----------
const visited = new Array(COLS * ROWS).fill(false);
let fusesCollected = 0;
const totalFuses = world.fuses.length;
let playing = false, finished = false;
let startTime = 0;

hud.setObjective('Find the <b>power fuses</b> — restore the <b>EXIT</b>');
hud.setFuses(0, totalFuses);

// ---------- collision ----------
function collides(x, z) {
  const r = PLAYER_R;
  for (const c of world.colliders) {
    if (x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r) return true;
  }
  return false;
}

// ---------- input -> movement ----------
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
let stepAccum = 0;

function updatePlayer(dt) {
  // look
  const l = controls.consumeLook();
  const sens = controls.isTouch ? 0.0042 : 0.0022;
  player.yaw -= l.dx * sens;
  player.pitch -= l.dy * sens;
  player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch));
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');

  // movement basis
  _forward.set(0, 0, -1).applyQuaternion(camera.quaternion); _forward.y = 0; _forward.normalize();
  _right.set(1, 0, 0).applyQuaternion(camera.quaternion); _right.y = 0; _right.normalize();

  const mv = controls.move;
  const mag = Math.hypot(mv.x, mv.y);
  let speed = WALK;
  const wantRun = controls.sprint && mag > 0.1 && player.stamina > 0.05;
  if (wantRun) { speed = RUN; player.stamina = Math.max(0, player.stamina - dt * 0.30); }
  else { player.stamina = Math.min(1, player.stamina + dt * 0.18); }
  hud.setStamina(player.stamina);

  let dx = (_forward.x * mv.y + _right.x * mv.x) * speed * dt;
  let dz = (_forward.z * mv.y + _right.z * mv.x) * speed * dt;

  // resolve per-axis
  if (!collides(player.pos.x + dx, player.pos.z)) player.pos.x += dx; else dx = 0;
  if (!collides(player.pos.x, player.pos.z + dz)) player.pos.z += dz; else dz = 0;

  // camera bob + footsteps
  const moving = (Math.abs(dx) + Math.abs(dz)) > 0.0005;
  if (moving) {
    player.bob += dt * (wantRun ? 13 : 9);
    stepAccum += dt * (wantRun ? 2.4 : 1.7);
    if (stepAccum >= 1) { stepAccum = 0; audio.footstep(wantRun); }
  }
  const bobY = Math.sin(player.bob) * 0.05 * (moving ? 1 : 0);
  camera.position.set(player.pos.x, EYE + bobY, player.pos.z);
}

// ---------- objective logic ----------
function checkPickups() {
  for (const f of world.fuses) {
    if (f.collected) continue;
    const d = Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
    if (d < 1.5) {
      f.collected = true;
      f.mesh.visible = false;
      f.light.intensity = 0;
      fusesCollected++;
      audio.pickup();
      hud.setFuses(fusesCollected, totalFuses);
      hud.flash();
      if (fusesCollected >= totalFuses) {
        world.exit.setUnlocked();
        hud.setObjective('Power restored — reach the <b>EXIT</b>');
        hud.toast('POWER RESTORED — the EXIT is now open', 3200);
        audio.win();
      } else {
        hud.toast(`Fuse recovered (${fusesCollected}/${totalFuses})`);
      }
    }
  }
}

function checkExit() {
  if (!world.exit.unlocked) return;
  const d = Math.hypot(player.pos.x - world.exit.pos.x, player.pos.z - world.exit.pos.z);
  if (d < 2.2) win();
}

function win() {
  if (finished) return;
  finished = true; playing = false;
  const t = ((performance.now() - startTime) / 1000) | 0;
  const mm = String((t / 60) | 0).padStart(2, '0');
  const ss = String(t % 60).padStart(2, '0');
  document.getElementById('winStats').innerHTML =
    `You restored power and escaped the Backrooms.<br/>Time: ${mm}:${ss} &nbsp;•&nbsp; Fuses: ${totalFuses}/${totalFuses}`;
  document.exitPointerLock?.();
  hud.showScreen('winScreen');
}

function gameOver() {
  if (finished) return;
  finished = true; playing = false;
  audio.scare();
  hud.flash();
  document.exitPointerLock?.();
  hud.showScreen('overScreen');
}

// ---------- loop ----------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, clock.getDelta());
  const time = clock.elapsedTime;

  if (playing && !finished) {
    updatePlayer(dt);

    // reveal visited cells (3x3 around player)
    const pc = worldToCell(player.pos, COLS, ROWS);
    for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
      const nx = pc.x + xx, ny = pc.y + yy;
      if (nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS) visited[world.maze.idx(nx, ny)] = true;
    }

    world.update(dt, player.pos, time);
    const er = entity.update(dt, player.pos, audio);

    checkPickups();
    checkExit();
    if (er.caught) gameOver();

    const ec = worldToCell(entity.pos, COLS, ROWS);
    hud.drawMinimap(world, pc, ec, visited, er.distToPlayer < 20);
  }

  renderer.render(scene, camera);
}
animate();

// ---------- screens / lifecycle ----------
function beginGame() {
  audio.start();
  hud.hideScreens();
  playing = true;
  finished = false;
  startTime = performance.now();
  if (!controls.isTouch) renderer.domElement.requestPointerLock?.();
  controls.enabled = true;
}

document.getElementById('startBtn').addEventListener('click', beginGame);
document.getElementById('winBtn').addEventListener('click', () => location.reload());
document.getElementById('overBtn').addEventListener('click', () => location.reload());

// pause if pointer lock lost mid-game (desktop) — keep rendering, stop sim feel
document.addEventListener('pointerlockchange', () => {
  if (!controls.isTouch && playing && !finished && document.pointerLockElement !== renderer.domElement) {
    // soft pause: stop movement input by clearing keys
    controls.keys = {};
    controls.move.x = 0; controls.move.y = 0;
  }
});

// ---------- resize ----------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

hud.showScreen('startScreen');
