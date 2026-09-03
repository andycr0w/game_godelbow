(() => {
  "use strict";
  const canvas = document.getElementById("canvas");
  const keys = {
    up: ["ArrowUp", "ArrowUp", 38], down: ["ArrowDown", "ArrowDown", 40],
    left: ["ArrowLeft", "ArrowLeft", 37], right: ["ArrowRight", "ArrowRight", 39],
    z: ["z", "KeyZ", 90], x: ["x", "KeyX", 88],
    a: ["a", "KeyA", 65], s: ["s", "KeyS", 83],
  };
  const held = new Set();
  const pressedAt = new Map();
  const releases = new Map();
  let state = "idle";
  function notify(type) {
    window.dispatchEvent(new Event(type));
  }
  function dispatch(name, pressed) {
    if (pressed) {
      held.add(name);
      pressedAt.set(name, performance.now());
    } else {
      held.delete(name);
      pressedAt.delete(name);
    }
    const [key, code, keyCode] = keys[name];
    canvas.dispatchEvent(new KeyboardEvent(pressed ? "keydown" : "keyup", {
      key, code, keyCode, which: keyCode, bubbles: true, cancelable: true,
    }));
  }
  function setKey(name, pressed) {
    if (!Object.hasOwn(keys, name) || (pressed && state !== "ready")) return false;
    if (pressed && releases.has(name)) {
      clearTimeout(releases.get(name));
      releases.delete(name);
    }
    if (held.has(name) === pressed) return true;
    // TIC-80 polls buttons once per frame. Keep a very short tap visible for
    // two frames; ordinary holds still release immediately (including X aim).
    const remaining = 32 - (performance.now() - pressedAt.get(name));
    if (!pressed && remaining > 0) {
      if (!releases.has(name)) releases.set(name, setTimeout(() => {
        releases.delete(name);
        dispatch(name, false);
      }, remaining));
    } else dispatch(name, pressed);
    return true;
  }
  function reset() {
    for (const timer of releases.values()) clearTimeout(timer);
    releases.clear();
    for (const name of [...held]) dispatch(name, false);
    notify("godelbow-input-reset");
  }
  window.godelbowInput = {
    get state() { return state; },
    setState(next) {
      if (next !== "ready") reset();
      state = next;
      notify("godelbow-input-state");
    },
    setKey, reset,
  };
  window.addEventListener("blur", reset);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
})();
