import * as THREE from 'three';

// All textures are generated procedurally on a 2D canvas so the build has
// zero binary asset dependencies and works offline inside the WebView.

function makeCanvas(size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// value-noise helper -> draws soft mottled stains
function mottle(ctx, size, color, count, rmin, rmax, alpha) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = rmin + Math.random() * (rmax - rmin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${alpha})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function finalize(canvas, repeat, aniso) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.repeat.set(repeat, repeat);
  tex.anisotropy = aniso || 8;
  tex.needsUpdate = true;
  return tex;
}

// The iconic mono-yellow damp wallpaper.
export function wallpaperTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#bfa94a';
  ctx.fillRect(0, 0, size, size);

  // subtle vertical wallpaper stripes
  for (let x = 0; x < size; x += 16) {
    ctx.fillStyle = (x / 16) % 2 ? 'rgba(150,128,52,0.25)' : 'rgba(210,190,110,0.18)';
    ctx.fillRect(x, 0, 8, size);
  }
  // faint damask-ish dots pattern
  ctx.fillStyle = 'rgba(120,104,40,0.18)';
  for (let y = 0; y < size; y += 48) {
    for (let x = 0; x < size; x += 48) {
      const ox = (y / 48) % 2 ? 24 : 0;
      ctx.beginPath();
      ctx.arc(x + ox, y + 24, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // grime / water damage near bottom
  mottle(ctx, size, '80,64,24', 40, 20, 90, 0.10);
  mottle(ctx, size, '40,32,12', 18, 30, 120, 0.08);
  // a few dark water streaks
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = '#5a4a1c';
  for (let i = 0; i < 14; i++) {
    ctx.lineWidth = 1 + Math.random() * 3;
    const x = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + 10, size * 0.4, x - 14, size * 0.7, x + 4, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return finalize(c, 1, 8);
}

// Damp mustard carpet.
export function carpetTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#8f7c2e';
  ctx.fillRect(0, 0, size, size);
  // fine fiber noise
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 46;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.6));
  }
  ctx.putImageData(img, 0, 0);
  // damp dark patches & old stains
  mottle(ctx, size, '40,34,12', 26, 30, 110, 0.10);
  mottle(ctx, size, '20,18,8', 14, 40, 140, 0.10);
  return finalize(c, 1, 8);
}

// Drop ceiling tiles with the recessed grid.
export function ceilingTexture() {
  const size = 512;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#cfc7ac';
  ctx.fillRect(0, 0, size, size);
  // speckle (acoustic tile)
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 30;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // grid lines (one tile per texture, repeated by mesh)
  ctx.strokeStyle = 'rgba(60,56,44,0.8)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(90,84,66,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, size - 16, size - 16);
  // occasional water stain
  mottle(ctx, size, '120,100,40', 6, 30, 90, 0.10);
  return finalize(c, 1, 4);
}

// Bright fluorescent light panel (used emissive).
export function lightPanelTexture() {
  const size = 128;
  const c = makeCanvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fffdf2';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(180,176,150,0.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, size, size);
  // two tube highlights
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillRect(size * 0.28, 6, 8, size - 12);
  ctx.fillRect(size * 0.66, 6, 8, size - 12);
  return finalize(c, 1, 1);
}
