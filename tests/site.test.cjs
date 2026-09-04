const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const html = read('index.html');
const markdown = read('RETRO_MANUAL.md');

async function harness({ source = markdown, failure, status = 200 } = {}) {
  const makeClassList = () => {
    const values = new Set();
    return {
      add: (...names) => names.forEach(name => values.add(name)),
      remove: (...names) => names.forEach(name => values.delete(name)),
      contains: name => values.has(name),
      toggle(name, force) { const next = force ?? !values.has(name); if (next) values.add(name); else values.delete(name); return next; },
    };
  };
  const elements = new Map([...html.matchAll(/id="([^"]+)"/g)].map((match) => [match[1], {
    attributes: {}, events: {}, classList: makeClassList(),
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.events[name] = callback; },
  }]));
  const document = {
    events: {}, fullscreenElement: null, documentElement: { classList: makeClassList() },
    getElementById(id) { assert.ok(elements.has(id), `Missing DOM id: ${id}`); return elements.get(id); },
    addEventListener(name, callback) { this.events[name] = callback; },
    async exitFullscreen() { this.fullscreenElement = null; this.events.fullscreenchange(); },
  };
  const stage = elements.get('game-stage');
  stage.requestFullscreen = async () => {
    document.fullscreenElement = stage;
    document.events.fullscreenchange();
  };
  const play = { offsetParent: {}, focus() { this.focused = true; } };
  const canvas = { focus() { this.focused = true; } };
  const frame = elements.get('game-frame');
  frame.contentWindow = {
    focus() { this.focused = true; },
    godelbowInput: { setHandheldMode(active) { this.handheld = active; } },
  };
  frame.contentDocument = { getElementById: (id) => id === 'tic80-play' ? play : canvas };
  new vm.Script(read('site.js')).runInNewContext({
    document,
    fetch: async (url) => {
      assert.equal(url, 'RETRO_MANUAL.md');
      if (failure) throw new Error(failure);
      return { ok: status === 200, status, text: async () => source };
    },
  });
  await new Promise(setImmediate);
  return { elements, document, stage, frame, play, canvas };
}

test('minimal copy keeps practical controls and decorative containers', () => {
  assert.match(html, /<title>GODELBOW<\/title>/);
  assert.equal((html.match(/Retro game manual/g) || []).length, 1);
  assert.doesNotMatch(html + markdown, /Player field document|Revision 24|Everything the court refuses|Player-facing copy|GODELBOW — Retro Game Manual/);
  assert.doesNotMatch(html, /score-strip__room|TIC-80 CARTRIDGE/);
  assert.match(html, /<h2 id="game-heading">The ball is the weapon<\/h2>/);
  assert.match(html, /<p class="hero__line">\s*Get the ball\.<br>\s*Control the flight\.<br>\s*Break the room\.\s*<\/p>/);
  for (const text of ['Move / aim', 'Jump / start', 'Action', 'Rooms', 'Hitboxes', 'Focus game', 'Fullscreen']) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /Click the play icon, then press <kbd>Z<\/kbd> to enter Level 1\./);
  for (const name of ['hero__line', 'score-strip', 'paper-tear', 'manual__header']) {
    assert.ok(html.includes(name), name);
  }
  for (const reference of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
    for (const id of reference[1].split(' ')) assert.ok(html.includes(`id="${id}"`));
  }
});

test('manual has three intact code cards in the requested order', async () => {
  assert.deepEqual([...markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1]), ['Pocket reference', 'SIDE A', 'SIDE B']);
  assert.doesNotMatch(markdown, /^# /m);
  const { elements } = await harness();
  const content = elements.get('manual-content');
  assert.equal(content.attributes['aria-busy'], 'false');
  assert.equal((content.innerHTML.match(/<pre /g) || []).length, 3);
  assert.match(content.innerHTML, /&lt;- -&gt;/);
  const groups = [...content.innerHTML.matchAll(/<section class="manual-section">\s*<h2>([^<]+)<\/h2>\s*<pre tabindex="0"><code>([\s\S]*?)<\/code><\/pre>\s*<\/section>/g)];
  assert.deepEqual(groups.map((group) => group[1]), ['Pocket reference', 'SIDE A', 'SIDE B']);
  const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const cards = [...markdown.replace(/\r\n?/g, '\n').matchAll(/```text\n([\s\S]*?)\n```/g)];
  assert.deepEqual(groups.map((group) => group[2]), cards.map((card) => escape(card[1])));
});

test('manual groups close at the next section, top-level heading, and end of input', async () => {
  const { elements } = await harness({ source: '# Intro\n\n## First\n\nParagraph.\n\n### Detail\n\n> Quote\n\n## Second\n\n```text\nCard\n```\n\n# Appendix\n\nOutside.' });
  const rendered = elements.get('manual-content').innerHTML;
  assert.equal((rendered.match(/<section /g) || []).length, 2);
  assert.equal((rendered.match(/<\/section>/g) || []).length, 2);
  assert.match(rendered, /<h3>Detail<\/h3>\s*<blockquote><p>Quote<\/p><\/blockquote>\s*<\/section>\s*<section/);
  assert.match(rendered, /<\/pre>\s*<\/section>\s*<h1>Appendix<\/h1>\s*<p>Outside\.<\/p>$/);
});

test('footer retains the credit and links to the TIC-80 game page', () => {
  assert.match(html, /<footer>\s*<div class="page-width"><a href="https:\/\/tic80\.com\/play\?cart=4812">GODELBOW<\/a> \/\/ Built with TIC-80<\/div>\s*<\/footer>/);
});

test('Markdown escapes HTML and handles an unclosed code fence', async () => {
  const { elements } = await harness({ source: '## Example\n\n```text\n<script>alert(1)</script>' });
  const rendered = elements.get('manual-content').innerHTML;
  assert.match(rendered, /&lt;script&gt;/);
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /<\/code><\/pre>/);
  assert.match(rendered, /<\/code><\/pre>\s*<\/section>$/);
});

test('network and HTTP failures leave a usable manual link', async () => {
  for (const options of [{ failure: 'network failure' }, { status: 404 }]) {
    const { elements } = await harness(options);
    const content = elements.get('manual-content');
    assert.equal(content.attributes['aria-busy'], 'false');
    assert.match(content.innerHTML, /Manual unavailable/);
    assert.match(content.innerHTML, /href="RETRO_MANUAL.md"/);
  }
});

test('game focus targets play before start and canvas afterwards', async () => {
  const { elements, frame, play, canvas } = await harness();
  frame.events.load();
  assert.equal(elements.get('game-status').textContent, 'Ready — click play');
  elements.get('focus-game').events.click();
  assert.equal(play.focused, true);
  assert.equal(canvas.focused, undefined);
  play.offsetParent = null;
  elements.get('focus-game').events.click();
  assert.equal(canvas.focused, true);
  assert.equal(elements.get('game-status').textContent, 'Focused — press Z to start');
  Object.defineProperty(frame, 'contentDocument', { get() { throw new Error('cross-origin'); } });
  assert.doesNotThrow(() => elements.get('focus-game').events.click());
});

test('fullscreen entry, exit and rejection retain working status feedback', async () => {
  const { elements, document, stage, play } = await harness();
  const button = elements.get('fullscreen-game');
  await button.events.click();
  assert.equal(document.fullscreenElement, stage);
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(button.textContent, 'Exit fullscreen');
  assert.equal(play.focused, true);
  await button.events.click();
  assert.equal(document.fullscreenElement, null);
  assert.equal(button.attributes['aria-pressed'], 'false');
  assert.equal(button.textContent, 'Fullscreen');
  stage.requestFullscreen = async () => { throw new Error('denied'); };
  await button.events.click();
  assert.equal(elements.get('game-status').textContent, 'Fullscreen unavailable.');
});

test('portrait touch falls back to a reversible in-page handheld when native fullscreen fails', async () => {
  const { elements, document, stage, frame } = await harness();
  document.documentElement.classList.add('touch-portrait');
  stage.requestFullscreen = async () => { throw new Error('denied'); };
  await elements.get('fullscreen-game').events.click();
  assert.equal(stage.classList.contains('is-handheld'), true);
  assert.equal(document.documentElement.classList.contains('handheld-open'), true);
  assert.equal(frame.contentWindow.godelbowInput.handheld, true);
  assert.equal(elements.get('fullscreen-game').attributes['aria-pressed'], 'true');
  await elements.get('fullscreen-game').events.click();
  assert.equal(stage.classList.contains('is-handheld'), false);
  assert.equal(document.documentElement.classList.contains('handheld-open'), false);
  assert.equal(frame.contentWindow.godelbowInput.handheld, false);
});

test('download points to the original Windows executable', () => {
  assert.match(html, /class="utility-button utility-button--download" href="downloads\/godelbow\.exe"/);
  assert.match(read('site.css'), /\.utility-button--download\s*\{\s*border-color: var\(--orange\);\s*background: var\(--orange\);\s*color: var\(--night\);\s*\}/);
  assert.match(html, /href="downloads\/godelbow\.exe" download="godelbow\.exe"/);
  const executable = fs.readFileSync(path.join(root, 'downloads/godelbow.exe'));
  assert.equal(executable.subarray(0, 2).toString(), 'MZ');
  assert.equal(crypto.createHash('sha256').update(executable).digest('hex'),
    '6f0f07aff55556f99ef812cd1be1514dfc21b8c5e2779444238f1f49ea4f3ea3');
});
