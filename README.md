# Zoom Clone

A functional Zoom-style web app: a clean dashboard with **New Meeting / Join / Schedule** buttons, an "Upcoming + Recent" meetings feed, and a working in-browser meeting room with **WebRTC video**.

> **Note on the brief.** The original assignment asked for Next.js + FastAPI + SQLite. This project is built on a Lovable template that uses **TanStack Start + Lovable Cloud (Postgres + Auth + Realtime)**, which runs on a Cloudflare Worker runtime where Python cannot execute. The product surface, data model, and workflows are 1-to-1 with the brief; only the runtime is swapped. The stack mapping is in the table below.

## Stack

| Brief | This project | Why |
|---|---|---|
| Next.js SPA + Tailwind | **TanStack Start** (React 19 + Vite) + **Tailwind v4** | Same React + Tailwind authoring; works on the host runtime. |
| FastAPI + Pydantic | **TanStack `createServerFn`** with **Zod** validators | Typed RPC server functions, equivalent role to FastAPI endpoints. |
| SQLite + SQLAlchemy | **Lovable Cloud (managed Postgres)** with SQL migrations | Real DB, persists across deploys; SQLite files don't survive on a Worker. |
| Default seeded user | **Anonymous Supabase auth** + per-user seed trigger | Satisfies "assume a default user is logged in" with zero auth UI. |
| WebRTC (bonus) | **Browser RTCPeerConnection** + **Supabase Realtime** signaling | No separate signaling server needed. |

## Default user assumption

The assignment said *"Assume a default user is already logged in."* On first visit the app calls `supabase.auth.signInAnonymously()` so every visitor automatically has a Lovable Cloud session, RLS-scoped to their own data. A database trigger (`handle_new_user`) seeds **3 upcoming + 2 recent example meetings** for each new user so the dashboard is never empty. No login/signup screens; no shared "demo user" account.

## Database schema

Three tables in `public`, all RLS-enabled:

- **`profiles`** — `id (FK auth.users)`, `name`, `email`, `created_at`. One row per signed-in user, auto-created by the `on_auth_user_created` trigger. Maps to the brief's `User`.
- **`meetings`** — `id`, `meeting_code (TEXT, unique, 10-digit shareable code)`, `title`, `description`, `start_time`, `duration_minutes`, `host_id (FK auth.users)`, `is_instant (bool)`, `created_at`. Maps to `Meeting`.
- **`participants`** — `id`, `meeting_id (FK)`, `user_id (FK auth.users, nullable)`, `display_name`, `joined_at`, `left_at`. Maps to `Participant`. Added to `supabase_realtime` so the room can subscribe to live join/leave events.

**RLS summary** (plain English):
- Anyone signed in can **look up** a meeting by code (needed to validate a Join). Only the **host** can update or delete their own meetings.
- Anyone signed in can **read** profiles and participant rows (needed to label tiles in the room). Users can only update their own profile and only insert participant rows attached to themselves.

`SECURITY DEFINER` helpers (`handle_new_user`, `generate_meeting_code`) have `EXECUTE` revoked from `anon` and `authenticated`, so they can only fire via the auth trigger.

## API surface (server functions)

All defined in `src/lib/meetings.functions.ts`. Each requires an authenticated bearer token (the browser attaches it automatically).

| Function | Brief equivalent | Input | Output |
|---|---|---|---|
| `createInstantMeeting` | `POST /api/meetings/instant` | — | `{ meetingCode, id }` |
| `scheduleMeeting` | `POST /api/meetings/schedule` | `{ title, description, startTime, durationMinutes }` | Created meeting row |
| `joinMeeting` | `POST /api/meetings/join` | `{ codeOrUrl, displayName }` | `{ meetingCode, title }` |
| `getDashboard` | `GET /api/meetings/dashboard` | — | `{ upcoming: Meeting[], recent: Meeting[] }` |
| `getMeetingByCode` | (room page header) | `{ code }` | Meeting row |

## Frontend

- **`/`** — bootstraps anonymous session, redirects to `/dashboard`.
- **`/dashboard`** — Navbar + hero tiles (New Meeting / Join / Schedule / Share Screen) + Upcoming and Recent meeting cards. Responsive: 1-col mobile, 2-col tablet, 3-col desktop for cards; 2/4 columns for hero tiles.
- **`/room/$code`** — WebRTC meeting room with local video, remote video tiles, mic/cam toggles, copy invite, leave. Mesh topology suitable for small meetings (~4 participants); for larger calls you'd add an SFU.

Modals:
- **Join Meeting** — accepts a 10-digit code or any URL containing one; validates via `joinMeeting`.
- **Schedule Meeting** — title, description, datetime, duration; refreshes the Upcoming list on success.
- **New Meeting** — no modal; calls `createInstantMeeting` and redirects to the new room.

## Run locally

```bash
# Prereqs: bun (or npm)
bun install
bun run dev
```

The dev server prints a local URL (usually `http://localhost:8080`). All environment variables for Lovable Cloud are already wired up in `.env`; no manual setup required.

## Deploy

Use Lovable's **Publish** button — the project builds and deploys to a `*.lovable.app` URL with the database and auth already attached. Custom domains are supported.

## What's intentionally out of scope

- Recording, breakout rooms, in-meeting chat, screen-share streaming, SFU/large meetings.
- Full email/password and OAuth sign-up flows (anonymous sign-in covers the brief's assumption).
- Calendar invite emails.
