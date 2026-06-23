// DOM HUD: objective text, fuse counter, toasts, stamina bar, and a
// fog-of-war minimap drawn on a small canvas.

export class HUD {
  constructor() {
    this.objective = document.getElementById('objective');
    this.fusesEl = document.getElementById('fuses');
    this.toastEl = document.getElementById('toast');
    this.staminaEl = document.querySelector('#stamina > i');
    this.flashEl = document.getElementById('flash');
    this.map = document.getElementById('minimap');
    this.mctx = this.map.getContext('2d');
    this._toastT = 0;
  }

  setObjective(html) { this.objective.innerHTML = html; }

  setFuses(c, total) {
    let s = '';
    for (let i = 0; i < total; i++) s += i < c ? '◆ ' : '◇ ';
    this.fusesEl.innerHTML = `FUSES &nbsp; ${s.trim()} &nbsp; ${c}/${total}`;
  }

  toast(msg, ms = 2600) {
    this.toastEl.textContent = msg;
    this.toastEl.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this.toastEl.style.opacity = '0'; }, ms);
  }

  setStamina(v) { this.staminaEl.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`; }

  flash() {
    this.flashEl.style.opacity = '1';
    setTimeout(() => { this.flashEl.style.opacity = '0'; }, 70);
  }

  drawMinimap(world, pCell, eCell, visited, showEntity) {
    const ctx = this.mctx;
    const { cols, rows, maze } = world;
    const W = this.map.width, H = this.map.height;
    const s = Math.min(W / cols, H / rows);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    // explored cells
    ctx.fillStyle = 'rgba(217,200,122,0.30)';
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (visited[maze.idx(x, y)]) ctx.fillRect(x * s, y * s, s, s);
      }
    }
    // fuses (only show those revealed/explored)
    for (const f of world.fuses) {
      if (f.collected) continue;
      const fx = Math.round(f.pos.x / 6), fy = Math.round(f.pos.z / 6);
      if (visited[maze.idx(fx, fy)]) {
        ctx.fillStyle = '#44ffcc';
        ctx.fillRect(fx * s + s * 0.25, fy * s + s * 0.25, s * 0.5, s * 0.5);
      }
    }
    // exit
    const ex = Math.round(world.exit.pos.x / 6), ey = Math.round(world.exit.pos.z / 6);
    if (visited[maze.idx(ex, ey)]) {
      ctx.fillStyle = world.exit.unlocked ? '#33ff55' : '#ff3322';
      ctx.fillRect(ex * s, ey * s, s, s);
    }
    // entity (only when close)
    if (showEntity && eCell) {
      ctx.fillStyle = '#ff2200';
      ctx.beginPath();
      ctx.arc(eCell.x * s + s / 2, eCell.y * s + s / 2, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // player
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pCell.x * s + s / 2, pCell.y * s + s / 2, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  showScreen(id) {
    for (const sid of ['startScreen', 'winScreen', 'overScreen']) {
      document.getElementById(sid).classList.toggle('hidden', sid !== id);
    }
  }
  hideScreens() {
    for (const sid of ['startScreen', 'winScreen', 'overScreen']) {
      document.getElementById(sid).classList.add('hidden');
    }
  }
}
