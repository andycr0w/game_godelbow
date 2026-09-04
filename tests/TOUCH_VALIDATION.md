# Portrait touch controls

Run the existing site and input-state tests from the site directory:

```sh
node --test tests/*.test.cjs
```

The optional browser check uses Playwright and a local HTTP server that it starts
and closes itself. It does not require changes to the game runtime:

```sh
node tests/touch-browser.cjs
```

If Playwright is installed elsewhere, set `PLAYWRIGHT_MODULE` to its package
directory. To use an existing Chrome or Edge installation, set
`BROWSER_EXECUTABLE` to its executable path. No browser tooling is shipped to
players.

## Verified on 2026-09-04

- Node tests: input ownership, repeated events, independent multi-finger release,
  direction changes, resets, startup gating, all eight key mappings, quick taps,
  held-button release, and existing site behavior.
- Headless Edge / Chromium with mobile touch emulation: 320, 390 and 430px
  portrait layouts, no horizontal overflow, original canvas aspect ratio,
  minimum 44px touch targets, and visible fullscreen controls / exit.
- FC-style layout: X below-left of Z at 30 degrees, equally sized 56–76px
  circular action keys separated by at least 12px; S then A centered below the
  main controls with 16px between them and at least 12px above the auxiliary row.
  Fullscreen checked at all three widths, at both 844px and 568px heights.
- Relocated S / A controls still send the original keyboard down/up events.
- Native fullscreen applies the iframe `handheld-mode` transform at
  `iframe width / 240`, crops the integer-scaled TIC-80 frame, covers all four
  viewport corners, and uses the full width at 320x568, 390x844 and 430x844.
- Rejected Fullscreen API requests enter the fixed in-page handheld shell; its
  exit button, rotation to landscape, page hiding and iframe reload all restore
  the normal document. Rotation also removes iframe cropping in native fullscreen.
- Browser input: three fingers for direction + X + Z; releasing Z preserves
  direction and X; sliding from right to up preserves X; releasing X preserves up.
- Lifecycle: pointer cancellation, rotation to landscape, iframe reload, and
  runtime module loading failure; desktop controls remain hidden.
- Visual gameplay check: virtual Z enters gameplay, direction moves the player,
  and A / D-pad / Z opens, navigates and confirms room selection.

## Device checks still needed

No Android or iPhone was connected during implementation. On Android Chrome and
iOS Safari, verify audio unlock / resume, browser gestures and fullscreen support,
safe-area insets, and the feel of jumping, dunking and hold-to-aim / release-to-throw.
Browser input checks confirm the key transitions; they do not establish physical
device audio behavior or replace a gameplay session on those devices.
