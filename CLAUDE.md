# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
bun dev          # Start dev server on port 3000

# Build & Production
bun build        # Build for production
bun start        # Run production server (.output/server/index.mjs)

# Code Quality
bun check        # Format with Prettier and lint/fix with ESLint
bun lint         # ESLint only
bun format       # Prettier only

# Deployment
bun deploy       # Deploy to Cloudflare Workers via Wrangler
```

## Architecture

This is a log viewer application built with:

- **SolidJS** - UI framework using signals (`createSignal`) for reactivity
- **TanStack Solid Router** - File-based routing with SSR support
- **TanStack Solid Start** - Full-stack framework with server functions
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS v4** - Styling (uses `@import 'tailwindcss'` syntax)
- **Cloudflare Workers** - Deployment target (via `@cloudflare/vite-plugin`)

### Key Patterns

**Path Aliases**: Use `~/` to import from `src/` (configured in tsconfig.json)

**Routing**: Routes are in `src/routes/`. The route tree is auto-generated in `src/routeTree.gen.ts`. Use:

- `createFileRoute` for page routes
- `createRootRouteWithContext` for root layout (`__root.tsx`)

**Styling**:

- Use `cn()` from `~/lib/utils` for conditional class merging (clsx + tailwind-merge)
- Dark mode via `.dark` class on parent elements
- CSS variables for theming defined in `src/styles.css`

**Icons**: Use `lucide-solid` for icons

**Code Style**:

- No semicolons, single quotes, trailing commas (Prettier config)
- Functional components with TypeScript strict mode
- `.tsx` extension for files with JSX
