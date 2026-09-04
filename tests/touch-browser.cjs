// Optional real-browser checks. Requires Playwright (not a production dependency).
// PLAYWRIGHT_MODULE can point to a preinstalled playwright-core package.
// BROWSER_EXECUTABLE can point to an installed Chrome / Edge executable.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm' };
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404).end(); return;
  }
  response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(response);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    assert.equal(await page.locator('[data-game-key=z]').isDisabled(), true);
    const game = page.frames().find(frame => frame.url().endsWith('/game/index.html'));
    await game.locator('#tic80-play').tap();
    await game.waitForFunction(() => window.godelbowInput.state === 'ready');
    await page.locator('[data-game-key=z]').tap();
    await page.waitForTimeout(100);
    await game.evaluate(() => {
      window.inputLog = [];
      for (const type of ['keydown', 'keyup']) {
        document.getElementById('canvas').addEventListener(type, event => window.inputLog.push([type, event.code]));
      }
    });
    const cdp = await context.newCDPSession(page);
    const point = async (key, id) => {
      const box = await page.locator(`[data-game-key=${key}]`).boundingBox();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, id };
    };
    const touch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
    const right = await point('right', 1), up = await point('up', 1);
    const x = await point('x', 2), z = await point('z', 3);
    await touch('touchStart', [right, x, z]);
    await page.waitForTimeout(60);
    // CDP touchEnd identifies the contacts being released, not those remaining.
    await touch('touchEnd', [z]);
    assert.deepEqual(await page.locator('.is-pressed').evaluateAll(es => es.map(e => e.dataset.gameKey).sort()), ['right', 'x']);
    await touch('touchMove', [up, x]);
    await page.waitForTimeout(60);
    await touch('touchEnd', [x]);
    assert.deepEqual(await page.locator('.is-pressed').evaluateAll(es => es.map(e => e.dataset.gameKey)), ['up']);
    await touch('touchEnd', []);
    assert.deepEqual(await game.evaluate(() => window.inputLog), [
      ['keydown', 'ArrowRight'], ['keydown', 'KeyX'], ['keydown', 'KeyZ'], ['keyup', 'KeyZ'],
      ['keyup', 'ArrowRight'], ['keydown', 'ArrowUp'], ['keyup', 'KeyX'], ['keyup', 'ArrowUp'],
    ]);

    // Center and off-pad movement must release direction while retaining X.
    await touch('touchStart', [right, x]);
    await page.waitForTimeout(40);
    const pad = await page.locator('#touch-dpad').boundingBox();
    await touch('touchMove', [{ x: pad.x + pad.width / 2, y: pad.y + pad.height / 2, id: 1 }, x]);
    assert.deepEqual(await page.locator('.is-pressed').evaluateAll(es => es.map(e => e.dataset.gameKey)), ['x']);
    await touch('touchMove', [right, x]);
    await touch('touchCancel', []);
    assert.equal(await page.locator('.is-pressed').count(), 0);

    async function checkLayout(fullscreen, expectFullWidth = false) {
      const layout = await page.evaluate(() => {
        const frame = document.getElementById('game-frame').getBoundingClientRect();
        const rect = selector => document.querySelector(selector).getBoundingClientRect().toJSON();
        return {
          ratio: frame.width / frame.height,
          overflow: document.documentElement.scrollWidth > innerWidth,
          x: rect('[data-game-key=x]'), z: rect('[data-game-key=z]'),
          s: rect('[data-game-key=s]'), a: rect('[data-game-key=a]'),
          pad: rect('.touch-controls__pad'), system: rect('.touch-system'),
          controller: rect('#touch-controls'), frame: frame.toJSON(), width: innerWidth, height: innerHeight,
          buttonsFit: [...document.querySelectorAll('[data-game-key]')].every(button => {
            const box = button.getBoundingClientRect();
            return box.width >= 44 && box.height >= 44 && box.left >= 0 && box.right <= innerWidth;
          }),
        };
      });
      assert.ok(Math.abs(layout.ratio - 240 / 136) < 0.001);
      assert.equal(layout.overflow, false); assert.equal(layout.buttonsFit, true);
      const { x, z, s, a, pad, system } = layout;
      assert.ok(x.x < z.x && x.y > z.y, 'X is below and left of Z');
      assert.ok(Math.abs(x.width - x.height) < 0.1 && Math.abs(x.width - z.width) < 0.1);
      assert.ok(x.width >= 56 && x.width <= 76, 'equal circular action keys stay within size limits');
      const dx = z.x - x.x, dy = x.y - z.y;
      assert.ok(Math.abs(Math.atan2(dy, dx) * 180 / Math.PI - 30) < 0.1);
      assert.ok(Math.hypot(dx, dy) - x.width >= 12, 'at least 12px between circular edges');
      assert.ok(s.x < a.x && a.left - s.right >= 15.9);
      assert.ok(s.width >= 56 && a.width >= 56 && s.height >= 44 && a.height >= 44);
      assert.ok(system.top - pad.bottom >= 11.9, 'auxiliary row is below the main controls');
      assert.ok(Math.abs((s.left + a.right) / 2 - (pad.left + pad.width / 2)) < 1, 'auxiliary keys are centered');
      if (fullscreen) {
        assert.ok(layout.frame.top >= 0 && layout.frame.bottom <= layout.controller.top);
        assert.ok(layout.controller.top >= 0 && layout.controller.bottom <= layout.height);
        assert.equal(await game.evaluate(() => document.documentElement.classList.contains('handheld-mode')), true);
        const canvasScale = await game.evaluate(() => {
          const transform = getComputedStyle(document.getElementById('canvas')).transform;
          return { scale: new DOMMatrix(transform).a, expected: innerWidth / 240 };
        });
        assert.ok(Math.abs(canvasScale.scale - canvasScale.expected) < 0.001, '240px game area is scaled to iframe width');
        if (expectFullWidth) assert.ok(layout.frame.width / layout.width > 0.99, 'game frame fills the viewport width');
        for (const [x, y] of [[1, 1], [layout.width - 2, 1], [1, layout.height - 2], [layout.width - 2, layout.height - 2]]) {
          assert.equal(await page.evaluate(([x, y]) => document.getElementById('game-stage').contains(document.elementFromPoint(x, y)), [x, y]), true);
        }
      }
    }
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await checkLayout(false);
      await page.locator('#fullscreen-game').tap();
      assert.equal(await page.evaluate(() => document.fullscreenElement?.id), 'game-stage');
      assert.equal(await page.locator('#touch-exit').isVisible(), true);
      await checkLayout(true, true);
      await page.setViewportSize({ width, height: 568 });
      await checkLayout(true, width === 320);
      await page.locator('#touch-exit').tap();
    }

    // Auxiliary keys moved out of the main pad but still use the same input handlers.
    await page.setViewportSize({ width: 390, height: 844 });
    await game.evaluate(() => { window.inputLog = []; });
    for (const key of ['s', 'a']) {
      await page.locator(`[data-game-key=${key}]`).tap();
      await page.waitForTimeout(60);
    }
    assert.deepEqual(await game.evaluate(() => window.inputLog), [
      ['keydown', 'KeyS'], ['keyup', 'KeyS'], ['keydown', 'KeyA'], ['keyup', 'KeyA'],
    ]);

    await page.locator('#game-stage').scrollIntoViewIfNeeded();
    await touch('touchStart', [await point('right', 1)]);
    await page.setViewportSize({ width: 844, height: 390 });
    await touch('touchEnd', []);
    assert.equal(await page.locator('#touch-controls').isVisible(), false);
    assert.equal(await page.locator('.is-pressed').count(), 0);
    assert.equal(await game.evaluate(() => document.documentElement.classList.contains('handheld-mode')), false);
    await page.setViewportSize({ width: 390, height: 844 });
    await game.goto(url + 'game/index.html');
    assert.equal(await page.locator('[data-game-key=z]').isDisabled(), true);
    assert.deepEqual(errors, []);

    // Browsers that reject native fullscreen receive the same reversible shell.
    const fallback = await context.newPage();
    await fallback.addInitScript(() => {
      Element.prototype.requestFullscreen = () => Promise.reject(new Error('blocked'));
    });
    await fallback.goto(url);
    await fallback.locator('#fullscreen-game').tap();
    assert.equal(await fallback.locator('#game-stage').evaluate(element => element.classList.contains('is-handheld')), true);
    assert.equal(await fallback.evaluate(() => document.documentElement.classList.contains('handheld-open')), true);
    assert.equal(await fallback.frameLocator('#game-frame').locator('html').evaluate(element => element.classList.contains('handheld-mode')), true);
    assert.deepEqual(await fallback.locator('#game-stage').evaluate(element => {
      const box = element.getBoundingClientRect(); return [box.left, box.top, box.right, box.bottom, innerWidth, innerHeight];
    }), [0, 0, 390, 844, 390, 844]);
    await fallback.locator('#touch-exit').tap();
    assert.equal(await fallback.locator('#game-stage').evaluate(element => element.classList.contains('is-handheld')), false);
    assert.equal(await fallback.evaluate(() => document.documentElement.classList.contains('handheld-open')), false);
    assert.equal(await fallback.frameLocator('#game-frame').locator('html').evaluate(element => element.classList.contains('handheld-mode')), false);
    await fallback.locator('#fullscreen-game').tap();
    await fallback.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
    await fallback.waitForFunction(() => !document.getElementById('game-stage').classList.contains('is-handheld'));
    await fallback.locator('#fullscreen-game').tap();
    await fallback.locator('#game-frame').evaluate(frame => { frame.src = frame.src; });
    await fallback.waitForFunction(() => !document.getElementById('game-stage').classList.contains('is-handheld'));
    await fallback.locator('#fullscreen-game').tap();
    await fallback.setViewportSize({ width: 844, height: 390 });
    await fallback.waitForFunction(() => !document.getElementById('game-stage').classList.contains('is-handheld'));
    await fallback.close();

    const failure = await context.newPage();
    await failure.route('**/tic80.js', route => route.abort());
    await failure.goto(url);
    await failure.frameLocator('#game-frame').locator('#tic80-play').tap();
    await failure.waitForFunction(() => document.getElementById('touch-status').textContent.includes('could not load'));
    assert.equal(await failure.locator('[data-game-key=x]').isDisabled(), true);

    const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const desktopPage = await desktop.newPage();
    await desktopPage.goto(url);
    assert.equal(await desktopPage.locator('#touch-controls').isVisible(), false);
    console.log('PASS: startup, multi-touch, slide, cancel, layouts, cropped fullscreen, fallback, rotation, reload, load failure, desktop.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
