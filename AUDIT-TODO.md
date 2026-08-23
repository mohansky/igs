# IGS — Audit Follow-ups

Full-project audit completed **2026-07-09**. Items 1–3 of the fix plan are done; everything below is outstanding.

---

## Current state

**Branch `hardening-signup-payroll-atomicity`** — 2 commits, **not merged into `main`, not pushed, not deployed**:

| Commit | What |
|---|---|
| `d2568cf` | Close public signup, trust `www.` origin, payroll unique index + idempotent insert, fee writes wrapped in `db.transaction()`, overpayment guard |
| `c7130bf` | Hide age criteria on programme cards |

> ⚠️ **The production DB is already ahead of the deployed code.**
> The unique index `staff_salaries_user_month_idx` (on `user_id, month`) was created directly against Turso. This is backward-compatible — the currently-deployed code still works — but the DB change is live while the code change is not.
> Reversible with: `DROP INDEX staff_salaries_user_month_idx;`

Also uncommitted (your edits, untouched by me): `public/igs-icon.svg`, `public/logo192.png`, `public/logo512.png`.

Status: `tsc --noEmit` clean, `pnpm build` passes.

---

## Already fixed (for reference)

- Auth guards added to previously **unauthenticated** server fns: `getStudentProfile`, `getStudentParents`, `getContactSubmissions`, `updateSubmissionStatus`, `uploadToR2`, `listClasses`
- Mass-assignment fix in `updateStudentProfile` (field whitelist; `userId`/`id`/timestamps stripped for all roles)
- `uploadToR2` folder allowlist + sanitized file extension
- zod validation on the sensitive mutations (users, fees, students, upload, contact)
- Fail-fast if `BETTER_AUTH_SECRET` is unset
- Best-effort IP rate limit on the public contact form
- Razorpay integration disabled (commented out, restorable)
- `auditor` view-only role added
- `disableSignUp: true` + `www.indogermanschool.com` added to `trustedOrigins`
- Payroll made idempotent (unique index + `onConflictDoNothing`), N+1 removed
- `recordPayment` / `bulkMarkFeesPaid` / `deleteFeePayment` wrapped in transactions; overpayment rejected

---

## Remaining work

### Medium

- [ ] **No schema migrations.** `drizzle.config.ts` declares `out: './drizzle'` but no `drizzle/` directory exists — the team is running `db:push` straight at live Turso.
      Adopt: `pnpm db:generate` → commit `drizzle/` → `pnpm db:migrate`.
      ⚠️ The schema now includes `rate_limit` + `staff_salaries_user_month_idx`, both already applied by hand — a baseline migration must be marked as applied, not re-run.

### Low / cleanup

- [ ] Rename `fees.studentUserId` and `attendance.studentUserId` — they actually store the **student profile id**, not a user id (hence the `String(profile.id)` coercions scattered around).
- [ ] Drop the dead `todos` table (still in `src/db/schema.ts` and in the DB).
- [ ] Promote CSP from `Report-Only` to enforcing once validated (see `src/lib/security-headers.ts`). Two blockers before enforcing:
      1. Move the inline theme-init / GTM / Google Ads scripts to nonces or hashes to drop `'unsafe-inline'`.
      2. **`img-src` is missing the R2 host in production.** `security-headers.ts` reads `process.env.VITE_R2_BASE_URL`, but `VITE_`-prefixed vars are build-time client-only and are `undefined` at Worker runtime — so the R2 bucket isn't in the CSP. Add the R2 public host as a plain wrangler `var` (e.g. `R2_PUBLIC_HOST`) and read that instead. Non-blocking today (Report-Only) but would block receipt/photo images once enforced.
- [ ] **Optional DB-level FKs for `fees`/`attendance`.** The `deleteStudent` cascade + payment guard now covers this at the app layer (chosen approach). Real ON DELETE constraints would be defense-in-depth but need a table rebuild on live financial data — deferred.
- [ ] Enable `noUncheckedIndexedAccess` in `tsconfig.json`. Would clear the ~21 pre-existing `no-unnecessary-condition` lint false-positives and make the `if (!row)` guards type-correct — but surfaces **79** type errors to fix across the codebase, so it's its own focused pass, not a quick toggle.

---

## Done (2026-07-15)

- [x] **All server function inputs validated with zod.** Every pass-through `inputValidator((data) => data)` replaced with a schema (all modules). Logic/reporting-driving fields are enum-constrained (transaction type, calendar/enquiry/attendance/fee/salary status, attachment type) and those types are threaded through the client call sites. Staff profile create/update now uses a writable-column whitelist (mass-assignment fix); array batches are bounded; money must be finite + non-negative.
- [x] **`deleteStudent` no longer orphans records.** Cascades fees + attendance in a transaction, and **refuses to delete a student with recorded fee payments** (deactivate instead) so financial history / closed books are preserved. App-level approach — no schema migration, no FK rebuild. Verified live DB had 2 orphan attendance rows, 0 orphan fees before the fix.

## Done (2026-07-14)

- [x] **Security headers** — new `src/server.ts` entry wraps the default handler (`wrangler.jsonc main` now points at it). Sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS (https-gated), and CSP as **Report-Only**. Verified live against the built worker with `wrangler dev` + `curl`.
- [x] **Sign-in rate limiting** — 5/min on `/sign-in/email`, 3/min forget-password, 30/min global. Backed by the new `rate_limit` table (in-memory would only throttle per-isolate on Workers). Verified end-to-end: `401 ×5 → 429 ×3`.
- [x] **Session expiry (7d) + `minPasswordLength: 10`**, kept in sync with `createUserByAdmin`'s zod rule.
- [x] **N+1 in `markAttendance`** — now a single `db.batch()`; status is a zod enum (`present`/`absent`/`late`, matching the real data) threaded through `AttendanceMarker`.
- [x] **`errorComponent` on `__root`** — authz errors surface as-is; everything else shows a generic message so DB internals don't leak.
- [x] **Tests — first in the repo** (`vitest.config.ts` added, 30 passing):
      `requireRole` permission matrix incl. the auditor read-only invariant; a **structural test asserting no GET server fn performs a write** (this is what makes the auditor's method-based read access safe — mutation-tested to confirm it actually fails when violated); fee arithmetic extracted to `src/lib/fee-math.ts` and covered (float tolerance, overpayment).

---

## Gotchas

- **Razorpay is intentionally disabled** — commented out in `src/server/razorpay.ts`, `src/lib/razorpay.ts`, and the "Pay Online" flow in `FeeStudentView.tsx`. A possible future addition; do not "fix" it.
- **`db` is a lazy `Proxy`** (`src/db/index.ts`). `db.transaction()` *does* work through it (smoke-tested against real libsql, including error propagation / rollback). Don't refactor it away assuming it's broken.
- **`pnpm lint` / `pnpm format` fail to launch** — the eslint/prettier bin shims are missing from `node_modules/.bin`. Run them from the pnpm store path instead.
- **The repo has many pre-existing `@typescript-eslint/no-unnecessary-condition` errors.** Compare against `HEAD` before treating one as a regression.
- **Don't copy/rename a folder containing a pnpm `node_modules`** — pnpm uses absolute symlinks and they all break. Move the source without `node_modules`, then `pnpm install`.



