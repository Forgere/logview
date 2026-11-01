# Changelog

All notable changes to HyperLog (`logview`) are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.1.0] - 2026-11-01

### Added

- Progressive Web App support: a hand-written service worker (`public/sw.js`) plus a web app manifest (`public/manifest.json`) make the app installable and usable offline. `vite-plugin-pwa` cannot be used here because service-worker generation is broken under TanStack Start (upstream [TanStack/router#4988](https://github.com/TanStack/router/issues/4988)), so the worker is written by hand.
- In-app install affordance driven by the `beforeinstallprompt` event, which stays hidden while the app already runs installed.
- Cross-refresh preference persistence under the `hyperlog_ui_*` localStorage keys: search flags (regex / case sensitive / whole word), browse vs. follow view mode, watch mode, level filter, "matches only", marker panel open state and height, and the last seen release version.
- A "What's New" dialog gated on the app version (`src/lib/version.ts`), fed by `src/data/releaseNotes.ts` and reachable from the header.
- Links to <https://github.com/Forgere/logview> in the header and in the empty state.
- Log level filtering: per-level chips with counts and a `Clear` action (`FilterBar`).
- A status bar with cursor line/column, total line count, live streaming progress and per-level counts (`StatusBar`).
- Marker notes: inline editing inside the marker panel, plus a JSON `Export` action that downloads `markers-<timestamp>.json`.
- Keyboard shortcuts `F2` / `Shift+F2` (next / previous marker), `Ctrl+M` (toggle matches only) and `Shift+?` (shortcut reference), alongside the existing `Ctrl+F`, `Ctrl+G`, `Enter` / `Shift+Enter` and `Esc`.
- A toast notification system (`src/stores/toastStore.tsx`) and a reusable `ConfirmDialog`, replacing native `alert()` / `confirm()`.

### Changed

- Theming now reads the design tokens in `src/styles.css` instead of hardcoded hex values and grayscale Tailwind colors; panels, dialogs, header and filter bar all use the same tokens.
- The Monaco editor theme is derived from those CSS tokens at runtime (`src/lib/theme.ts`), so the editor matches the surrounding UI.
- Per-extension storage is unchanged and upgrade-safe: view settings and highlight rules keep living in `hyperlog_config_<ext>` and are still merged over `DEFAULT_VIEW_SETTINGS` when loaded.
- Saved per-extension settings are restored once on client mount before any auto-save runs, so the stored font size, row height, wrapping and highlight rules are no longer overwritten by defaults on boot.

### Fixed

- `Mark Selection` no longer throws `TypeError: (intermediate value).Range is not a function`. The click handler built a range with `monaco.Range` taken from the ESM namespace returned by `monacoAPI.monaco()`, which is not constructible; it now calls the editor hook's `setSelection(...)`, so the marker is created and the selection collapses as intended.

### Removed

- Dead components and store: `src/components/Header.tsx`, `src/components/Viewer/ViewerHeader.tsx` and `src/stores/modalStore.tsx` (dialog open state is now local to the viewer route).
- Native `alert()` / `confirm()` dialogs, replaced by toasts and `ConfirmDialog`.

## [1.0.0]

The initial SolidJS port of HyperLog, before this changelog existed:

- Monaco-based log viewer with a custom `logview` language and level highlighting (`src/hooks/useMonacoEditor.ts`).
- Chunked, idle-callback streaming of large files (`src/services/fileStreamService.ts`).
- Search with regex, case-sensitive and whole-word options, plus match navigation.
- Drag-and-drop file upload and follow/browse streaming modes.
- Markers (bookmarks) with a virtualized marker panel, plus the Go to Line, Shortcuts, Settings, Highlight, Watch and Compare dialogs, and a marker summary view.
- Per-extension view settings and highlight rules persisted through `src/services/configService.ts`.

Earlier commits in this repository are untagged and undated, so no version numbers or dates are assigned to them here.
