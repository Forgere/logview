# Upgrading to HyperLog 1.1.0

This guide covers what changed for people who used the previous version of the app. If you are new here, the [README](README.md) is a better starting point.

## What changed at a glance

| Area                 | Before                                                      | Now                                                                   |
| -------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Launching            | Browser tab only                                            | Installable app that also works offline                               |
| Preferences          | Lost on refresh (only per-extension view settings survived) | Restored on refresh under `hyperlog_ui_*`                             |
| Level filtering      | Not available                                               | Per-level chips with counts in the filter bar                         |
| Cursor / file info   | Not available                                               | Status bar with line/column, totals and per-level counts              |
| Marker notes         | Not available                                               | Inline note editing plus JSON export                                  |
| Markers after reload | Not persisted                                               | Still not persisted — export them instead (see below)                 |
| Dialogs              | Browser `alert` / `confirm` pop-ups                         | In-app toasts and a confirm dialog                                    |
| After an upgrade     | No signal                                                   | A "What's New" dialog opens once, and stays reachable from the header |

## Why the app looks different

The interface used to mix hardcoded hex colors and grayscale Tailwind shades (`gray-600`, `blue-500`, and friends). Everything now reads from one set of semantic design tokens defined in `src/styles.css` — `background`, `surface`, `surface-2`, `surface-3`, `border`, `muted-foreground`, `accent-brand`, `success`, `warning`, `level-error` and the rest.

Two practical consequences:

- Colors are consistent across the header, filter bar, dialogs and marker panel instead of drifting per component.
- The editor now matches the rest of the UI: `src/lib/theme.ts` reads those same CSS variables at runtime and applies them to the Monaco `hyperlog-dark` theme.

The palette is still dark-only. Nothing you need to do — the new palette replaces the old one.

## Keyboard shortcuts

These are the shortcuts that actually exist. `Ctrl` means `Cmd` on macOS.

| Shortcut      | Action                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `Ctrl+F`      | Focus the search box. With text selected in the editor, the selection is loaded into the search field. |
| `Ctrl+G`      | Go to line                                                                                             |
| `Enter`       | Next search match                                                                                      |
| `Shift+Enter` | Previous search match                                                                                  |
| `Ctrl+M`      | Toggle "matches only" (show just the lines matching the current search)                                |
| `F2`          | Jump to the next marker                                                                                |
| `Shift+F2`    | Jump to the previous marker                                                                            |
| `Shift+?`     | Open the shortcut reference (ignored while typing in an input)                                         |
| `Esc`         | Close the open dialog, or clear the search if no dialog is open                                        |

`Ctrl+F`, `Ctrl+G`, `Enter` and `Shift+Enter` are handled inside the editor, so they work wherever the cursor is. `Ctrl+M`, `F2`, `Shift+F2` and `Shift+?` are handled at the window level. `F2` wraps around to the first marker when there is no later one, and does nothing when no markers exist.

The search box also has regex, match-case and whole-word toggles; they are buttons, and their state is remembered across refreshes.

## Where settings are stored

Two families of keys, both in `localStorage` for the site's origin:

- **`hyperlog_config_<ext>`** — unchanged by this release. One key per file extension (`.log`, `.txt`, or `default` when the file has no extension), holding `{ extension, viewSettings, highlightRules }`: font size, row height, line wrapping, new-line handling and your highlight rules. Saved values are merged over the built-in defaults when loaded, so adding new settings later never breaks an existing entry. **Your saved per-extension settings survive the upgrade untouched.**
- **`hyperlog_ui_*`** — new in 1.1.0, app-wide preferences rather than per-file ones:
  - search options (regex, case sensitive, whole word)
  - browse vs. follow view mode and the watch mode selection
  - excluded log levels and "matches only"
  - marker panel open state and height
  - the last release version you have seen (used to open "What's New" exactly once per version)

Both families are written independently, so upgrading does not migrate or rewrite anything — the old keys keep working and the new ones start empty.

## How to install, and how offline works

**Install.** On a Chromium-based desktop browser use the install button in the address bar (or the browser's "Install app" menu entry). The app also offers an in-app **Install app** button inside the "What's New" dialog, shown only when your browser has signalled that installation is available; it stays hidden once the app is already running installed.

**Offline.** Offline works _after_ one online visit, not before:

1. Load the app once while connected. During that visit the service worker installs and caches the app shell plus the editor assets served from the jsDelivr CDN (`https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs`).
2. From then on the cached copy is used, so launching the app and using the editor work without a network.

The first load must therefore be online — the editor itself is fetched from a CDN, and there is nothing in the cache until that first visit completes. Your log files are never uploaded: they are read from your local disk through a `File` handle, which also means you re-open a log file after each reload.

## Markers are not persisted (by design)

Markers reference line numbers inside the `File` you opened. Browser `File` handles do not survive a reload, so there is nothing for a stored marker to point at — persisting them would only produce dangling line numbers. Markers are therefore still cleared on refresh.

To keep them, use the marker panel's **Export** button, which downloads `markers-<timestamp>.json` containing the line number, timestamp, selected text, context line and note of every marker. The panel also has a **Copy** action for the selected markers if you just want the text.

Nothing in this upgrade changes existing markers: they behave exactly as before, and export is additive.

## Troubleshooting

**Reset all preferences.** Open your browser's devtools, go to the Application (or Storage) panel → Local Storage → this site, and delete the keys you want gone:

- `hyperlog_ui_*` — app-wide preferences from 1.1.0
- `hyperlog_config_<ext>` — per-extension view settings

Delete both families for a clean slate, or just one to keep the other. Reload afterwards.

**Force the offline cache to update.** A new release ships a new service worker; the browser installs it in the background and activates it once every app tab is closed. If you are stuck on an old cached version, close all tabs for the app, reopen it, and reload once — the fresh worker takes over on that load and repopulates the cache.

**"What's New" keeps appearing.** It is gated on the last seen version stored in `hyperlog_ui_*`. Deleting that key (or all `hyperlog_ui_*` keys, as above) makes it show once more on the next load. You can also reopen it any time from the version number in the header.

**The editor does not load.** The editor is fetched from jsDelivr on first use. If that CDN is blocked or you are offline on a first visit, the editor cannot start; load the page once with network access to the CDN and retry.

## GitHub

Source, issues and releases: <https://github.com/Forgere/logview>.

Release history lives in [CHANGELOG.md](CHANGELOG.md).

---

## 升级说明（简体中文）

1.1.0 的主要变化：可以安装为本地应用，并在离线状态下打开；刷新后不再丢失偏好设置（`hyperlog_ui_*`）；新增日志级别过滤和状态栏（行列号、总行数、各级别计数）；标记支持行内备注和 JSON 导出；新增 `F2` / `Shift+F2` / `Ctrl+M` / `Shift+?` 快捷键；界面统一改为读取 `src/styles.css` 的设计令牌，编辑器配色也来自同一套变量；浏览器原生的 `alert` / `confirm` 弹窗换成了应用内的提示条和确认框。

关于存储：`hyperlog_config_<ext>` 的按扩展名设置完全没变，升级后照旧生效；新增的 `hyperlog_ui_*` 保存的是应用级偏好（搜索选项、视图/监听模式、级别过滤、标记面板状态与高度、已读版本号），两组键互不影响。

关于离线：编辑器资源来自 jsDelivr CDN，所以**首次访问必须联网**，联网加载一次之后才可以离线使用。

关于标记：标记是文件行号，而浏览器 `File` 句柄无法跨刷新保留，所以标记不会持久化。需要留存请使用标记面板的 **Export** 按钮导出 `markers-<时间戳>.json`。

需要重置偏好时，在浏览器开发者工具的 Local Storage 中删除 `hyperlog_ui_*`（和/或 `hyperlog_config_<ext>`）即可。

项目地址：<https://github.com/Forgere/logview>。
