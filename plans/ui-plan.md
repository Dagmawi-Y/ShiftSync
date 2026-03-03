# ShiftSync UI/UX Build Plan

## Design Principles
- **Linear-inspired**: Fast, clean, keyboard-first, minimal chrome
- **Skeleton-first loading**: No spinners — shimmer placeholders everywhere
- **Real-time native**: Live updates glow/pulse, no manual refresh needed
- **Constraint feedback inline**: Errors, warnings, suggestions right where the action happens

## Color System
- Primary: `#4DA8DA` (blue) — buttons, active states, links
- Secondary: `#80D8C3` (teal) — success, available, online indicators
- Accent: `#FFD66B` (yellow) — warnings, premium shift badges
- Destructive: inherited red — errors, blocks, overtime alerts
- Skill colors: Bartender=blue, Line Cook=orange, Server=teal, Host=yellow

## Typography
- Inter: body, UI, data
- DM Sans: headings, display, sidebar labels

---

## Phase 1 — App Shell & Navigation
> Foundation. Everything else is built inside this.

**Files to create:**
1. `app/(dashboard)/layout.tsx` — sidebar + main content wrapper
2. `components/dashboard/sidebar.tsx` — collapsible sidebar, role-aware nav
3. `components/dashboard/header.tsx` — breadcrumb, notification bell, user menu
4. `components/dashboard/user-nav.tsx` — avatar, name, role pill, logout
5. `components/dashboard/notification-bell.tsx` — bell icon + unread count badge
6. `components/dashboard/location-selector.tsx` — dropdown for multi-location users
7. `app/(dashboard)/admin/dashboard/page.tsx` — placeholder
8. `app/(dashboard)/manager/dashboard/page.tsx` — placeholder
9. `app/(dashboard)/staff/dashboard/page.tsx` — placeholder

**Key behaviors:**
- Sidebar collapses to icons on `Cmd+B`
- Nav items change per role (Admin/Manager/Staff)
- Notification bell uses `useNotifications` hook (already built)
- Page transitions: fade-in + subtle translateY

---

## Phase 2 — Manager Schedule View
> The core product. Where managers spend 80% of their time.

**Files to create:**
1. `app/(dashboard)/manager/schedule/page.tsx` — main schedule page
2. `components/schedule/weekly-grid.tsx` — 7-day × time-slot grid
3. `components/schedule/shift-card.tsx` — colored card per shift
4. `components/schedule/shift-detail-panel.tsx` — right slide-out for shift details
5. `components/schedule/staff-assignment-row.tsx` — assignable staff list item
6. `components/schedule/constraint-feedback.tsx` — inline error/warning/suggestion
7. `components/schedule/week-navigator.tsx` — prev/next week controls
8. `components/schedule/create-shift-dialog.tsx` — new shift form
9. `components/schedule/publish-bar.tsx` — publish week action bar
10. `components/schedule/overtime-preview.tsx` — what-if hover tooltip

**Key behaviors:**
- Shift cards color-coded by skill
- Click shift → slide-out panel with staff list
- Assign staff → inline constraint check (block/warn/suggest)
- Real-time: another manager assigns same person → conflict toast
- Publish week → bulk publish + notifications

---

## Phase 3 — Staff Dashboard & Self-Service
> Where staff members manage their work life.

**Files to create:**
1. `app/(dashboard)/staff/schedule/page.tsx` — personal schedule
2. `app/(dashboard)/staff/availability/page.tsx` — availability editor
3. `app/(dashboard)/staff/swaps/page.tsx` — swap/drop requests
4. `components/staff/personal-calendar.tsx` — week view of own shifts
5. `components/staff/availability-grid.tsx` — toggle availability by day/time
6. `components/staff/swap-request-form.tsx` — pick colleague + request swap
7. `components/staff/drop-request-dialog.tsx` — drop shift confirmation
8. `components/staff/my-requests-list.tsx` — pending/completed swaps
9. `components/staff/available-shifts.tsx` — browse & pick up drops

**Key behaviors:**
- Availability drag-to-set time ranges
- Swap flow: select shift → choose qualified colleague → submit
- Status pills on requests (pending → approved/rejected)
- "Pick up" button on available drops

---

## Phase 4 — Admin Dashboard & Analytics
> Corporate oversight with data visualizations.

**Files to create:**
1. `app/(dashboard)/admin/dashboard/page.tsx` — KPI cards + on-duty grid (replace placeholder)
2. `app/(dashboard)/admin/people/page.tsx` — user management table
3. `app/(dashboard)/admin/analytics/page.tsx` — fairness & overtime charts
4. `app/(dashboard)/admin/audit/page.tsx` — audit log viewer
5. `components/admin/kpi-card.tsx` — stat card with icon + trend
6. `components/admin/on-duty-grid.tsx` — live who's-working-now per location
7. `components/admin/people-table.tsx` — searchable staff table
8. `components/admin/invite-dialog.tsx` — invite new user form
9. `components/admin/fairness-chart.tsx` — hours distribution bars
10. `components/admin/overtime-chart.tsx` — projected overtime visual
11. `components/admin/audit-table.tsx` — filterable log with expandable rows

**Key behaviors:**
- On-duty grid updates live via `useActiveShifts`
- Invite flow → `/api/auth/invite`
- Audit log expandable rows show before/after diff
- CSV export for audit data

---

## Phase 5 — Polish & Micro-interactions
> What makes it feel premium.

**Tasks:**
1. Page transition animations (fade-in + slide)
2. Skeleton loaders for every data section
3. Command palette (`Cmd+K`) — search staff, shifts, navigate
4. Keyboard shortcuts (`N` = new shift, `Esc` = close)
5. Notification bell shake animation on new notification
6. Shift card entrance animations
7. Empty state illustrations per section
8. Mobile responsive: sidebar → bottom tabs, dialogs → sheets
9. Optimistic updates on assignments
10. Error boundaries per section

---

## Missing API endpoints (build as needed)
- `GET /api/shifts/active` — for on-duty-now dashboard
- `GET/POST/PUT/DELETE /api/locations` — location management
- `GET/PUT /api/users` — user list + edit (admin)

## Build order
Phase 1 → 2 → 3 → 4 → 5 (each phase depends on the previous)
