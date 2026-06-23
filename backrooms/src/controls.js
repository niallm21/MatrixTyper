// Unified input: keyboard + pointer-lock (desktop) and virtual joystick +
// look-drag + sprint button (touch). Exposes a small state object the game
// loop reads each frame.

export class Controls {
  constructor(domElement) {
    this.dom = domElement;
    this.move = { x: 0, y: 0 };   // joystick / WASD vector (-1..1)
    this.look = { dx: 0, dy: 0 }; // accumulated look delta, consumed each frame
    this.sprint = false;
    this.enabled = false;
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    this.keys = {};
    this._initKeyboard();
    this._initMouse();
    if (this.isTouch) this._initTouch();
  }

  consumeLook() {
    const l = { dx: this.look.dx, dy: this.look.dy };
    this.look.dx = 0; this.look.dy = 0;
    return l;
  }

  // recompute WASD vector
  _updateKeyVec() {
    let x = 0, y = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) y += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) y -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) x += 1;
    const len = Math.hypot(x, y) || 1;
    if (!this.isTouch) { this.move.x = x / len; this.move.y = y / len; }
    this.sprint = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
  }

  _initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true; this._updateKeyVec();
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false; this._updateKeyVec();
    });
  }

  _initMouse() {
    this.dom.addEventListener('click', () => {
      if (this.enabled && !this.isTouch && document.pointerLockElement !== this.dom) {
        this.dom.requestPointerLock?.();
      }
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === this.dom) {
        this.look.dx += e.movementX;
        this.look.dy += e.movementY;
      }
    });
  }

  _initTouch() {
    const joy = document.getElementById('joy');
    const knob = joy.querySelector('i');
    const sprintBtn = document.getElementById('btnSprint');
    const radius = 56;
    let joyId = null, lookId = null, lastX = 0, lastY = 0;

    const setKnob = (dx, dy) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };

    joy.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (joyId !== null) return;
      joyId = e.changedTouches[0].identifier;
    }, { passive: false });

    const handleJoy = (t) => {
      const r = joy.getBoundingClientRect();
      let dx = t.clientX - (r.left + r.width / 2);
      let dy = t.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d > radius) { dx = dx / d * radius; dy = dy / d * radius; }
      setKnob(dx, dy);
      this.move.x = dx / radius;
      this.move.y = -dy / radius; // screen down -> backward
    };

    window.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) continue;
        if (t.target === sprintBtn) continue;
        // joystick zone? if started inside joy, handled above
        const jr = document.getElementById('joy').getBoundingClientRect();
        const inJoy = t.clientX >= jr.left && t.clientX <= jr.right && t.clientY >= jr.top && t.clientY <= jr.bottom;
        if (inJoy) continue;
        if (lookId === null) {
          lookId = t.identifier; lastX = t.clientX; lastY = t.clientY;
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { handleJoy(t); e.preventDefault(); }
        else if (t.identifier === lookId) {
          this.look.dx += (t.clientX - lastX) * 1.4;
          this.look.dy += (t.clientY - lastY) * 1.4;
          lastX = t.clientX; lastY = t.clientY;
          e.preventDefault();
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyId = null; this.move.x = 0; this.move.y = 0; setKnob(0, 0); }
        else if (t.identifier === lookId) { lookId = null; }
      }
    };
    window.addEventListener('touchend', endTouch);
    window.addEventListener('touchcancel', endTouch);

    const sprintOn = (e) => { e.preventDefault(); this.sprint = true; };
    const sprintOff = (e) => { e.preventDefault(); this.sprint = false; };
    sprintBtn.addEventListener('touchstart', sprintOn, { passive: false });
    sprintBtn.addEventListener('touchend', sprintOff, { passive: false });
    sprintBtn.addEventListener('touchcancel', sprintOff, { passive: false });
  }
}
