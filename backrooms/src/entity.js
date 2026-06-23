import * as THREE from 'three';
import { cellToWorld, worldToCell, CELL } from './world.js';

// The wanderer. Roams the level; when it has line of sight to a nearby player
// it pursues using a BFS gradient from the player's cell (true pathfinding),
// and keeps hunting the last-seen location for a while after losing sight.

const WANDER_SPEED = 1.7;
const CHASE_SPEED = 3.25;
const AGGRO_DIST = 17;
const LOSE_TIME = 5.0;
const CATCH_DIST = 1.05;

export class Entity {
  constructor(scene, world, startCell) {
    this.world = world;
    this.maze = world.maze;
    this.colliders = world.colliders;
    this.pos = cellToWorld(startCell.x, startCell.y);
    this.pos.y = 0;
    this.target = { ...startCell };
    this.mode = 'wander';
    this.seenTimer = 0;
    this.losTimer = 0;
    this.canSee = false;
    this._field = null; this._fieldKey = '';

    this.mesh = this._build();
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
  }

  _build() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.95, metalness: 0 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 2.0, 12), dark);
    body.position.y = 1.0; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), dark);
    head.position.y = 2.15; g.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffdd66, emissiveIntensity: 3 });
    this.eyeMat = eyeMat;
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    const eR = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    eL.position.set(-0.1, 2.18, 0.22); eR.position.set(0.1, 2.18, 0.22);
    g.add(eL); g.add(eR);
    // long thin arms for silhouette
    const armMat = dark;
    const aL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), armMat);
    aL.position.set(-0.35, 1.1, 0); aL.rotation.z = 0.18; g.add(aL);
    const aR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), armMat);
    aR.position.set(0.35, 1.1, 0); aR.rotation.z = -0.18; g.add(aR);
    this.glow = new THREE.PointLight(0xff5533, 0, 5, 2);
    this.glow.position.y = 2.1; g.add(this.glow);
    return g;
  }

  _hasLOS(playerPos) {
    const dx = playerPos.x - this.pos.x, dz = playerPos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > AGGRO_DIST) return false;
    const steps = Math.ceil(dist / 0.4);
    const ux = dx / steps, uz = dz / steps;
    let x = this.pos.x, z = this.pos.z;
    for (let i = 0; i < steps; i++) {
      x += ux; z += uz;
      for (const c of this.colliders) {
        if (x > c.minX - 0.1 && x < c.maxX + 0.1 && z > c.minZ - 0.1 && z < c.maxZ + 0.1) return false;
      }
    }
    return true;
  }

  _ensureField(pc) {
    const key = pc.x + ',' + pc.y;
    if (key !== this._fieldKey) {
      this._fieldKey = key;
      this._field = this.maze.distanceField(pc.x, pc.y);
    }
  }

  _nextWanderCell(cur) {
    const ns = this.maze.neighbors(cur.x, cur.y);
    if (!ns.length) return cur;
    // prefer not to immediately reverse
    const filtered = ns.filter(([x, y]) => !(x === this._prev?.x && y === this._prev?.y));
    const pick = (filtered.length ? filtered : ns)[(Math.random() * (filtered.length ? filtered.length : ns.length)) | 0];
    return { x: pick[0], y: pick[1] };
  }

  _nextChaseCell(cur) {
    this._ensureField(this._lastPlayerCell);
    const ns = this.maze.neighbors(cur.x, cur.y);
    let best = cur, bestV = this._field[this.maze.idx(cur.x, cur.y)];
    for (const [x, y] of ns) {
      const v = this._field[this.maze.idx(x, y)];
      if (v >= 0 && v < bestV) { bestV = v; best = { x, y }; }
    }
    return best;
  }

  update(dt, playerPos, audio) {
    const cur = worldToCell(this.pos, this.maze.cols, this.maze.rows);
    const pc = worldToCell(playerPos, this.maze.cols, this.maze.rows);
    this._lastPlayerCell = pc;

    // line of sight (throttled)
    this.losTimer -= dt;
    if (this.losTimer <= 0) { this.losTimer = 0.2; this.canSee = this._hasLOS(playerPos); }

    const distToPlayer = Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z);

    if (this.canSee && distToPlayer < AGGRO_DIST) {
      this.mode = 'chase';
      this.seenTimer = LOSE_TIME;
    } else if (this.seenTimer > 0) {
      this.seenTimer -= dt;
      if (this.seenTimer <= 0) this.mode = 'wander';
    }

    // pick next sub-target when reached current
    const tWorld = cellToWorld(this.target.x, this.target.y);
    const tdx = tWorld.x - this.pos.x, tdz = tWorld.z - this.pos.z;
    if (Math.hypot(tdx, tdz) < 0.35) {
      this._prev = { ...cur };
      this.target = this.mode === 'chase' ? this._nextChaseCell(cur) : this._nextWanderCell(cur);
    }

    // move toward target
    const speed = this.mode === 'chase' ? CHASE_SPEED : WANDER_SPEED;
    const t2 = cellToWorld(this.target.x, this.target.y);
    let mvx = t2.x - this.pos.x, mvz = t2.z - this.pos.z;
    const ml = Math.hypot(mvx, mvz) || 1;
    this.pos.x += (mvx / ml) * speed * dt;
    this.pos.z += (mvz / ml) * speed * dt;
    this.mesh.position.set(this.pos.x, Math.sin(performance.now() * 0.003) * 0.05, this.pos.z);
    // face travel direction
    this.mesh.rotation.y = Math.atan2(mvx, mvz);

    // visuals + audio by proximity
    const chasing = this.mode === 'chase';
    this.eyeMat.emissiveIntensity = chasing ? 5 : 2.2;
    this.glow.intensity = chasing ? 1.4 : 0;
    if (audio) {
      const dread = Math.max(0, 1 - distToPlayer / AGGRO_DIST) * (chasing ? 1 : 0.4);
      audio.setDread(this.canSee || chasing ? dread : dread * 0.3);
    }

    return { distToPlayer, caught: distToPlayer < CATCH_DIST, chasing };
  }
}
