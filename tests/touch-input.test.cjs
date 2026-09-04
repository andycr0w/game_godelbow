const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { TouchInputState } = require('../touch-controls.js');

function controller() {
  const events = [];
  let held;
  const input = new TouchInputState((...event) => events.push(event), value => { held = value; });
  return { input, events, get held() { return [...held]; } };
}

test('moving, jumping and aiming can be held and released independently', () => {
  const { input, events } = controller();
  input.set(1, 'right'); input.set(2, 'z'); input.set(3, 'x');
  input.set(2, null); input.set(1, 'up'); input.set(3, null);
  assert.deepEqual(events, [
    ['right', true], ['z', true], ['x', true], ['z', false],
    ['right', false], ['up', true], ['x', false],
  ]);
});

test('sliding through the center or outside the dpad releases direction', () => {
  const { input, events } = controller();
  input.set(1, 'left'); input.set(1, null); input.set(1, 'right'); input.set(1, null);
  assert.deepEqual(events, [['left', true], ['left', false], ['right', true], ['right', false]]);
});

test('repeated pointer moves and multiple fingers on one key do not duplicate edges', () => {
  const { input, events } = controller();
  input.set(1, 'x'); input.set(1, 'x'); input.set(2, 'x');
  input.set(1, null); input.set(1, null);
  assert.deepEqual(events, [['x', true]]);
  input.set(2, null);
  assert.deepEqual(events, [['x', true], ['x', false]]);
});

test('interruption releases every held key once and clears visual state', () => {
  const c = controller();
  c.input.set(1, 'x'); c.input.set(2, 'right'); c.input.set(3, 'x');
  c.input.clear(); c.input.clear(); c.input.set(1, null);
  assert.deepEqual(c.events, [['x', true], ['right', true], ['x', false], ['right', false]]);
  assert.deepEqual(c.held, []);
});

function bridgeHarness() {
  const events = [];
  const window = new EventTarget();
  const document = new EventTarget();
  document.documentElement = { classList: { toggle(name, active) { this.name = name; this.active = active; } } };
  let time = 0;
  let serial = 0;
  const timers = new Map();
  document.getElementById = () => ({ dispatchEvent: event => events.push(event) });
  class KeyboardEvent extends Event {
    constructor(type, options) { super(type); Object.assign(this, { key: options.key, code: options.code, keyCode: options.keyCode }); }
  }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../game/input-bridge.js'), 'utf8'), {
    document, window, Event, KeyboardEvent,
    performance: { now: () => time },
    setTimeout: callback => { timers.set(++serial, callback); return serial; },
    clearTimeout: id => timers.delete(id),
  });
  return { bridge: window.godelbowInput, events, window, document,
    advance() { time += 40; const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); },
  };
}

test('bridge rejects input before ready and preserves down/up and TIC-80 key codes', () => {
  const { bridge, events, advance } = bridgeHarness();
  assert.equal(bridge.setKey('x', true), false);
  bridge.setState('loading'); assert.equal(bridge.setKey('z', true), false);
  bridge.setState('ready');
  for (const [key, code, keyCode] of [
    ['up', 'ArrowUp', 38], ['down', 'ArrowDown', 40], ['left', 'ArrowLeft', 37], ['right', 'ArrowRight', 39],
    ['z', 'KeyZ', 90], ['x', 'KeyX', 88], ['a', 'KeyA', 65], ['s', 'KeyS', 83],
  ]) {
    bridge.setKey(key, true); bridge.setKey(key, true); bridge.setKey(key, false);
    advance();
    assert.deepEqual(events.slice(-2).map(e => [e.type, e.code, e.keyCode]), [
      ['keydown', code, keyCode], ['keyup', code, keyCode],
    ]);
  }
  assert.equal(events.length, 16);
  assert.equal(bridge.setKey('constructor', true), false);
});

test('quick taps survive a game frame, normal holds release immediately, reset cancels pending releases', () => {
  const { bridge, events, advance } = bridgeHarness();
  bridge.setState('ready');
  bridge.setKey('z', true); bridge.setKey('z', false);
  assert.deepEqual(events.map(e => e.type), ['keydown']);
  advance();
  assert.deepEqual(events.map(e => e.type), ['keydown', 'keyup']);
  bridge.setKey('x', true); advance(); bridge.setKey('x', false);
  assert.equal(events.at(-1).type, 'keyup');
  bridge.setKey('z', true); bridge.setKey('z', false); bridge.reset(); advance();
  assert.deepEqual(events.slice(-2).map(e => e.type), ['keydown', 'keyup']);
});

test('bridge releases held buttons on blur, page hide, hidden document and runtime failure', () => {
  for (const interrupt of [
    h => h.window.dispatchEvent(new Event('blur')),
    h => h.window.dispatchEvent(new Event('pagehide')),
    h => { h.document.hidden = true; h.document.dispatchEvent(new Event('visibilitychange')); },
    h => h.bridge.setState('error'),
  ]) {
    const h = bridgeHarness();
    h.bridge.setState('ready'); h.bridge.setKey('x', true); h.bridge.setKey('left', true);
    interrupt(h);
    assert.deepEqual(h.events.map(e => [e.type, e.code]), [
      ['keydown', 'KeyX'], ['keydown', 'ArrowLeft'], ['keyup', 'KeyX'], ['keyup', 'ArrowLeft'],
    ]);
  }
});

test('bridge toggles iframe handheld presentation without changing input state', () => {
  const { bridge, document } = bridgeHarness();
  bridge.setState('ready');
  bridge.setHandheldMode(true);
  assert.equal(document.documentElement.classList.name, 'handheld-mode');
  assert.equal(document.documentElement.classList.active, true);
  assert.equal(bridge.state, 'ready');
  bridge.setHandheldMode(false);
  assert.equal(document.documentElement.classList.active, false);
});
