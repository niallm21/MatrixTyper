// Fully procedural audio via WebAudio. No sample files -> nothing to bundle.
// Must be started from a user gesture (mobile autoplay policy).

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.started = false;
  }

  start() {
    if (this.started) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.started = true;

    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    // ---- ambient fluorescent hum: 60hz buzz + filtered noise bed ----
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.018;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 220;
    hum.connect(humFilter).connect(humGain).connect(this.master);
    hum.start();

    const noise = this._noiseSource();
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.012;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 600;
    noiseFilter.Q.value = 0.7;
    noise.connect(noiseFilter).connect(noiseGain).connect(this.master);
    noise.start();

    // ---- dread drone (entity proximity), kept silent until needed ----
    this.dread = ctx.createGain();
    this.dread.gain.value = 0;
    this.dread.connect(this.master);
    const d1 = ctx.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = 48;
    const d2 = ctx.createOscillator(); d2.type = 'sawtooth'; d2.frequency.value = 49.5;
    const dFilter = ctx.createBiquadFilter(); dFilter.type = 'lowpass'; dFilter.frequency.value = 320;
    d1.connect(dFilter); d2.connect(dFilter); dFilter.connect(this.dread);
    d1.start(); d2.start();

    this._stepT = 0;
  }

  _noiseSource() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  // entity proximity 0..1 -> swells the dread drone
  setDread(v) {
    if (!this.ctx) return;
    this.dread.gain.setTargetAtTime(Math.min(0.16, v * 0.16), this.ctx.currentTime, 0.2);
  }

  footstep(running) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const len = (ctx.sampleRate * 0.08) | 0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = running ? 380 : 260;
    const g = ctx.createGain(); g.gain.value = running ? 0.10 : 0.06;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  blip(freq = 880, dur = 0.12, type = 'sine', vol = 0.12) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(this.master);
    o.start(); o.stop(ctx.currentTime + dur);
  }

  pickup() {
    this.blip(660, 0.10, 'square', 0.10);
    setTimeout(() => this.blip(990, 0.16, 'square', 0.10), 90);
  }

  flickerBuzz() {
    if (!this.ctx) return;
    this.blip(120, 0.06, 'sawtooth', 0.05);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.3, 'triangle', 0.12), i * 140));
  }

  scare() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
    o.connect(g).connect(this.master);
    o.start(); o.stop(ctx.currentTime + 0.8);
  }
}
