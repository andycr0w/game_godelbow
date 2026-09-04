(() => {
  "use strict";

  // Each pointer owns its key; releasing one finger must not release another.
  class TouchInputState {
    constructor(send, paint = () => {}) {
      this.send = send;
      this.paint = paint;
      this.pointers = new Map();
    }
    set(pointer, key) {
      const before = new Set(this.pointers.values());
      if (key) this.pointers.set(pointer, key);
      else this.pointers.delete(pointer);
      const after = new Set(this.pointers.values());
      for (const old of before) if (!after.has(old)) this.send(old, false);
      for (const next of after) if (!before.has(next)) this.send(next, true);
      this.paint(after);
    }
    clear() {
      for (const key of new Set(this.pointers.values())) this.send(key, false);
      this.pointers.clear();
      this.paint(new Set());
    }
  }
  if (typeof module !== "undefined") module.exports = { TouchInputState };
  if (typeof document === "undefined") return;

  const frame = document.getElementById("game-frame");
  const controls = document.getElementById("touch-controls");
  const dpad = document.getElementById("touch-dpad");
  const status = document.getElementById("touch-status");
  const keys = [...controls.querySelectorAll("[data-game-key]")];
  const portrait = window.matchMedia("(orientation: portrait)");
  const coarse = window.matchMedia("(any-pointer: coarse)");
  const contacts = new Map();
  let bridge = null;
  let frameWindow = null;
  let enabled = false;
  const input = new TouchInputState(
    (key, pressed) => bridge?.setKey(key, pressed),
    (held) => keys.forEach(button => {
      const pressed = held.has(button.dataset.gameKey);
      button.classList.toggle("is-pressed", pressed);
      button.setAttribute("aria-pressed", String(pressed));
    }),
  );

  function clear() {
    input.clear();
    const previous = [...contacts];
    contacts.clear();
    for (const [id, element] of previous) {
      if (element.hasPointerCapture(id)) element.releasePointerCapture(id);
    }
  }
  function reset() {
    clear();
    bridge?.reset();
  }
  function updateStatus() {
    const state = bridge?.state ?? "idle";
    for (const key of keys) key.disabled = !enabled || state !== "ready";
    const messages = {
      idle: "Tap play above, then tap Z to start.",
      loading: "Loading game…",
      ready: "Z: jump / start · X: action",
      error: "Game could not load. Reload the page to retry.",
    };
    status.textContent = messages[state];
    if (enabled) document.getElementById("game-status").textContent = messages[state];
  }
  function updateMode() {
    const next = portrait.matches && (navigator.maxTouchPoints > 0 || coarse.matches);
    if (next !== enabled) reset();
    enabled = next;
    controls.hidden = !enabled;
    document.documentElement.classList.toggle("touch-portrait", enabled);
    bridge?.setHandheldMode(
      enabled && (document.fullscreenElement === document.getElementById("game-stage") ||
        document.getElementById("game-stage").classList.contains("is-handheld")),
    );
    if (!enabled && document.documentElement.classList.contains("handheld-open")) {
      document.dispatchEvent(new Event("godelbow-exit-fullscreen"));
    }
    updateStatus();
  }
  function bindFrame() {
    reset();
    frameWindow?.removeEventListener("godelbow-input-state", updateStatus);
    frameWindow?.removeEventListener("godelbow-input-reset", clear);
    try {
      frameWindow = frame.contentWindow;
      bridge = frameWindow.godelbowInput;
      bridge?.setHandheldMode(
        enabled && (document.fullscreenElement === document.getElementById("game-stage") ||
          document.getElementById("game-stage").classList.contains("is-handheld")),
      );
      frameWindow.addEventListener("godelbow-input-state", updateStatus);
      frameWindow.addEventListener("godelbow-input-reset", clear);
    } catch (_error) {
      bridge = null;
      frameWindow = null;
    }
    updateStatus();
  }

  function directionAt(event) {
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const button = hit?.closest("[data-game-key]");
    return button && dpad.contains(button) ? button.dataset.gameKey : null;
  }
  function down(event) {
    if (!enabled || bridge?.state !== "ready" || event.button !== 0) return;
    const button = event.target.closest("[data-game-key]");
    if (!button) return;
    event.preventDefault();
    const target = dpad.contains(button) ? dpad : button;
    contacts.set(event.pointerId, target);
    target.setPointerCapture(event.pointerId);
    input.set(event.pointerId, button.dataset.gameKey);
  }
  function move(event) {
    if (contacts.get(event.pointerId) !== dpad) return;
    event.preventDefault();
    input.set(event.pointerId, directionAt(event));
  }
  function up(event) {
    const target = contacts.get(event.pointerId);
    if (!target) return;
    contacts.delete(event.pointerId);
    input.set(event.pointerId, null);
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }
  controls.addEventListener("pointerdown", down);
  controls.addEventListener("pointermove", move);
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    controls.addEventListener(name, up);
  }
  controls.addEventListener("contextmenu", event => event.preventDefault());
  // Let keyboard / assistive-technology users activate focused controls too.
  controls.addEventListener("keydown", event => {
    const button = event.target.closest("[data-game-key]");
    if (!button || button.disabled || ![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    input.set(`keyboard:${button.dataset.gameKey}:${event.key}`, button.dataset.gameKey);
  });
  controls.addEventListener("keyup", event => {
    const button = event.target.closest("[data-game-key]");
    if (!button || ![" ", "Enter"].includes(event.key)) return;
    event.preventDefault();
    input.set(`keyboard:${button.dataset.gameKey}:${event.key}`, null);
  });
  controls.addEventListener("focusout", event => {
    const button = event.target.closest("[data-game-key]");
    if (!button) return;
    for (const key of [" ", "Enter"]) input.set(`keyboard:${button.dataset.gameKey}:${key}`, null);
  });
  frame.addEventListener("load", () => {
    if (document.documentElement.classList.contains("handheld-open")) {
      document.dispatchEvent(new Event("godelbow-exit-fullscreen"));
    }
    bindFrame();
  });
  window.addEventListener("blur", reset);
  window.addEventListener("pagehide", () => {
    reset();
    if (document.documentElement.classList.contains("handheld-open")) {
      document.dispatchEvent(new Event("godelbow-exit-fullscreen"));
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) return;
    reset();
    if (document.documentElement.classList.contains("handheld-open")) {
      document.dispatchEvent(new Event("godelbow-exit-fullscreen"));
    }
  });
  document.addEventListener("fullscreenchange", reset);
  portrait.addEventListener("change", updateMode);
  coarse.addEventListener("change", updateMode);
  document.getElementById("focus-game").addEventListener("click", () => { if (enabled) updateStatus(); });
  document.getElementById("touch-exit").addEventListener("click", async () => {
    reset();
    document.dispatchEvent(new Event("godelbow-exit-fullscreen"));
  });
  bindFrame();
  updateMode();
})();
