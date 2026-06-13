// Unified input: on-screen joystick + buttons for touch, WASD/keys for desktop.
// Exposes a small state object the game polls every frame.

export const input = {
  // movement vector, components in [-1, 1]. y is "forward" (+1 = up on screen).
  moveX: 0,
  moveY: 0,
  // edge-triggered action (enter/exit). Read with consumeAction().
  _actionQueued: false,
  // held buttons
  brake: false,
  // edge-triggered camera toggle
  _cameraQueued: false,
};

export function consumeAction() {
  if (input._actionQueued) {
    input._actionQueued = false;
    return true;
  }
  return false;
}

export function consumeCamera() {
  if (input._cameraQueued) {
    input._cameraQueued = false;
    return true;
  }
  return false;
}

export function setupInput() {
  setupJoystick();
  setupButtons();
  setupKeyboard();
}

function setupJoystick() {
  const zone = document.getElementById('joystick');
  const base = document.getElementById('joystick-base');
  const knob = document.getElementById('joystick-knob');
  const maxR = 52;
  let activeId = null;
  let cx = 0;
  let cy = 0;

  function start(e) {
    const t = e.changedTouches ? e.changedTouches[0] : e;
    activeId = e.changedTouches ? t.identifier : 'mouse';
    // Re-center the joystick base under the first touch for comfort.
    const rect = zone.getBoundingClientRect();
    cx = t.clientX;
    cy = t.clientY;
    base.style.left = `${cx - rect.left - 65}px`;
    base.style.bottom = `${rect.bottom - cy - 65}px`;
    move(e);
  }

  function move(e) {
    let t = null;
    if (e.changedTouches) {
      for (const touch of e.changedTouches) {
        if (touch.identifier === activeId) t = touch;
      }
      if (!t) return;
    } else {
      if (activeId !== 'mouse') return;
      t = e;
    }
    let dx = t.clientX - cx;
    let dy = t.clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(len, maxR);
    dx = (dx / len) * clamped;
    dy = (dy / len) * clamped;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.moveX = dx / maxR;
    input.moveY = -dy / maxR; // screen down is +, invert to forward
  }

  function end(e) {
    if (e.changedTouches) {
      let found = false;
      for (const touch of e.changedTouches) {
        if (touch.identifier === activeId) found = true;
      }
      if (!found) return;
    }
    activeId = null;
    input.moveX = 0;
    input.moveY = 0;
    knob.style.transform = 'translate(0,0)';
  }

  zone.addEventListener('touchstart', (e) => { e.preventDefault(); start(e); }, { passive: false });
  zone.addEventListener('touchmove', (e) => { e.preventDefault(); move(e); }, { passive: false });
  zone.addEventListener('touchend', (e) => { e.preventDefault(); end(e); }, { passive: false });
  zone.addEventListener('touchcancel', (e) => { e.preventDefault(); end(e); }, { passive: false });

  // Mouse fallback for desktop testing.
  zone.addEventListener('mousedown', (e) => { e.preventDefault(); start(e); });
  window.addEventListener('mousemove', (e) => { if (activeId === 'mouse') move(e); });
  window.addEventListener('mouseup', () => { if (activeId === 'mouse') { activeId = null; input.moveX = 0; input.moveY = 0; knob.style.transform = 'translate(0,0)'; } });
}

function setupButtons() {
  document.querySelectorAll('#buttons .btn').forEach((btn) => {
    const kind = btn.dataset.btn;
    const press = (e) => {
      e.preventDefault();
      if (kind === 'brake') input.brake = true;
      else if (kind === 'action') input._actionQueued = true;
      else if (kind === 'camera') input._cameraQueued = true;
    };
    const release = (e) => {
      e.preventDefault();
      if (kind === 'brake') input.brake = false;
    };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });
}

function setupKeyboard() {
  const keys = new Set();
  const recompute = () => {
    let x = 0;
    let y = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    const len = Math.hypot(x, y) || 1;
    input.moveX = x / len;
    input.moveY = y / len;
  };

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyF') input._actionQueued = true;
    if (e.code === 'KeyC') input._cameraQueued = true;
    if (e.code === 'Space') input.brake = true;
    keys.add(e.code);
    recompute();
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') input.brake = false;
    keys.delete(e.code);
    recompute();
  });
  window.addEventListener('blur', () => { keys.clear(); recompute(); input.brake = false; });
}
