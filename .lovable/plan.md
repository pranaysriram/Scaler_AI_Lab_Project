# Zoom Clone — Implementation Plan

A functional Zoom-style web app built on this project's actual stack. Same product goals as your brief (dashboard, instant/join/schedule flows, meeting room with video), adapted so it runs end-to-end in the Lovable preview and deploys with one click.

## Stack mapping (your brief → this project)

| Your brief | What we'll use | Why |
|---|---|---|
| Next.js SPA + Tailwind | TanStack Start (React 19 + Vite) + Tailwind v4 | Project's framework; same React + Tailwind authoring experience |
| FastAPI + Pydantic | TanStack `createServerFn` (TypeScript) | Runs on the project's Cloudflare Worker runtime; same RPC role |
| SQLite + SQLAlchemy | Lovable Cloud (managed Postgres) with migration + RLS | Real DB, persists across deploys, no SQLite file on a Worker |
| Default seeded user | Lovable Cloud auth with anonymous sign-in on first load | Satisfies "assume logged in" without a login UI |
| WebRTC bonus | Browser WebRTC + Supabase Realtime channel for signaling | No separate Python WS server needed |

I'll deliver the same artifacts you asked for (schema doc, API doc, README with setup) as part of the project.

## Database schema (migration)

Three tables in `public`, with RLS + GRANTs:

- `profiles` — `id (uuid, FK auth.users)`, `name`, `email`, `created_at`. Auto-populated on signup via trigger. (Maps to your `User`.)
- `meetings` — `id (uuid)`, `meeting_code (text, unique, short shareable code)`, `title`, `description`, `start_time (timestamptz, null for instant)`, `duration_minutes (int)`, `host_id (uuid, FK profiles)`, `is_instant (bool)`, `created_at`.
- `participants` — `id (uuid)`, `meeting_id (FK)`, `display_name`, `user_id (nullable)`, `joined_at`, `left_at (nullable)`.

RLS:
- `meetings`: host can CRUD own rows; anyone authenticated can SELECT by `meeting_code` (needed for join validation).
- `participants`: insert allowed for any auth'd user joining a meeting that exists; select scoped to host + self.
- `profiles`: select self; select minimal fields of any host whose meeting you're joining.

Seed data: a migration inserts 3 upcoming + 2 recent mock meetings tied to a fixed demo profile, plus a trigger that on first anonymous sign-in copies those meetings to the new user so the dashboard is never empty.

## Server functions (replaces FastAPI routes)

In `src/lib/meetings.functions.ts`, all using `requireSupabaseAuth`:

- `createInstantMeeting()` → inserts `is_instant=true`, returns `{ meetingCode, joinUrl }`. Frontend redirects to `/room/$code`.
- `scheduleMeeting({ title, description, startTime, durationMinutes })` → Zod-validated insert, returns the new meeting.
- `joinMeeting({ codeOrUrl, displayName })` → parses code from raw input or URL, validates the meeting exists, inserts a `participants` row, returns `{ meetingCode }`.
- `getDashboard()` → returns `{ upcoming, recent }` for the current user (upcoming = `start_time >= now()` or instant-not-ended; recent = past 7 days).
- `getMeetingByCode({ code })` → loads meeting + host name for the room page.

## Frontend routes

```text
src/routes/
  __root.tsx              shell + onAuthStateChange + anon-signin bootstrap
  index.tsx               redirects to /dashboard if signed in
  _authenticated/
    route.tsx             integration-managed auth gate (already exists)
    dashboard.tsx         Navbar + hero buttons + Upcoming/Recent lists
    room.$code.tsx        WebRTC meeting room
```

### Dashboard (`/dashboard`)
- **Navbar**: Zoom-style — logo left, nav center, profile avatar dropdown right (profile/settings placeholders).
- **Hero**: 3 large square tile buttons — New Meeting (orange), Join (blue), Schedule (blue outline), Share Screen placeholder. Matches Zoom web client layout.
- **Two sections** below: "Upcoming meetings" and "Recent meetings", each as cards showing title, time, code, copy-link button, and Start/Join button. Empty states included.
- Fully responsive: 1-col mobile, 2-col tablet, 4-col desktop for tiles; stacked → grid for meeting cards.

### Modals
- **Join modal**: Meeting ID/link input + display name input → calls `joinMeeting` → on success `navigate({ to: '/room/$code', params: { code } })`. Inline error on invalid code.
- **Schedule modal**: shadcn form with title, description, date/time picker, duration select (15/30/45/60/90 min) → calls `scheduleMeeting` → invalidates dashboard query and closes.
- **New Meeting**: no modal — directly calls `createInstantMeeting` then navigates to the room.

### Meeting room (`/room/$code`)
- Loader uses `ensureQueryData(getMeetingByCode)` so the room title shows immediately.
- Local video tile via `getUserMedia({ video, audio })`.
- Remote tiles via WebRTC `RTCPeerConnection`; signaling over Supabase Realtime channel named after the meeting code (offer/answer/ice exchange).
- Controls bar: mic toggle, camera toggle, copy invite link, leave (returns to dashboard and updates `participants.left_at`).
- Right-side participant list reading `participants` rows with a realtime subscription.
- Graceful fallback when mic/camera permission denied (shows avatar tiles).

## Design

Zoom-accurate: white surface, Zoom-blue primary (`oklch` equivalent of #2D8CFF), neutral grays, rounded-2xl cards, soft shadows, Inter font loaded via `<link>` in `__root.tsx`. All colors as semantic tokens in `src/styles.css` — no hardcoded hex in components.

## Out of scope (call it out clearly)

- Real auth UI (using anonymous sign-in to honor your "assume logged in" assumption).
- Recording, breakout rooms, chat, screen share streaming, large-room SFU (mesh WebRTC works for ~4 participants; mentioned in README).
- Calendar invites / email.

## Documentation

`README.md` at project root with:
- Tech stack used and why each piece (mapping table above).
- DB schema explanation + RLS rationale.
- "Default user" assumption: anonymous Lovable Cloud session created on first visit; seeded meetings are attached to it so the dashboard always has content.
- Local dev commands (`bun install`, `bun run dev`), env vars, deploy via Lovable Publish.
- API surface (server functions) documented with input/output shapes — the equivalent of your FastAPI endpoint list.

## Build order

1. Enable Lovable Cloud (provisions DB + auth).
2. Migration: tables, RLS, GRANTs, seed function, trigger to attach seeds to new anon users.
3. `meetings.functions.ts` with all 5 server functions + Zod validators.
4. Tailwind theme tokens (Zoom palette) + Inter font link.
5. Dashboard route + Navbar + hero tiles + meeting cards + 3 modals.
6. `/room/$code` route with local media + WebRTC signaling over Realtime.
7. README + verify with Playwright (load dashboard, click New Meeting, land in room).

Approve this and I'll switch to build mode and ship it.
