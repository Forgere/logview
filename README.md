# HyperLog (`logview`)

A browser-based log viewer for large files: stream a log file from disk, search it, filter it by level, and bookmark the lines that matter.

Repository: <https://github.com/Forgere/logview>

## Features

- **Large-file streaming** — files are read in chunks on an idle callback, with live progress and follow/browse modes while the tail streams in.
- **Monaco-based viewer** — virtualized rendering with a custom `logview` language and log-level syntax highlighting; the editor theme is generated from the app's own design tokens.
- **Search** — plain text or regex, match case, whole word, match navigation, and a "matches only" view.
- **Level filtering** — per-level chips (Error / Warn / Info / Debug) with live counts, plus a `Clear` action to bring every level back.
- **Markers** — select text in the editor and mark it; the marker panel lists every bookmark with an inline note field, bulk selection, jump-to-line, copy and JSON export.
- **Watch mode** — monitor incoming lines for a pattern, either pausing the stream on a hit (`PAUSE_ALL`) or dropping a marker and continuing (`MARK_ONLY`).
- **Highlight rules** — user-defined regex/color rules, saved per file extension.
- **Dialogs** — go to line, keyboard shortcuts, view settings, highlight rules, watch settings, marker compare, a marker summary view, and a "What's New" release guide.
- **Preferences that stick** — search flags, view mode, watch mode, level filters and the marker panel layout are restored after a refresh.
- **Installable & offline** — add it to your dock or home screen; after one online visit the app shell and editor are cached for offline use.
- **Never uploads** — your log file is read from your local disk through a `File` handle and never leaves the browser.

## Tech stack

- [SolidJS](https://solidjs.com) with [TanStack Router / Start](https://tanstack.com/router) (file-based routes, SSR) and [TanStack Query](https://tanstack.com/query)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/), loaded at runtime
- [Tailwind CSS v4](https://tailwindcss.com) with semantic design tokens in `src/styles.css`
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) via `@cloudflare/vite-plugin`
- [lucide-solid](https://lucide.dev) icons, [bun](https://bun.sh) as the package manager

## Getting started

```bash
bun install
bun dev          # dev server on http://localhost:3000
```

Every script in `package.json`:

```bash
bun run build    # production build (vite build)
bun run serve    # preview the production build (vite preview)
bun run start    # run the built Nitro server entry (.output/server/index.mjs)
bun run check    # prettier --write . && eslint --fix
bun run lint     # eslint
bun run format   # prettier
bun run test     # vitest run
bun run deploy   # wrangler deploy
```

## Deployment

`bun run build` produces a Cloudflare Worker (`name: "logview"` in `wrangler.jsonc`) and `bun run deploy` ships it with Wrangler. Authenticate first with `npx wrangler login`; add `routes` or `workers_dev` to `wrangler.jsonc` if you want a custom domain instead of the default `*.workers.dev` URL. The app keeps all state in the browser, so the same client build can also be served by any static host.

## Project structure

```
src/
├── routes/          # file-based routes: __root.tsx (shell), index.tsx (redirects to /viewer), viewer.tsx
├── components/
│   ├── Viewer/      # AppHeader, SearchBar, FilterBar, LogViewer, StatusBar, DragUpload
│   ├── modals/      # GoToLine, Shortcuts, Settings, HighlightSettings, WatchSettings,
│   │                # Compare, Analysis, UpgradeGuide
│   ├── panels/      # MarkerPanel
│   └── ui/          # Modal + ConfirmDialog
├── stores/          # logStore, searchStore, viewStore, markerStore, toastStore
├── hooks/           # useMonacoEditor — Monaco lifecycle, decorations, theming
├── services/        # fileStreamService (chunked streaming), configService (per-extension storage), diffService
├── lib/             # theme (CSS tokens → editor palette), persist, pwa, constants, version, utils
├── utils/           # logLevels, searchHelpers, formatters
├── types/           # shared TypeScript types and defaults
├── data/            # releaseNotes shown in the "What's New" dialog
└── styles.css       # Tailwind v4 entry point and the design tokens

public/
├── manifest.json    # web app manifest
├── sw.js            # hand-written service worker
└── icons/           # app icons (icon.svg, icon-192/512, maskable, apple-touch-icon)
```

## Preferences & storage

Both families live in `localStorage` for the site's origin:

| Key                     | Holds                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hyperlog_config_<ext>` | Per-file-extension view settings (font size, row height, wrapping, new-line handling) and highlight rules. `<ext>` is the lowercased extension such as `.log` or `.txt`, or `default` when the file has none.       |
| `hyperlog_ui_*`         | App-wide preferences: search flags (regex / case / whole word), browse vs. follow view mode, watch mode, excluded levels and "matches only", marker panel open state and height, and the last seen release version. |

Saved per-extension configs are merged over the built-in defaults when loaded, so adding a new setting never breaks an existing entry.

**Markers are not persisted.** They reference line numbers in the `File` you opened, and a browser `File` handle does not survive a reload — use the marker panel's `Export` button to save them as `markers-<timestamp>.json`.

## Install & offline

Install from your browser's address-bar install button (Chromium desktop) or the browser's install menu entry. The "What's New" dialog also shows an **Install app** button whenever your browser has signalled that installation is available; it disappears once the app runs installed.

Offline works after one online visit: on that visit the service worker caches the app shell plus the Monaco assets served from jsDelivr. The first load must be online, because the editor is fetched from a CDN. Service-worker generation with `vite-plugin-pwa` is broken under TanStack Start (upstream [TanStack/router#4988](https://github.com/TanStack/router/issues/4988)), so `public/sw.js` is written by hand.

## Keyboard shortcuts

`Ctrl` means `Cmd` on macOS.

| Shortcut                | Action                                            |
| ----------------------- | ------------------------------------------------- |
| `Ctrl+F`                | Focus search (loads the editor selection, if any) |
| `Ctrl+G`                | Go to line                                        |
| `Enter` / `Shift+Enter` | Next / previous match                             |
| `Ctrl+M`                | Toggle "matches only"                             |
| `F2` / `Shift+F2`       | Next / previous marker                            |
| `Shift+?`               | Shortcut reference                                |
| `Esc`                   | Close the open dialog, or clear the search        |

## Contributing & history

Issues and pull requests: <https://github.com/Forgere/logview>.

- [CHANGELOG.md](CHANGELOG.md) — release history.
- [UPGRADE.md](UPGRADE.md) — what changes when you move to a new version, where settings are stored, and how offline installs work.

There is no license file in this repository; until one is added, treat the code as unlicensed and ask before reusing it.

This project is a SolidJS port of an earlier React app; `todo.md` tracks what has been carried over.
