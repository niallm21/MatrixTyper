import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Maze, N, E, S, W } from './maze.js';
import {
  wallpaperTexture, carpetTexture, ceilingTexture, lightPanelTexture,
} from './textures.js';

export const CELL = 6;
export const WALL_H = 3.2;
export const WALL_T = 0.34;
const TILE = 2.2; // texture metres per repeat

function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  uv.needsUpdate = true;
}

// convert cell -> world centre
export function cellToWorld(x, y) {
  return new THREE.Vector3(x * CELL, 0, y * CELL);
}
export function worldToCell(v, cols, rows) {
  return {
    x: Math.max(0, Math.min(cols - 1, Math.round(v.x / CELL))),
    y: Math.max(0, Math.min(rows - 1, Math.round(v.z / CELL))),
  };
}

export function buildWorld(scene, cols, rows, rand) {
  const maze = new Maze(cols, rows, rand);
  const group = new THREE.Group();
  scene.add(group);

  const colliders = []; // {minX,maxX,minZ,maxZ}
  const addBox = (cx, cz, hx, hz) =>
    colliders.push({ minX: cx - hx, maxX: cx + hx, minZ: cz - hz, maxZ: cz + hz });

  // ---------- materials ----------
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallpaperTexture(), roughness: 0.92, metalness: 0.0,
  });
  const carpetMat = new THREE.MeshStandardMaterial({
    map: carpetTexture(), roughness: 1.0, metalness: 0.0,
  });
  const ceilMat = new THREE.MeshStandardMaterial({
    map: ceilingTexture(), roughness: 0.95, metalness: 0.0,
  });

  // ---------- floor & ceiling ----------
  const fullW = cols * CELL, fullD = rows * CELL;
  const ox = -CELL / 2, oz = -CELL / 2;
  carpetMat.map.repeat.set(fullW / TILE, fullD / TILE);
  ceilMat.map.repeat.set(cols, rows);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fullW, fullD), carpetMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox + fullW / 2, 0, oz + fullD / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(fullW, fullD), ceilMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(ox + fullW / 2, WALL_H, oz + fullD / 2);
  group.add(ceil);

  // ---------- walls (merged) ----------
  const vTemplate = new THREE.BoxGeometry(WALL_T, WALL_H, CELL);
  const hTemplate = new THREE.BoxGeometry(CELL, WALL_H, WALL_T);
  scaleUV(vTemplate, CELL / TILE, WALL_H / TILE);
  scaleUV(hTemplate, CELL / TILE, WALL_H / TILE);

  const wallGeos = [];
  const pushWall = (template, x, y, z) => {
    const g = template.clone();
    g.translate(x, y, z);
    wallGeos.push(g);
  };

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const wx = x * CELL, wz = y * CELL;
      if (maze.hasWall(x, y, W)) {
        const cx = wx - CELL / 2;
        pushWall(vTemplate, cx, WALL_H / 2, wz);
        addBox(cx, wz, WALL_T / 2, CELL / 2);
      }
      if (maze.hasWall(x, y, N)) {
        const cz = wz - CELL / 2;
        pushWall(hTemplate, wx, WALL_H / 2, cz);
        addBox(wx, cz, CELL / 2, WALL_T / 2);
      }
      if (x === cols - 1 && maze.hasWall(x, y, E)) {
        const cx = wx + CELL / 2;
        pushWall(vTemplate, cx, WALL_H / 2, wz);
        addBox(cx, wz, WALL_T / 2, CELL / 2);
      }
      if (y === rows - 1 && maze.hasWall(x, y, S)) {
        const cz = wz + CELL / 2;
        pushWall(hTemplate, wx, WALL_H / 2, cz);
        addBox(wx, cz, CELL / 2, WALL_T / 2);
      }
    }
  }
  const wallMesh = new THREE.Mesh(mergeGeometries(wallGeos, false), wallMat);
  wallMesh.castShadow = false;
  group.add(wallMesh);
  wallGeos.forEach((g) => g.dispose());

  // ---------- support pillars (sparse, structural) ----------
  const pillarMat = new THREE.MeshStandardMaterial({ map: wallpaperTexture(), roughness: 0.9 });
  const pillarTemplate = new THREE.BoxGeometry(0.7, WALL_H, 0.7);
  scaleUV(pillarTemplate, 0.7 / TILE, WALL_H / TILE);
  const pillarGeos = [];
  for (let y = 1; y < rows; y++) {
    for (let x = 1; x < cols; x++) {
      if (rand() < 0.12) {
        const px = x * CELL - CELL / 2, pz = y * CELL - CELL / 2;
        const g = pillarTemplate.clone();
        g.translate(px, WALL_H / 2, pz);
        pillarGeos.push(g);
        addBox(px, pz, 0.45, 0.45);
      }
    }
  }
  if (pillarGeos.length) {
    const pm = new THREE.Mesh(mergeGeometries(pillarGeos, false), pillarMat);
    group.add(pm);
    pillarGeos.forEach((g) => g.dispose());
  }

  // ---------- ceiling light panels (emissive, cheap) ----------
  const panelTex = lightPanelTexture();
  const panelMat = new THREE.MeshStandardMaterial({
    map: panelTex, emissive: 0xfff4d6, emissiveMap: panelTex,
    emissiveIntensity: 1.4, roughness: 1, metalness: 0,
  });
  const panelGeo = new THREE.PlaneGeometry(CELL * 0.5, CELL * 0.5);
  const panels = []; // {pos, mesh}
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if ((x + y) % 2 === 0) {
        const m = new THREE.Mesh(panelGeo, panelMat);
        m.rotation.x = Math.PI / 2;
        m.position.set(x * CELL, WALL_H - 0.02, y * CELL);
        group.add(m);
        panels.push({ pos: m.position.clone(), mesh: m });
      }
    }
  }

  // ---------- dynamic light pool (follows the player) ----------
  const POOL = 7;
  const lightPool = [];
  for (let i = 0; i < POOL; i++) {
    const l = new THREE.PointLight(0xfff1cc, 6.0, CELL * 2.6, 2.0);
    l.position.set(0, WALL_H - 0.3, 0);
    group.add(l);
    lightPool.push(l);
  }
  const ambient = new THREE.AmbientLight(0x46401f, 0.65);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x9c8c4a, 0x2a2410, 0.35);
  scene.add(hemi);

  // ---------- prop clusters ----------
  const props = buildProps(group, maze, rand, addBox);

  // ---------- objective placement ----------
  const spawnCell = { x: 1, y: 1 };
  const dist = maze.distanceField(spawnCell.x, spawnCell.y);

  // exit = farthest reachable cell
  let exitCell = { x: cols - 2, y: rows - 2 }, best = -1;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = dist[maze.idx(x, y)];
      if (d > best) { best = d; exitCell = { x, y }; }
    }
  }

  // fuses = spread-out cells in the far half, away from each other
  const NUM_FUSES = 5;
  const candidates = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const d = dist[maze.idx(x, y)];
      if (d > best * 0.30 && !(x === exitCell.x && y === exitCell.y)) candidates.push({ x, y, d });
    }
  }
  shuffle(candidates, rand);
  const fuseCells = [];
  for (const c of candidates) {
    if (fuseCells.length >= NUM_FUSES) break;
    if (fuseCells.every((f) => Math.abs(f.x - c.x) + Math.abs(f.y - c.y) > 4)) fuseCells.push(c);
  }
  while (fuseCells.length < NUM_FUSES && candidates.length) fuseCells.push(candidates.pop());

  const fuses = fuseCells.map((c) => makeFuse(group, cellToWorld(c.x, c.y)));
  const exit = makeExit(group, cellToWorld(exitCell.x, exitCell.y), addBox);

  // ---------- per-frame world update ----------
  const _tmp = new THREE.Vector3();
  let flickerT = 0, flickerCell = null;
  function update(dt, playerPos, time) {
    // light pool -> nearest panels
    panels.sort((a, b) => a.pos.distanceToSquared(playerPos) - b.pos.distanceToSquared(playerPos));
    for (let i = 0; i < lightPool.length; i++) {
      const p = panels[i];
      if (p) {
        lightPool[i].position.copy(p.pos);
        lightPool[i].position.y = WALL_H - 0.25;
        lightPool[i].intensity = 6.0;
      } else lightPool[i].intensity = 0;
    }
    // occasional flicker on the nearest light + its panel
    flickerT -= dt;
    if (flickerT <= 0) { flickerT = 2 + rand() * 5; flickerCell = (rand() * lightPool.length) | 0; }
    if (flickerT < 0.25 && lightPool[flickerCell]) {
      const f = rand() > 0.5 ? 0.2 : 1.0;
      lightPool[flickerCell].intensity *= f;
    }
    panelMat.emissiveIntensity = 1.2 + Math.sin(time * 13) * 0.12;

    // fuses bob + spin
    for (const f of fuses) {
      if (f.collected) continue;
      f.mesh.rotation.y += dt * 1.6;
      f.core.position.y = 0.9 + Math.sin(time * 2 + f.phase) * 0.12;
      f.light.intensity = 2.4 + Math.sin(time * 4 + f.phase) * 1.0;
    }
    exit.update(dt, time);
  }

  return {
    group, maze, colliders, fuses, exit, panels, lightPool, update,
    spawn: cellToWorld(spawnCell.x, spawnCell.y),
    cols, rows,
  };
}

// ---------------- props ----------------
function buildProps(group, maze, rand, addBox) {
  const cardboard = new THREE.MeshStandardMaterial({ color: 0x8a6a3c, roughness: 1 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x6b6b70, roughness: 0.5, metalness: 0.7 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x202024, roughness: 0.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd9b400, roughness: 0.6, emissive: 0x2a2200, emissiveIntensity: 0.4 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 1 });

  const cols = maze.cols, rows = maze.rows;
  const placed = [];

  const cluster = {
    boxes(g, p) {
      const n = 2 + ((rand() * 4) | 0);
      for (let i = 0; i < n; i++) {
        const s = 0.5 + rand() * 0.5;
        const b = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), cardboard);
        b.position.set(p.x + (rand() - 0.5) * 2.4, s / 2 + (rand() < 0.4 ? s : 0) * 0, p.z + (rand() - 0.5) * 2.4);
        b.rotation.y = rand() * Math.PI;
        b.castShadow = true; g.add(b);
      }
      addBox(p.x, p.z, 1.3, 1.3);
    },
    barrels(g, p) {
      const n = 1 + ((rand() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.1, 14), metal);
        b.position.set(p.x + (rand() - 0.5) * 2.2, 0.55, p.z + (rand() - 0.5) * 2.2);
        b.castShadow = true; g.add(b);
      }
      addBox(p.x, p.z, 1.1, 1.1);
    },
    chairs(g, p) {
      const n = 1 + ((rand() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const ch = new THREE.Group();
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), fabric);
        seat.position.y = 0.5; ch.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.08), fabric);
        back.position.set(0, 0.78, -0.22); ch.add(back);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 8), metal);
        pole.position.y = 0.27; ch.add(pole);
        ch.position.set(p.x + (rand() - 0.5) * 2.2, i * 0.5, p.z + (rand() - 0.5) * 2.2);
        ch.rotation.y = rand() * Math.PI; ch.children.forEach((c) => (c.castShadow = true));
        g.add(ch);
      }
      addBox(p.x, p.z, 1.0, 1.0);
    },
    shelf(g, p) {
      const sh = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.5), metal);
      frame.position.y = 1.1; sh.add(frame);
      for (let i = 0; i < 3; i++) {
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.5), plastic);
        shelf.position.y = 0.4 + i * 0.7; sh.add(shelf);
      }
      sh.position.set(p.x, 0, p.z); sh.rotation.y = (rand() * 4 | 0) * Math.PI / 2;
      sh.children.forEach((c) => (c.castShadow = true));
      g.add(sh);
      addBox(p.x, p.z, 1.0, 0.4);
    },
    sign(g, p) {
      const sg = new THREE.Group();
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.04), yellow);
      a.position.set(-0.13, 0.35, 0); a.rotation.y = 0.3; sg.add(a);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.04), yellow);
      b.position.set(0.13, 0.35, 0); b.rotation.y = -0.3; sg.add(b);
      sg.position.set(p.x + (rand() - 0.5) * 1.5, 0, p.z + (rand() - 0.5) * 1.5);
      g.add(sg);
    },
    pipes(g, p) {
      const n = 2 + ((rand() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, CELL * 0.8, 10), metal);
        pipe.rotation.z = Math.PI / 2;
        pipe.position.set(p.x, WALL_H - 0.4 - i * 0.32, p.z);
        g.add(pipe);
      }
    },
  };
  const types = Object.keys(cluster);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if ((x === 1 && y === 1)) continue; // keep spawn clear
      if (rand() < 0.10) {
        const t = types[(rand() * types.length) | 0];
        const p = cellToWorld(x, y);
        cluster[t](group, p);
        placed.push([x, y]);
      }
    }
  }
  return placed;
}

// ---------------- fuse ----------------
function makeFuse(group, pos) {
  const g = new THREE.Group();
  g.position.copy(pos);
  // pedestal
  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x303034, roughness: 0.6, metalness: 0.5 })
  );
  ped.position.y = 0.3; ped.castShadow = true; g.add(ped);
  // glowing core
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.5, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x66ffcc, emissive: 0x33ffbb, emissiveIntensity: 2.2, roughness: 0.3 })
  );
  core.position.y = 0.95; g.add(core);
  const light = new THREE.PointLight(0x44ffcc, 2.5, 7, 2);
  light.position.y = 1.0; g.add(light);
  group.add(g);
  return { mesh: g, core, light, pos: pos.clone(), collected: false, phase: Math.random() * 6.28 };
}

// ---------------- exit ----------------
function makeExit(group, pos, addBox) {
  const g = new THREE.Group();
  g.position.copy(pos);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.7, metalness: 0.3 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.4), frameMat);
  frame.position.y = 1.5; g.add(frame);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, emissive: 0x000000, roughness: 0.4 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.1), doorMat);
  door.position.set(0, 1.4, 0.22); g.add(door);
  // EXIT sign (emissive bar)
  const signMat = new THREE.MeshStandardMaterial({ color: 0xff3322, emissive: 0xff2200, emissiveIntensity: 2.0 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.08), signMat);
  sign.position.set(0, 3.0, 0.25); g.add(sign);
  const sLight = new THREE.PointLight(0xff3322, 2.0, 6, 2);
  sLight.position.set(0, 2.6, 0.6); g.add(sLight);
  group.add(g);
  addBox(pos.x, pos.z, 1.0, 0.3);

  let unlocked = false;
  return {
    group: g, pos: pos.clone(),
    get unlocked() { return unlocked; },
    setUnlocked() {
      unlocked = true;
      signMat.color.set(0x33ff55); signMat.emissive.set(0x22ff33);
      sLight.color.set(0x33ff55);
      doorMat.emissive.set(0x113311); doorMat.emissiveIntensity = 0.6;
    },
    update(dt, time) {
      const pulse = unlocked ? 1.6 + Math.sin(time * 6) * 0.6 : 1.4 + Math.sin(time * 2.5) * 0.5;
      signMat.emissiveIntensity = pulse;
      sLight.intensity = pulse;
    },
  };
}

function shuffle(a, rand) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
}
