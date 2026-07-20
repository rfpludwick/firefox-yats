# YATS

**Yet Another Tab System** — a Firefox extension with a Spotlight-style fuzzy finder
for switching between open tabs, restoring recently closed tabs, and opening pages
from browsing history.

You pronounce YATS like Yahtzee.

## What it does

When installed in Firefox, YATS adds a quick tab switcher you can open from the
toolbar or a keyboard shortcut. Type to fuzzy-search across your tabs and related
sources, then press Enter or click a result to go there.

### Features

- **Open tabs** — Search all open tabs across windows, including tab group names.
  Results are tagged with colored badges for the source window (when multiple
  windows are open) and tab group (using the group's actual color).
- **Closed tabs** — Optionally include recently closed tabs (session restore).
- **History** — Optionally search browsing history as you type.
- **Fuzzy matching** — Subsequence matching with scoring (consecutive characters,
  word boundaries, and cross-field matches like group + title).
- **Smart tab focus** — Optionally return to the previously active tab when you
  close the current one (MRU behavior).
- **Session hygiene** — The switcher popup is kept out of “reopen closed tab” history.

### How to use

| Action | Default shortcut |
| -------- | ------------------ |
| Open / close switcher | `Ctrl+Shift+Space` (macOS: `Control+Shift+Space`) |
| Navigate results | `↑` / `↓` |
| Activate selection | `Enter` or click |
| Close switcher | `Esc` |

You can also click the YATS toolbar icon. To change the shortcut, open
`about:addons`, use the gear menu, and choose **Manage Extension Shortcuts**.

### Settings

Open the gear button in the switcher footer to configure:

- Which sources to search (open tabs, closed tabs, history)
- Whether closing the active tab should focus the last-open tab

Settings are stored in `browser.storage.local` and persist across browser restarts.

## Installation (development)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Open `about:debugging` in Firefox.
3. Click **This Firefox** → **Load Temporary Add-on**.
4. Select the root `manifest.json` in this directory.

The root manifest loads `src/` as ES modules — no build step is required for
day-to-day development. Reload the temporary add-on after editing source files.

### Production build

Run `npm run build` to produce a minified package in `dist/`. The build rewrites
`dist/manifest.json` and the overlay script tag for bundled scripts. Load
`dist/manifest.json` to test the production bundle or package `dist/` as an
`.xpi`.

## Development

### Project layout

| Path | Purpose |
| ------ | --------- |
| `src/lib/` | Pure, testable modules (fuzzy search, scoring, URL helpers, validation, rendering) |
| `src/` | Browser entry points (`background.js`, `overlay.js`) that wire `src/lib/` to WebExtension APIs |
| `assets/` | Source HTML, CSS, and icons (unminified) |
| `dist/` | **Built extension package** — minified JS/CSS/HTML, copied icons, and `manifest.json` |
| `tests/` | Vitest unit tests |
| `scripts/build.mjs` | Production build pipeline |

### Commands

| Command | Description |
| --------- | ------------- |
| `npm run build` | Minify and assemble the full extension into `dist/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint over `src/`, `tests/`, and `scripts/` |
| `npm run lint:fix` | Auto-fix lint issues where possible |
| `npm run check` | Lint, test, and build (CI-friendly) |

### Build output

`npm run build` produces a self-contained `dist/` directory:

| Output | Source | Processing |
| -------- | -------- | ------------ |
| `dist/background.js` | `src/background.js` | esbuild bundle + minify |
| `dist/overlay.js` | `src/overlay.js` | esbuild bundle + minify |
| `dist/assets/css/overlay.css` | `assets/css/overlay.css` | clean-css minify |
| `dist/assets/html/*.html` | `assets/html/*.html` | html-minifier-terser |
| `dist/assets/icons/` | `assets/icons/` | copied as-is |
| `dist/manifest.json` | `manifest.json` | paths rewritten for bundled `background.js` / `overlay.js` |

### Test coverage

Unit tests cover the `src/lib/` modules: fuzzy matching, scoring/filtering, entry
builders, HTML rendering/escaping, URL validation, MRU logic, message validation,
activation messages, and settings UI helpers.
Browser API integration in `src/` is thin glue code; logic worth testing lives in
`src/lib/`.

## Permissions

| Permission | Why |
| ------------ | ----- |
| `tabs` | List open tabs and switch focus |
| `tabGroups` | Show tab group names in results |
| `sessions` | List/restore recently closed tabs; scrub switcher from session history |
| `history` | Search browsing history (when enabled) |
| `storage` | Persist user settings |

The extension does not use content scripts, host permissions, or network access.

## Architecture

YATS is a Manifest V2 WebExtension with two runtime contexts:

```text
┌────────────────────────────────────────────────────────────┐
│  dist/background.js (service worker–style, non-persistent) │
│  • Opens/closes popup window                               │
│  • Tab MRU tracking + “focus last open” on tab close       │
│  • Handles SWITCH_TAB / RESTORE_SESSION / OPEN_URL         │
│  • Scrubs overlay from session history                     │
└───────────────────────┬────────────────────────────────────┘
                        │ runtime.sendMessage
┌───────────────────────▼───────────────────────────────────┐
│  assets/html/overlay.html + dist/overlay.js (popup UI)    │
│  • Fuzzy search, render results, keyboard/mouse input     │
│  • Loads tab/session/history data via WebExtension APIs   │
└───────────────────────────────────────────────────────────┘
```

Shared logic lives in `src/lib/` and is bundled into the runtime scripts:

| File | Purpose |
| ------ | --------- |
| `src/lib/constants.js` | Popup dimensions, result caps, debounce/MRU limits |
| `src/lib/url-utils.js` | HTTP(S) URL validation, display formatting, dedup normalization |
| `src/lib/fuzzy.js` | Fuzzy matching and split-field scoring |
| `src/lib/scoring.js` | Entry scoring and `filterEntries()` |
| `src/lib/entries.js` | Tab/history entry builders and transforms |
| `src/lib/render.js` | HTML generation for result rows |
| `src/lib/validation.js` | Message and sender validation helpers |
| `src/lib/mru.js` | Tab MRU stack helpers |
| `src/background.js` | Background entry point (bundled to `dist/background.js`) |
| `src/overlay.js` | Overlay entry point (bundled to `dist/overlay.js`) |
| `assets/html/overlay.html` / `assets/css/overlay.css` | Switcher markup and styles |
| `assets/html/options.html` | Shortcut help page (`about:addons` options) |

### Opening the switcher

`dist/background.js` creates a centered popup window loading
`assets/html/overlay.html?opener=<activeTabId>`. The opener ID is used to mark the
current tab in the result list. Toggling the shortcut or toolbar icon while the
popup is open closes it, as does focusing a different Firefox window
(`windows.onFocusChanged`) — focus moving to another application does not.

### Search pipeline (`dist/overlay.js`)

1. **Load** — `loadAllData()` fetches open tabs, closed sessions, and (if
   applicable) history.
2. **Filter** — `filterEntries()` scores each entry with `scoreEntry()`, sorts by
   score, deduplicates by URL, and caps at 50 visible results.
3. **Render** — `renderResults()` rebuilds the result list HTML when the query or
   data changes.
4. **Selection** — `updateSelection()` updates highlight/ARIA/scroll on arrow keys
   and mouse hover without re-scoring.

Input is batched with `requestAnimationFrame`; history search is debounced (150
ms) with a cancellation token to ignore stale async results.

### Fuzzy scoring

`fuzzyScore()` performs subsequence matching with bonuses for consecutive hits and
word-boundary matches. `fuzzySplitScore()` allows queries like `Productivity Inbox`
to match a group name plus tab title. Kind boosts prefer open tabs over closed over
history.

### Background messaging

The overlay sends typed messages to the background:

| Type | Action |
| ------ | -------- |
| `SWITCH_TAB` | Activate tab and focus its window |
| `RESTORE_SESSION` | Restore closed tab or focus existing match |
| `OPEN_URL` | Focus existing tab or open URL in a new tab |
| `POPUP_CLOSED` | Clear popup state and scrub session history |

The background validates the sender (extension pages only), message shape, tab IDs,
and URL schemes before acting.

### Tab MRU (`dist/background.js`)

Per-window stacks track recently activated tabs (capped at 50). When
`focusLastOpenOnClose` is enabled and the active tab is closed, the background walks
the MRU stack to activate the next valid tab. A short activation window handles
the case where Firefox auto-selects a neighbor tab on close.

### Security

- **No content scripts** — Web pages cannot message or interact with the extension.
- **HTTP(S) only** — Navigation and result filtering use a shared `isHttpUrl()`
  allowlist.
- **Sender validation** — Background rejects messages not from this extension’s
  pages.
- **HTML escaping** — Titles, URLs, and favicon attributes are escaped before
  `innerHTML`; result row IDs are index-based (`result-0`), not derived from URLs.
- **Favicons** — Only `http:`/`https:` favicon URLs are loaded; failures fall back
  to a letter avatar.

### Performance

- Selection changes (arrows, mouse hover) avoid full re-filter and DOM rebuild.
- Keystroke rendering is coalesced per animation frame.
- Closed-tab recency uses a precomputed `Map` instead of repeated `findIndex` calls.
- URL display strings are cached on entry objects at load time.

## Browser compatibility

Built for Firefox (Manifest V2, `browser.*` APIs). Requires Firefox builds with
`tabGroups` support for group names in results; the extension degrades gracefully
if that API is unavailable.

## License

This project is licensed under the Mozilla Public License 2.0. See [LICENSE.md](LICENSE.md).
