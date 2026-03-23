# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build (Cloudflare Workers)
pnpm test         # Run tests (Vitest)
pnpm lint         # ESLint check
pnpm format       # Prettier check
pnpm check        # Auto-fix format + lint

# Database (Drizzle ORM + SQLite)
pnpm db:generate  # Generate migrations from schema
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema to DB
pnpm db:studio    # Open Drizzle Studio

# Shadcn UI
pnpm dlx shadcn@latest add <component>

# Deploy
pnpm deploy       # Build + deploy to Cloudflare
```

## Architecture

**TanStack Start** full-stack app deployed to **Cloudflare Workers**, using file-based routing, React 19, and Tailwind CSS 4.

### Routing

File-based routes in `src/routes/`. TanStack Router auto-generates `src/routeTree.gen.ts` — never edit this file manually. The root layout is `src/routes/__root.tsx` which provides Header, Footer, theme init script, and QueryClient context.

### Styling

`src/styles.css` defines the entire theme system:
- **Custom CSS variables** (`--sea-ink`, `--lagoon`, `--surface`, etc.) for the school's brand colors in both light and dark modes
- **Shadcn variables** (`--primary`, `--background`, etc.) using OKLCH color space — neutral base + emerald accent theme
- **Custom utility classes**: `.island-shell` (glassmorphic cards), `.feature-card`, `.display-title` (Fraunces serif font), `.island-kicker` (uppercase labels), `.page-wrap` (max-width container), `.rise-in` (entry animation)
- **Fonts**: Raleway (sans, body) + Fraunces (serif, headings)
- **Theme toggle**: `.dark` class on `<html>`, persisted in localStorage, with system preference detection

Tailwind 4 is configured inline in `styles.css` via `@theme inline {}` — there is no `tailwind.config` file.

### UI Components

Shadcn UI components live in `src/components/ui/`. They use **@base-ui/react** as the headless primitive library (not Radix UI). Config is in `components.json` (style: new-york-v4, baseColor: neutral, iconLibrary: hugeicons).

The `#/` path alias maps to `src/` — use it for all imports (e.g., `#/lib/utils`, `#/components/ui/button`).

### Content / Blog

Blog posts are markdown/MDX files in `content/blog/`. Managed by **Content Collections** (configured in `content-collections.ts`). Schema: title, description, pubDate, heroImage (optional). Posts are loaded via `allBlogs` import from `content-collections`.

### Backend

- **Better Auth** for authentication (`src/lib/auth.ts` server, `src/lib/auth-client.ts` client)
- **Drizzle ORM** with SQLite (`src/db/schema.ts` for schema, `drizzle.config.ts` for config)
- Server functions via `createServerFn` from `@tanstack/react-start`

### Key Conventions

- Prettier: no semicolons, single quotes, trailing commas
- ESLint: extends `@tanstack/eslint-config`
- Use `cn()` from `#/lib/utils` (clsx + tailwind-merge) for conditional class merging
- Use Tailwind v4 canonical syntax for CSS variables: `text-(--sea-ink)` not `text-[var(--sea-ink)]`
- Package manager: **pnpm**
