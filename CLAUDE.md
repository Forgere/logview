# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This is **logview** - a SolidJS refactor of **HyperLog** (React). The original React app is at `../HyperLog/`. When implementing missing features, reference the React source code there.

## Commands

```bash
bun dev          # Start dev server on port 3000
bun build        # Build for production
bun check        # Format with Prettier and lint/fix with ESLint
bun deploy       # Deploy to Cloudflare Workers
```

## Architecture

Log viewer application for large files using Monaco Editor with virtualized rendering.

**Stack**: SolidJS, TanStack Solid Router/Start/Query, Tailwind CSS v4, Cloudflare Workers

### Source Structure

```
src/
├── stores/          # SolidJS context stores (logStore, searchStore, markerStore, viewStore, modalStore)
├── hooks/           # useMonacoEditor - Monaco integration hook
├── services/        # fileStreamService (streaming), configService, diffService
├── components/
│   └── Viewer/      # LogViewer, SearchBar, AppHeader, DragUpload
├── routes/          # TanStack file-based routing (__root.tsx, index.tsx, viewer.tsx)
├── types/           # TypeScript types (LogLevel, LogMarker, HighlightRule, ViewSettings, etc.)
└── utils/           # formatters, searchHelpers
```

### Key Patterns

**State Management**: Use SolidJS stores in `src/stores/`. Each store exports a Provider and a `useX()` hook:
- `useLog()` - File loading, streaming state, Monaco editor reference
- `useSearch()` - Search query, matches, navigation
- `useMarkers()` - Bookmarks/markers management
- `useView()` - View settings (font size, wrap, etc.)
- `useModal()` - Modal open/close state

**Monaco Integration**: `useMonacoEditor` hook handles:
- Custom 'logview' language with log level syntax highlighting
- Search decorations, marker decorations, highlight rules
- Custom find (Ctrl+F intercepted → custom SearchBar)
- Streaming content via `model.pushEditOperations()`

**File Streaming**: `FileStreamer` class streams files in chunks (500 lines), uses `requestIdleCallback` for smooth rendering.

**Path Aliases**: `~/` maps to `src/`

**Icons**: `lucide-solid`

**Styling**: `cn()` from `~/lib/utils` for class merging. Dark theme only.

## React → Solid Conversion Notes

When porting from HyperLog (React):
- `useState` → `createSignal`
- `useEffect` → `createEffect` (with `on()` for dependency tracking)
- `useCallback`/`useMemo` → usually not needed, use `createMemo` if caching expensive computation
- `useRef` → `let ref: Type` or `createSignal` for reactive refs
- React props `{children}` → `{props.children}` with `ParentProps` type
- Event handlers: `onClick` works same, but prefer `on:click` for delegated events
- Conditional rendering: `{condition && <X/>}` → `<Show when={condition}><X/></Show>`
- Lists: `array.map()` → `<For each={array}>{(item) => <X/>}</For>`

### Missing Features (Reference HyperLog)

These HyperLog features need to be ported to logview:
- **Modals**: GoToLineModal, ShortcutsModal, CompareModal, AnalysisModal, HighlightSettingsModal, WatchSettingsModal, SettingsModal (see `HyperLog/components/modals/`)
- **MarkerPanel**: Side panel for managing bookmarks (see `HyperLog/components/panels/MarkerPanel.tsx`)
- **Watch Mode**: Pattern monitoring with PAUSE_ALL/MARK_ONLY modes
- **Keyboard shortcuts**: Ctrl+G (go to line), Shift+? (shortcuts help)
- **Config persistence**: Per-extension settings via localStorage
