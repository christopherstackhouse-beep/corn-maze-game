'use strict';

// Radians per CSS pixel. Tune touch aiming here without changing mouse sensitivity.
const MOBILE_INPUT_CONFIG = {lookSensitivity: 0.0035};

function createTouchControls({readState, turn, actions, pause}, config = MOBILE_INPUT_CONFIG) {
  const root = document.getElementById('touchControls');
  const prompt = document.getElementById('rotatePrompt');
  const stick = document.getElementById('touchJoystick');
  const knob = document.getElementById('touchKnob');
  const look = document.getElementById('touchLook');
  const sprintButton = document.getElementById('touchSprint');
  const pointers = new Map();
  let enabled = (navigator.maxTouchPoints || 0) > 0 && window.matchMedia('(pointer: coarse)').matches;
  let forward = 0, strafe = 0;
  const portrait = () => window.innerHeight > window.innerWidth;
  const sprint = () => [...pointers.values()].some(p => p.kind === 'sprint');

  function release(id) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id); // lostpointercapture may fire synchronously on release.
    if (p.kind === 'move') {
      forward = strafe = 0;
      knob.style.transform = 'translate(0px, 0px)';
    }
    p.node.setAttribute('aria-pressed', String(p.kind === 'sprint' && sprint()));
    if (p.node.hasPointerCapture?.(id)) p.node.releasePointerCapture(id);
  }

  function reset() {
    for (const id of [...pointers.keys()]) release(id);
    forward = strafe = 0;
  }

  function sync() {
    const state = readState();
    const active = enabled && state.playing && !state.finished && !state.cinematic && !state.menu && !state.leaderboard && !portrait();
    root.hidden = !active;
    prompt.hidden = !(enabled && portrait() && state.started && !state.finished && !state.menu && !state.leaderboard);
    document.documentElement.classList.toggle('touch-device', enabled);
    document.documentElement.classList.toggle('touch-gameplay', active);
    if (!active) reset();
    return active;
  }

  // Actual touch activates the overlay on hybrid devices too. A real mouse restores
  // desktop input; compatibility mouse events from touch never select desktop mode.
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'mouse') return;
    const next = event.pointerType === 'touch';
    if (next !== enabled) { reset(); enabled = next; if (enabled) document.exitPointerLock?.(); }
    if (enabled && portrait() && readState().playing) pause();
    sync();
  }, true);

  function moveStick(event) {
    const box = stick.getBoundingClientRect();
    const radius = box.width / 2;
    let x = (event.clientX - box.left - radius) / radius;
    let y = (event.clientY - box.top - box.height / 2) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    const magnitude = Math.min(1, length);
    const gain = magnitude <= 0.12 ? 0 : (magnitude - 0.12) / (0.88 * magnitude);
    strafe = x * gain;
    forward = -y * gain;
    knob.style.transform = `translate(${x * radius * 0.6}px, ${y * radius * 0.6}px)`;
  }

  function bind(node, kind, action) {
    node.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || !sync()) return;
      event.preventDefault(); event.stopPropagation();
      if (pointers.has(event.pointerId) || ((kind === 'move' || kind === 'look') && [...pointers.values()].some(p => p.kind === kind))) return;
      const p = {node, kind, x: event.clientX, y: event.clientY, lastX: event.clientX, moved: false};
      pointers.set(event.pointerId, p);
      node.setPointerCapture(event.pointerId);
      if (kind === 'move') moveStick(event);
      if (kind === 'sprint') node.setAttribute('aria-pressed', 'true');
    });
    node.addEventListener('pointermove', event => {
      if (!sync()) return;
      const p = pointers.get(event.pointerId);
      if (!p || p.node !== node) return;
      event.preventDefault(); event.stopPropagation();
      if (Math.hypot(event.clientX - p.x, event.clientY - p.y) > 14) p.moved = true;
      if (kind === 'move') moveStick(event);
      if (kind === 'look') { turn((event.clientX - p.lastX) * config.lookSensitivity); p.lastX = event.clientX; }
    });
    node.addEventListener('pointerup', event => {
      const active = sync(), p = pointers.get(event.pointerId);
      if (!p || p.node !== node) return;
      event.preventDefault(); event.stopPropagation();
      const box = node.getBoundingClientRect();
      const tapped = !p.moved && Math.hypot(event.clientX - p.x, event.clientY - p.y) <= 14 && event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
      release(event.pointerId);
      if (active && action && tapped) action();
      sync(); // An action may start a cinematic or pause immediately.
    });
    for (const type of ['pointercancel', 'lostpointercapture']) node.addEventListener(type, event => release(event.pointerId));
    // Suppress synthetic clicks/context menus only on this touch interface.
    node.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); });
    node.addEventListener('contextmenu', event => event.preventDefault());
  }

  bind(stick, 'move');
  bind(look, 'look');
  bind(sprintButton, 'sprint');
  for (const [id, action] of Object.entries(actions)) bind(document.getElementById(id), 'action', action);
  function orientationChanged() {
    reset();
    if (enabled && readState().playing) pause();
    sync();
  }
  // Resize also covers browsers without Screen Orientation API support.
  let wasPortrait = portrait();
  window.addEventListener('resize', () => {
    if (wasPortrait !== portrait()) { wasPortrait = portrait(); orientationChanged(); }
    else sync();
  });
  window.addEventListener('orientationchange', orientationChanged);
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  sync();
  return {get enabled() { return enabled; }, get forward() { return forward; }, get strafe() { return strafe; }, get sprint() { return sprint(); }, portrait, reset, sync};
}
