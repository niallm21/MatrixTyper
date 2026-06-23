// Procedural maze generation tuned for a "backrooms" feel: a fully connected
// recursive-backtracker maze, then a large fraction of interior walls are
// knocked out to create open rooms, loops and sparse free-standing wall stubs.

export const N = 1, E = 2, S = 4, W = 8;
const DX = { [N]: 0, [E]: 1, [S]: 0, [W]: -1 };
const DY = { [N]: -1, [E]: 0, [S]: 1, [W]: 0 };
const OPP = { [N]: S, [E]: W, [S]: N, [W]: E };

export class Maze {
  constructor(cols, rows, seed = Math.random) {
    this.cols = cols;
    this.rows = rows;
    this.rand = typeof seed === 'function' ? seed : mulberry32(seed);
    // each cell stores which walls are still present (bitmask of N/E/S/W)
    this.cells = new Array(cols * rows).fill(N | E | S | W);
    this._generate();
  }

  idx(x, y) { return y * this.cols + x; }
  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.cols && y < this.rows; }

  // is there a wall on side `dir` of cell (x,y)?
  hasWall(x, y, dir) { return (this.cells[this.idx(x, y)] & dir) !== 0; }

  _removeWall(x, y, dir) {
    this.cells[this.idx(x, y)] &= ~dir;
    const nx = x + DX[dir], ny = y + DY[dir];
    if (this.inBounds(nx, ny)) this.cells[this.idx(nx, ny)] &= ~OPP[dir];
  }

  _generate() {
    const { cols, rows } = this;
    const visited = new Array(cols * rows).fill(false);
    const stack = [[0, 0]];
    visited[0] = true;
    const dirs = [N, E, S, W];

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      // gather unvisited neighbours
      const options = [];
      for (const d of dirs) {
        const nx = x + DX[d], ny = y + DY[d];
        if (this.inBounds(nx, ny) && !visited[this.idx(nx, ny)]) options.push(d);
      }
      if (options.length === 0) { stack.pop(); continue; }
      const d = options[(this.rand() * options.length) | 0];
      this._removeWall(x, y, d);
      const nx = x + DX[d], ny = y + DY[d];
      visited[this.idx(nx, ny)] = true;
      stack.push([nx, ny]);
    }

    // Open it up: knock out a large share of remaining interior walls so the
    // result reads as connected rooms rather than a tight corridor maze.
    const openness = 0.62;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // east wall
        if (x < cols - 1 && this.hasWall(x, y, E) && this.rand() < openness) this._removeWall(x, y, E);
        // south wall
        if (y < rows - 1 && this.hasWall(x, y, S) && this.rand() < openness) this._removeWall(x, y, S);
      }
    }
  }

  // BFS distance field from a cell, respecting open passages. Used to place
  // collectibles and the exit far from the spawn.
  distanceField(sx, sy) {
    const { cols, rows } = this;
    const dist = new Array(cols * rows).fill(-1);
    const q = [[sx, sy]];
    dist[this.idx(sx, sy)] = 0;
    let head = 0;
    const dirs = [N, E, S, W];
    while (head < q.length) {
      const [x, y] = q[head++];
      const d0 = dist[this.idx(x, y)];
      for (const d of dirs) {
        if (this.hasWall(x, y, d)) continue;
        const nx = x + DX[d], ny = y + DY[d];
        if (!this.inBounds(nx, ny)) continue;
        if (dist[this.idx(nx, ny)] === -1) {
          dist[this.idx(nx, ny)] = d0 + 1;
          q.push([nx, ny]);
        }
      }
    }
    return dist;
  }

  // open neighbours of a cell (for entity navigation)
  neighbors(x, y) {
    const out = [];
    for (const d of [N, E, S, W]) {
      if (this.hasWall(x, y, d)) continue;
      const nx = x + DX[d], ny = y + DY[d];
      if (this.inBounds(nx, ny)) out.push([nx, ny]);
    }
    return out;
  }
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export { DX, DY };
