# live-demo.race-controller

Mobile web "controller" for **Live Race**. Visitors scan a QR code, land on
`/`, optionally type a name, and mash a big button to accelerate their
vehicle on the booth dashboard.

- `/` — the tap controller (the page visitors actually use)
- `/qr` — booth-operator page that renders a QR code pointing at this app's
  own URL; print it or show it next to the dashboard screen

Built with Next.js (App Router) + Tailwind, deployed to Vercel.

## How it works

1. On load, `/` generates a fresh `session_id` (`crypto.randomUUID()`) and
   stores it in `sessionStorage`, unless one was passed as `?session_id=...`.
2. Every tap fires `POST {NEXT_PUBLIC_INGEST_API_URL}/tap` with:
   ```json
   { "session_id": "...", "player_name": "...", "event_type": "tap", "client_ts": "..." }
   ```
3. Requests are fire-and-forget — the UI never blocks on the response, and
   both network errors and rate-limit (`429`) responses are ignored
   silently by design (see `race-backend`'s ingest-api). The button gives a
   short scale/color pulse per tap regardless of server response, so it
   stays responsive under rapid tapping.

See [`PROTOCOL.md`](https://github.com/condense-demos/live-demo.race-backend/blob/main/PROTOCOL.md)
in `race-backend` for the full event contract.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_INGEST_API_URL
npm run dev
```

Open `http://localhost:3000` on your phone (same network) or in a mobile
viewport in devtools.

## Env vars

Only `.env.example` is committed — see the root-level convention notes in
`race-backend`'s README for why. Copy it to `.env.local` (Next.js's
convention for local-only env files) for local dev, and set the same
variable in Vercel's Project Settings for deployed environments.

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_INGEST_API_URL` | Base URL of the deployed `ingest-api` service (no trailing slash) |

## Deploying

Deploy this repo directly to Vercel (framework preset: Next.js). Set
`NEXT_PUBLIC_INGEST_API_URL` to the public URL of the `ingest-api` Condense
deployment before the first build that needs to actually send taps.

## Assumption flagged

Framework choice (Next.js) was picked to match the `NEXT_PUBLIC_*` env var
naming convention given in the brief — if your existing stack conventions
actually use a different React setup (plain Vite, CRA, etc.), the env var
prefix and a couple of Next-specific files (`app/layout.js`, `next.config.js`)
are the only Next-specific pieces; the rest of the component logic ports
directly.
