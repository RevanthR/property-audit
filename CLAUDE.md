# Property Audit — Project Context

## What this is
A property audit PWA for @nest properties (hostels and hotels). Field auditors use it on-site to audit each property against a checklist. Admin manages properties, users, and checklist templates.

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Vercel Postgres** via Neon (`drizzle-orm` + `@neondatabase/serverless`)
- **Vercel Blob** for report storage (future)
- **Zustand + localStorage** — all audit data persists locally first, syncs to DB every 30s + on page hide
- **PWA** — service worker at `/public/sw.js`, manifest at `/public/manifest.json`
- ORM: Drizzle (`src/lib/db/schema.ts`)

## Key files
| File | Purpose |
|---|---|
| `src/lib/db/schema.ts` | Full Drizzle schema (16 tables) |
| `src/lib/db/seed.ts` | Seed all properties + checklist templates |
| `src/lib/audit-config.ts` | Static workflow config (hostel/hotel steps, areas, manpower, equipment) |
| `src/lib/store/audit.ts` | Zustand store — all in-progress audit data lives here |
| `src/lib/store/session.ts` | Session store (name-based login, persisted in localStorage) |
| `src/app/api/audits/[id]/save/route.ts` | Main sync endpoint — upserts all audit data to DB |

## Auth
- **Auditors**: type their name → auto-creates user record if new
- **Admin**: name + 4-digit PIN (default PIN: `1234`, seeded in `db/seed.ts`)
- No JWT/sessions — identity stored in Zustand + localStorage (`pa-session`)

## Database commands
```bash
npm run db:push    # push schema to Vercel Postgres
npm run db:seed    # seed properties + checklist templates
npm run db:studio  # Drizzle Studio UI
```

## Env vars needed (set in Vercel Dashboard + `.env.local`)
```
DATABASE_URL=         # Vercel Postgres connection string (Neon)
BLOB_READ_WRITE_TOKEN= # Vercel Blob token
AUTH_SECRET=          # Any random string
```

## Hostel workflow (5 steps)
1. **Process** — Admissions + Payments (remarks)
2. **Rooms** — Add room numbers → per-room checklist (34 items, Ok/Not Ok/N/A)
3. **Common Areas** — Kitchen (75-item checklist) + 10 areas (remarks)
4. **Manpower** — 4 categories: count + remarks each
5. **Equipment** — Motors (status), Vehicles + Washing Machines (count)

## Hotel workflow (10 steps)
1. Front Office → 2. Guest Rooms → 3. Housekeeping → 4. Engineering
5. Food & Beverage → 6. Property Management → 7. Security → 8. Finance
9. Human Resources → 10. Guest Experience → Review

## Module types
Each section/area has a `moduleType` the admin can configure:
- `remarks` → free text textarea
- `checklist` → list of items with Ok/Not Ok/N/A + mandatory remarks if Not Ok
- `count` → number input + remarks
- `status` → Ok/Not Ok/N/A dropdown + remarks

## Properties (pre-seeded)
**Hostels (9):** Tulip, Blossoms 1, Blossoms 2, Orchids, Olive, Olive 2, Iris, NHFM, NHFW — all @nest
**Hotels (6):** Iris Hotel, Marigold, Marigold 2, Voila, Orchid Suites, Viola Suites — all @nest

## Auto-save logic
1. Every field change writes to Zustand immediately
2. Zustand is persisted to `localStorage` via `persist` middleware (key: `pa-audit-drafts`)
3. Background sync to DB: every 30s + on `pagehide` + on `visibilitychange` (tab hidden)
4. Manual "Save" button in the step nav triggers immediate sync
5. On audit submit → final sync → `status: submitted` → local draft cleared

## Admin PIN
Default admin PIN is `1234`. Change it by updating the seed or directly in the DB.
Admin features: manage properties, assign auditors, edit checklist templates, view all audits.

## Report generation
`/api/reports/[auditId]` returns an HTML page formatted for print/PDF.
The client triggers `window.print()` equivalent via blob download (`Content-Disposition: attachment`).

## TODO (next sessions)
- [ ] Insights / analytics dashboard (compare audits across properties)
- [ ] Photo uploads using Vercel Blob (attach photos to checklist items)
- [ ] Push notifications for pending/overdue audits
- [ ] Offline queue (Background Sync API) for zero-connectivity scenarios
- [ ] Pagination on /admin/audits for large datasets
