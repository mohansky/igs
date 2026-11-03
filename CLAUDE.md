# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build (Cloudflare Workers)
pnpm test         # Run tests (Vitest)
pnpm lint         # ESLint check — currently fails: `eslint` itself isn't a devDependency
pnpm format       # Prettier check
pnpm check        # Auto-fix format + lint (the eslint half fails, as above)
pnpm exec tsc --noEmit  # Type check (no script for it)

# Database (Drizzle ORM + SQLite) — see "Database workflow" below before
# touching schema.ts. In practice only db:push / db:push:prod are used.
pnpm db:generate  # Generate migrations from schema — do not run, see note below
pnpm db:migrate   # Run migrations — do not run, see note below
pnpm db:push      # Push schema to the STAGING DB (.env.local)
pnpm db:push:prod # Push schema to the PRODUCTION DB (.env.prod.local)
pnpm db:seed:categories       # Add missing default fee categories (staging); idempotent
pnpm db:seed:categories:prod  # Same, production
pnpm db:studio    # Open Drizzle Studio (staging)

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

`src/styles/styles.css` defines the entire theme system:

- **Custom CSS variables** (`--sea-ink`, `--lagoon`, `--surface`, etc.) for the school's brand colors in both light and dark modes
- **Shadcn variables** (`--primary`, `--background`, etc.) using OKLCH color space — neutral base + emerald accent theme
- **Custom utility classes**: `.island-shell` (glassmorphic cards), `.feature-card`, `.display-title` (Fraunces serif font), `.island-kicker` (uppercase labels), `.page-wrap` (max-width container), `.rise-in` (entry animation)
- **Fonts**: Nunito (sans, body) + Fraunces (serif, headings) + JetBrains Mono (mono, labels/numerics) — self-hosted `.woff2` files in `public/fonts/`, `@font-face` declarations live in `src/styles/fonts.css` and are imported at the top of `src/styles/styles.css`
- **Theme toggle**: `.dark` class on `<html>`, persisted in localStorage, with system preference detection

Tailwind 4 is configured inline in `styles.css` via `@theme inline {}` — there is no `tailwind.config` file.

### UI Components

Shadcn UI components live in `src/components/ui/`. Config is in `components.json` (style: new-york-v4, baseColor: neutral, iconLibrary: hugeicons).

**Headless primitives:** all components that use a primitive are on **`radix-ui`** (the Shadcn default). There is no `@base-ui/react` dependency. For a searchable single-select, use the Shadcn `Popover` + `Command` (cmdk) pattern — see `AttendanceMarker.tsx` for a reference implementation.

New components are added via `pnpm dlx shadcn@latest add <component>`. The `#/` path alias maps to `src/` — use it for all imports (e.g., `#/lib/utils`, `#/components/ui/button`).

### Content / Blog

Blog posts are markdown/MDX files in `content/blog/`. Managed by **Content Collections** (configured in `content-collections.ts`). Schema: title, description, pubDate, heroImage (optional). Posts are loaded via `allBlogs` import from `content-collections`.

### Backend

- **Better Auth** for authentication (`src/lib/auth.ts` server, `src/lib/auth-client.ts` client)
- **Drizzle ORM** with SQLite (`src/db/schema.ts` for schema, `drizzle.config.ts` for config)
- Server functions via `createServerFn` from `@tanstack/react-start`, in `src/server/*.ts`, with zod `inputValidator`s
- Cloudflare R2 (via the AWS S3 SDK, `src/server/r2-client.ts`) for uploads and the public gallery, which lists the bucket's `gallery/` prefix live; Resend for email (loaded on demand)

### Roles and access

- Roles: `admin`, `staff`, `student` (parents share it and see only linked children), and `auditor` (view-only, for trustees). Type in `src/lib/roles.ts`.
- Protected server functions call `requireRole([...])` (`src/server/auth-utils.ts`). The auditor passes any `requireRole` on a **GET** (unless `{ allowAuditor: false }`), never on a POST, so a GET must never write — `server-fn-invariants.test.ts` enforces this.
- Route `beforeLoad` guards are separate from the sidebar (`navItems` / `auditorHidden` in `src/routes/dashboard.tsx`) and the command palette; keep all three in step when adding a page.
- Staff have no fee access at all (nav, routes and server). Concession status is admin/auditor only, never shown to staff or parents.
- The in-app help page is `src/routes/dashboard/docs.tsx`, role-gated per section; update it when a feature's user-facing behaviour changes.

### Domain notes

- School and financial year run **May–April** (`src/lib/financial-year.ts`; labels like `2026-27`). "Today" for fees is India time (`schoolToday()` in `src/lib/fee-math.ts`); payment dates can't be in the future.
- `fees.studentUserId` holds the student **profile** id as a string, not a login user id (students may have no login). Join with `eq(fees.studentUserId, studentProfiles.id)`.
- Concession (open) fees: `fees.is_open = 1`, amount 0, status `open`; excluded from dues, overdue and collection rates, always in the Tuition category. Plans per academic year live in `student_fee_plans`.
- Fee categories: find seeded ones by `key` (e.g. `TUITION_KEY`), never by name — admins can rename them. `category_id` is nullable for old fees ("Uncategorised").
- Staff leave balances are computed from `staff_attendance` (CL/SL) by `src/lib/leave-policy.ts`; there's no balance table.

### Database workflow (read before editing schema.ts)

There are two Turso databases, and each has its own env file:

- **`.env.local` → staging** (the `igs-staging` branch, a snapshot copy of production). Used by `pnpm dev`, `pnpm db:push`, `pnpm db:studio`, and by `scripts/*` by default. Never edit it to point at production.
- **`.env.prod.local` → production.** Read only by `pnpm db:push:prod` (`drizzle.prod.config.ts`) and by scripts run with `--prod` (e.g. `pnpm tsx scripts/reset-staff-passwords.ts --prod …`). Each of these prints which database host it's about to use.
- The deployed Worker gets production DB credentials from Cloudflare secrets (`wrangler secret`), not from any file. `wrangler.jsonc` `vars` holds only non-secret values.

Schema changes go through `db:push`, which diffs `schema.ts` against the target DB and applies the difference directly. There are no versioned migrations and no journal.

- **Do not run `pnpm db:generate` or `pnpm db:migrate`.** With no existing journal, `db:generate` produces a bogus "initial" migration that recreates every table from scratch instead of diffing — this happened once (2026-09-29) and was caught before running. If migrations are ever adopted, the current live schema needs a deliberate one-time baseline first.
- Flow for a schema change: edit `schema.ts` → user runs `pnpm db:push` (staging) and checks it → user runs `pnpm db:push:prod` → then deploy. Any database also needs `pnpm db:seed:categories` (or `:prod`) once, after the push that created `fee_categories`; bulk fees and concessions look up the Tuition category by `key`. Code that reads a new table or column must not be deployed before the production push, or those pages break. Never run either push unprompted, same as `pnpm deploy`.
- A purely additive change (new table, new nullable column) is safe; column/type changes or renames can make `db:push` ask for a destructive confirmation, so read what it's asking before answering yes.
- **Never answer yes to a "truncate" prompt** — it deletes every row in that table. If one appears for an additive change, abort and fix the schema.
- **Boolean defaults on NOT NULL columns: write `.default(sql\`0\`)`/`sql\`1\``, not `.default(false)`/`true`.** drizzle-kit 0.31's libsql push checks `!column.default`, so a `false` default reads as "no default" and it offers to truncate the table (this happened with `fees.is_open`, 2026-11). To preview what a push will run without touching a database, diff two schemas offline with `generateSQLiteDrizzleJson` / `generateSQLiteMigration` from `drizzle-kit/api`.
- The staging branch doesn't sync with production; recreate it (`turso db destroy igs-staging`, then `turso db create igs-staging --from-db <prod>`) when fresher data is needed.

### Key Conventions

- Prettier: no semicolons, single quotes, trailing commas
- ESLint: extends `@tanstack/eslint-config`
- Use `cn()` from `#/lib/utils` (clsx + tailwind-merge) for conditional class merging
- Use Tailwind v4 canonical syntax for CSS variables: `text-(--sea-ink)` not `text-[var(--sea-ink)]`
- Package manager: **pnpm**
