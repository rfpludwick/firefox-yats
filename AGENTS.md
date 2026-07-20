# YATS — agent instructions

YATS (Yet Another Tab System) is a Firefox Manifest V2 extension: a Spotlight-style
fuzzy tab switcher. See [README.md](README.md) for full architecture and usage.

## Layout

| Path | Role |
| ---- | ---- |
| `src/lib/` | Pure, testable logic (fuzzy search, scoring, validation, render) |
| `src/background.js`, `src/overlay.js` | Thin WebExtension glue — keep browser API wiring here |
| `assets/` | Source HTML, CSS, icons (do not edit minified output) |
| `dist/` | **Production build** — minified package; load `dist/manifest.json` to test the build |
| `manifest.json` | **Dev manifest** — load directly in Firefox (ES module background, unbundled `src/`) |
| `tests/` | Vitest unit tests for `src/lib/` |
| `scripts/build.mjs` | esbuild + minify pipeline |

## Commands

Run from this directory (`firefox/extensions/yats/`):

```bash
npm run check                     # lint + test + build (preferred before finishing work)
npm test                          # Vitest
npm run lint                      # ESLint
npm run build                     # write minified extension to dist/
npx markdownlint-cli2 "**/*.md"   # when Markdown files changed
```

After changing source, reload the add-on from `about:debugging`. For day-to-day
development, load the root `manifest.json` (no build required). Run `npm run build`
and load `dist/manifest.json` when testing the production bundle.

## Markdown

All `.md` files in this directory are checked with [markdownlint](https://github.com/DavidAnson/markdownlint)
via `.markdownlint-cli2.jsonc`. When you add or edit Markdown, run
`npx markdownlint-cli2 "**/*.md"` and fix any reported issues before finishing.

- **Line length (MD013)** — wrap prose to 80 characters; code fences and table rows
  are exempt.
- **Code fences (MD040)** — always specify a language (e.g. `bash`, `text`).
- **Tables (MD060)** — use spaced pipes (`| --- |`); `npx markdownlint-cli2 --fix`
  can auto-fix some table formatting.
- **LICENSE.md** — has `<!-- markdownlint-disable MD013 -->` at the top; do not
  reflow legal text.
- **CLAUDE.md** — keeps `<!-- markdownlint-disable MD041 -->` so `@AGENTS.md` can
  be the first meaningful line.

## Conventions

- **Minimize scope** — small, focused diffs; match existing style in nearby code.
- **Test logic in `src/lib/`** — extract or extend pure functions there; add Vitest
  tests when behavior changes.
- **Edit sources, not `dist/`** — `dist/` is generated; only `npm run build` writes
  it.
- **Security** — keep HTTP(S)-only URL checks (`isHttpUrl`), HTML escaping for
  `innerHTML`, extension-sender validation on background messages, and index-based
  DOM ids (not URL-derived).
- **Performance** — prefer `updateSelection()` over full re-render when only
  highlight changes; respect existing caps (e.g. 50 visible results, MRU depth).
- **Commits** — do not commit unless the user asks.
- **Markdown** — keep docs lint-clean; see [Markdown](#markdown) above.

## License

Mozilla Public License 2.0 — see [LICENSE.md](LICENSE.md).
