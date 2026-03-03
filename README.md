<div align="center">
  <img src="public/shiftsync-logo-nobg.png" alt="ShiftSync" width="100" />
  <h1>ShiftSync</h1>
  <p>Multi-location staff scheduling platform for Coastal Eats restaurant group.</p>
</div>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript 5.9 |
| Database | PostgreSQL (via Supabase) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Auth | Supabase Auth (email/password, session cookies) |
| Realtime | Supabase Realtime (Postgres Changes) |
| Styling | Tailwind CSS 4, Radix UI, Framer Motion |
| Charts | Recharts |
| State | TanStack React Query |
| Testing | Vitest |

---

## System Architecture

![ShiftSync Architecture](/public/shiftsync-arch.webp)

---

## Features

### Scheduling
- Weekly schedule grid with drag-friendly shift creation
- Assign staff to shifts manually with instant constraint validation
- Publish/unpublish schedules with 48-hour cutoff enforcement
- Overnight shift support (e.g. 11 PM – 3 AM treated as one shift)
- "What-if" overtime preview before committing assignments

### Constraint Engine
Every assignment runs through 8 checks in priority order. Hard blocks cannot be overridden; warnings can be acknowledged by a manager.

| # | Rule | Severity | Threshold |
|---|---|---|---|
| 1 | Skill mismatch | BLOCK | Staff lacks the shift's required skill |
| 2 | Not certified at location | BLOCK | Staff not certified (or de-certified) at the location |
| 3 | Double-booking | BLOCK | Any time overlap, even across locations |
| 4 | Insufficient rest | BLOCK | < 10 hours between adjacent shifts |
| 5 | Unavailable | BLOCK | Outside stated availability (respects date exceptions + overnight) |
| 6 | Daily hours exceeded | BLOCK > 12h, WARN > 8h | Total hours on a single calendar day |
| 7 | Weekly hours warning | WARN | ≥ 35h approaching OT, > 40h overtime |
| 8 | Consecutive days | WARN | 6th day = warning, 7th day = requires override with documented reason |

When a check fails, the system explains which rule was broken and suggests up to 3 alternative staff members — each vetted against all BLOCK-level constraints and sorted by fewest weekly hours for fairness.

### Shift Swapping & Coverage
- Staff can request swaps with specific colleagues or drop shifts for anyone to claim
- Three-step workflow: Staff A requests → Staff B accepts → Manager approves
- Max 3 pending swap/drop requests per staff member
- Drop requests auto-expire 24 hours before shift start
- Editing a shift auto-cancels any pending swaps with notifications to all parties

### Overtime & Compliance
- Real-time projected overtime cost dashboard
- Per-staff weekly hours tracking with visual overtime indicators
- Assignment impact preview showing current → projected hours before saving

### Fairness Analytics
- Hours distribution per staff member over any date range
- Premium shift tracking (Friday/Saturday evenings auto-tagged)
- Fairness score showing equitable distribution of desirable shifts
- Under/over-scheduled indicators relative to stated desired hours

### Real-Time Updates
- Schedule changes push to affected staff instantly (no refresh needed)
- Swap status changes notify all parties in real-time
- Live "on-duty now" grid showing who's working at each location
- Simultaneous assignment conflicts detected and surfaced immediately

### Notifications
- 11 notification types covering shifts, swaps, drops, and overtime
- Notification center with read/unread state
- Configurable preferences: in-app and/or email (simulated)
- Granular per-category toggles (shift changes, swap updates, overtime warnings)

### Audit Trail
- Every schedule change logged with actor, timestamp, and before/after JSON snapshots
- Managers can view full history of any shift
- Admins can filter audit logs by location, date range, and shift

---

## Design Decisions

The spec left several things ambiguous. Here's how they were resolved:

### Timezone handling
All shift times are stored in UTC. Display always uses the **location's** IANA timezone (e.g. `America/New_York`). When a staff member sets availability as "9 AM – 5 PM", that window is interpreted in the timezone of the location they're being assigned to — not their personal timezone. This avoids the confusion of a single person having different "9 AM" meanings across locations.

### De-certification
Staff certifications use a **soft delete** (`decertifiedAt` timestamp). Historical assignments are preserved for audit purposes. A de-certified staff member cannot be assigned to new shifts at that location but their past records remain intact.

### Desired hours
The `desiredHours` field on a profile is **informational only**. It is not enforced as a constraint — managers use it as a reference when reviewing fairness analytics to see who is under or over their preferred workload.

### Consecutive days rule
**Any shift length counts** as a worked day for the consecutive days check. A 2-hour shift and a 12-hour shift both count equally. This is the conservative interpretation — it's about rest days, not hours worked.

### Shift edits after swap requests
When a manager edits a shift that has pending swap requests, all active swaps for that shift are **automatically cancelled** and notifications are sent to all involved parties. The rationale: the shift has materially changed, so the swap agreement is no longer valid.

### Overnight shifts and availability
A shift spanning midnight (e.g. 11 PM – 3 AM) checks availability for **both calendar days**. The staff member must be available from 11 PM on day 1 and from midnight to 3 AM on day 2.

### Constraint suggestion intelligence
When a constraint fails and the system suggests alternatives, each candidate is run through all 7 BLOCK-level checks **before being included**. This guarantees that clicking a suggestion will never produce another immediate failure.

---

## Project Structure

```
app/
├── api/              # 15 API route files (REST endpoints)
├── admin/            # Admin dashboard, analytics, audit, locations, people, schedule
├── manager/          # Manager dashboard, schedule, swaps, analytics, staff
├── staff/            # Staff dashboard, schedule, availability, swaps
├── settings/         # Notification preferences
├── login/            # Auth pages (login, sign-up, forgot/update password)
└── layout.tsx        # Root layout with theme, query provider, toast
components/
├── admin/            # Admin-specific components
├── manager/          # Manager-specific components (schedule grid, constraint feedback)
├── staff/            # Staff-specific components
├── shared/           # Cross-role components (notification center, on-duty grid)
├── schedule/         # Shared scheduling components (constraint feedback, shift cards)
└── ui/               # Radix-based design system primitives
lib/
├── services/         # constraintEngine.ts (920 lines, 8 checks + suggestions)
├── hooks/            # React Query hooks (useSchedule, useNotification, etc.)
├── supabase/         # Client, server, and middleware Supabase wrappers
├── prisma.ts         # Prisma client singleton
├── timezone.ts       # UTC → location timezone display utilities
└── apiUtils.ts       # Response helpers (ok/err), auth guards, role checks
prisma/
├── schema.prisma     # 14 models, 4 enums
└── migrations/       # PostgreSQL migration files
```

---

## Local Setup

### Prerequisites
- [Bun](https://bun.sh) (or Node.js 20+)
- A [Supabase](https://supabase.com) project (free tier works)
- PostgreSQL database (included with Supabase)

### 1. Clone & install

```bash
git clone https://github.com/Dagmawi-Y/ShiftSync.git
cd ShiftSync
bun install
```

### 2. Environment variables

Copy the example and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` key (server-only) |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (use Transaction mode with port 6543 for Prisma) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |

### 3. Database setup

```bash
bunx prisma generate
bunx prisma migrate dev
```

### 4. Seed admin user (optional)

Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME` in `.env.local`, then:

```bash
bun run seed:admin
```

### 5. Run

```bash
bun dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

---

## Testing

```bash
bun run test          # single run
bun run test:watch    # watch mode
```

53 unit tests covering:
- **Constraint engine** — all 8 scheduling rules, overrides, intelligent suggestions, overtime preview
- **API utilities** — response helpers, auth guards, role checks
- **Timezone utilities** — cross-timezone formatting, overnight shifts, DST handling

---

## API Reference

| Endpoint | Methods | Auth | Description |
|---|---|---|---|
| `/api/shifts` | GET, POST | Manager, Admin | List/create shifts for a location |
| `/api/shifts/[id]` | GET, PATCH, DELETE | Manager, Admin | Read/update/delete a shift |
| `/api/assignments` | POST | Manager, Admin | Assign staff (runs constraint engine) |
| `/api/staff` | GET | Manager, Admin | List staff by location/skill |
| `/api/swaps` | GET, POST | All | List/create swap or drop requests |
| `/api/swaps/[id]` | POST | All | Accept, reject, approve, or cancel a swap |
| `/api/availability` | GET, PUT | Staff | Read/update availability windows |
| `/api/notifications` | GET, PATCH | All | List notifications / mark all read |
| `/api/analytics` | GET | Manager, Admin | Fairness and overtime analytics |
| `/api/audit` | GET | Manager, Admin | Audit log with before/after snapshots |

---

## Deployment

Deployed on [Vercel](https://vercel.com). The `build` script runs `prisma generate && next build`.

Set all environment variables from `.env.example` in Vercel → Settings → Environment Variables. Use the **pooled connection string** (port 6543) for `DATABASE_URL` in production.
