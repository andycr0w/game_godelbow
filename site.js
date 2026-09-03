(() => {
  "use strict";

  const gameFrame = document.getElementById("game-frame");
  const gameStage = document.getElementById("game-stage");
  const gameStatus = document.getElementById("game-status");
  const focusButton = document.getElementById("focus-game");
  const fullscreenButton = document.getElementById("fullscreen-game");
  const manualContent = document.getElementById("manual-content");

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderInline = (value) =>
    escapeHtml(value).replace(/`([^`]+)`/g, "<code>$1</code>");

  function renderMarkdown(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let quote = [];
    let code = [];
    let inCode = false;
    let inSection = false;

    const closeSection = () => {
      if (inSection) {
        html.push("</section>");
        inSection = false;
      }
    };

    const flushParagraph = () => {
      if (paragraph.length > 0) {
        html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
        paragraph = [];
      }
    };

    const flushQuote = () => {
      if (quote.length > 0) {
        html.push(`<blockquote><p>${renderInline(quote.join(" "))}</p></blockquote>`);
        quote = [];
      }
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        flushParagraph();
        flushQuote();

        if (inCode) {
          html.push(`<pre tabindex="0"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
          code = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        code.push(line);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushQuote();
        const level = heading[1].length;
        if (level <= 2) closeSection();
        if (level === 2) {
          html.push('<section class="manual-section">');
          inSection = true;
        }
        html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      if (line.startsWith(">")) {
        flushParagraph();
        quote.push(line.replace(/^>\s?/, ""));
        continue;
      }

      if (line.trim() === "") {
        flushParagraph();
        flushQuote();
        continue;
      }

      flushQuote();
      paragraph.push(line.trim());
    }

    if (inCode) {
      html.push(`<pre tabindex="0"><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    }
    flushParagraph();
    flushQuote();
    closeSection();

    return html.join("\n");
  }

  async function loadManual() {
    try {
      const response = await fetch("RETRO_MANUAL.md", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const markdown = await response.text();
      manualContent.innerHTML = renderMarkdown(markdown);
      manualContent.setAttribute("aria-busy", "false");
    } catch (error) {
      manualContent.setAttribute("aria-busy", "false");
      manualContent.innerHTML = `
        <p class="manual-state manual-state--error">
          Manual unavailable (${escapeHtml(error.message)}).
          <a href="RETRO_MANUAL.md">Read manual</a>
        </p>
      `;
    }
  }

  function focusGame() {
    gameFrame.contentWindow?.focus();
    let needsPlay = false;

    try {
      const frameDocument = gameFrame.contentDocument;
      const playButton = frameDocument?.getElementById("tic80-play");
      needsPlay = Boolean(playButton?.offsetParent);
      const target = needsPlay ? playButton : frameDocument?.getElementById("canvas");
      target?.focus();
    } catch (_error) {
      // The iframe still receives focus when hosted from another origin.
    }

    gameStatus.textContent = needsPlay ? "Ready — click play" : "Focused — press Z to start";
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await gameStage.requestFullscreen();
        focusGame();
      }
    } catch (_error) {
      gameStatus.textContent = "Fullscreen unavailable.";
    }
  }

  function updateFullscreenLabel() {
    const active = document.fullscreenElement === gameStage;
    fullscreenButton.textContent = active ? "Exit fullscreen" : "Fullscreen";
    fullscreenButton.setAttribute("aria-pressed", String(active));
  }

  gameFrame.addEventListener("load", () => {
    gameStatus.textContent = "Ready — click play";
  });
  focusButton.addEventListener("click", focusGame);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  document.addEventListener("fullscreenchange", updateFullscreenLabel);

  updateFullscreenLabel();
  loadManual();
})();
