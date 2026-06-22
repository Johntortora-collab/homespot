# Homespot

A community loyalty app for local businesses — consumer app, owner dashboard, business onboarding,
real QR scanning, evolving mascot characters, and Supabase backend, all wired together.

---

## What's in this build

- **Consumer app** — town select, signup/signin, spot directory, evolving mascot Spot Cards,
  real camera QR scanning, Local Perks, The Block (town activity feed), profile
- **Owner dashboard** — live visit ticker, customer table, send offers, feedback inbox,
  real downloadable/printable QR codes
- **Business onboarding** — landing page, account creation, spot setup with live preview,
  loyalty card configuration
- **Mascot system** — each customer gets a character per spot that evolves over 8 visits,
  auto-generated based on business category (no design work needed from owners)
- **One-scan-per-day limit** — enforced at the database level, can't be bypassed by the UI
- **Responsive design** — works full-screen on real phones, contained preview on desktop
- **Error boundary** — a bad render shows a friendly recovery screen instead of blanking the app
- **Legal pages** — basic Terms of Service and Privacy Policy at `/terms` and `/privacy`
- **Email confirmation handling** — proper "check your email" screens instead of silent failures

---

## Quick start (local development)

### 1. Install

```bash
cd homespot
npm install
```

### 2. Create a Supabase project

1. Go to supabase.com → create a free account → new project
2. Wait ~60 seconds for it to provision

### 3. Run the database schema

In Supabase → SQL Editor:

1. Open `supabase/migrations/001_schema.sql`, paste the whole thing, click Run
2. That's it for a fresh setup — this file already includes the one-scan-per-day limit.
   (`002_one_scan_per_day.sql` only matters if you built your database before this
   feature existed — skip it on a new setup.)

### 4. Set environment variables

```bash
cp .env.example .env.local
```

Fill in from Supabase → Settings → API → Legacy anon, service_role API keys tab:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Use the legacy anon key (starts with eyJ...) — the newer sb_publishable_... key
format isn't compatible with the current @supabase/supabase-js version pinned here.

### 5. Configure auth redirect URLs

In Supabase → Authentication → URL Configuration:
- Site URL: http://localhost:5173 (update this to your real domain once deployed)
- Redirect URLs: add http://localhost:5173/**

### 6. (Optional) Google sign-in

Supabase → Authentication → Providers → Google → enable and add your OAuth credentials.

### 7. Run it

```bash
npm run dev
```

Open http://localhost:5173

---

## Going live — deployment checklist

### A. Email confirmation

For real users, leave email confirmation ON (Supabase → Authentication → Providers → Email).
This was disabled during early local testing — turn it back on before launch so accounts are
verified. The app already shows a proper "check your email" screen for both consumer and owner
signups.

### B. Deploy hosting

This is a static Vite app — deploys cleanly to Vercel, Netlify, or similar.

Vercel:
```bash
npm install -g vercel
vercel
```
The included vercel.json handles SPA routing so refreshing on a deep link like /scan/abc123
doesn't 404.

Add your environment variables in the Vercel dashboard under Settings → Environment Variables
(same two VITE_SUPABASE_* values from .env.local).

### C. Update Supabase URLs for production

Once deployed, go back to Supabase → Authentication → URL Configuration and update:
- Site URL → your real domain (e.g. https://gethomespot.app)
- Redirect URLs → add https://gethomespot.app/**

### D. QR codes now point to your real domain automatically

QR codes encode {your-current-origin}/scan/{spotId} — so once deployed, newly generated QR
codes automatically point to your production domain. Any QR codes downloaded before deployment
(pointing to localhost) should be re-downloaded from the dashboard after going live.

### E. Legal pages

/terms and /privacy are basic but real — read through them and adjust business specifics
(contact emails, jurisdiction, etc.) before launch. They're linked from both signup flows already.

---

## How real QR scanning works

- Owner side: the QR Code page (OwnerDashboard.jsx → QRPage) generates a real, scannable
  QR code using the qrcode library, rendered to a canvas. It encodes a URL shaped like
  https://yourdomain.com/scan/{spotId}. The Download button exports a high-resolution PNG
  suitable for printing.

- Consumer side: tapping the center scan nav button or the "Scan Spot QR" button inside a spot
  page opens QRScanner.jsx, which requests camera access and decodes QR codes in real time using
  jsqr. Once decoded, it extracts the spot ID and either:
  - Verifies it matches the spot you're currently viewing (in-page scan), or
  - Looks up and navigates to that spot (bottom-nav scan)

- Deep linking: if someone scans the printed QR with their phone's native camera app
  (not inside Homespot), the URL pattern /scan/:spotId is a real route — it opens the app and
  jumps straight to that spot once signed in.

- Anti-abuse: scanning is capped at once per user per spot per day, enforced by a unique
  database index — this can't be bypassed by spamming the button or screenshotting a QR code.

---

## How the mascot system works

No new database table — purely a rendering layer on top of existing data:

- src/lib/mascotEngine.js maps a spot's category to a body shape, color palette, and themed
  accessory list. The mascot name is deterministically generated from the spot ID, so it's
  consistent every time (not random on each render).
- src/components/Mascot.jsx is the pure SVG renderer — takes the mascot config + current
  stamps count, and draws the appropriate layers (body → outfit → accessory → expression →
  detail → badge → name tag → celebration).
- The unlock reveal modal in ConsumerApp.jsx triggers after a successful scan, showing exactly
  what changed.

To add a new business category, add an entry to the ARCHETYPES object in mascotEngine.js —
no other code changes needed.

---

## Project structure

```
homespot/
├── src/
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── AuthContext.jsx
│   │   ├── hooks.js
│   │   └── mascotEngine.js
│   ├── components/
│   │   ├── Mascot.jsx
│   │   ├── QRScanner.jsx
│   │   └── ErrorBoundary.jsx
│   ├── pages/
│   │   ├── consumer/
│   │   │   └── ConsumerApp.jsx
│   │   ├── owner/
│   │   │   ├── OwnerOnboarding.jsx
│   │   │   └── OwnerDashboard.jsx
│   │   ├── Terms.jsx
│   │   └── Privacy.jsx
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── migrations/
│       ├── 001_schema.sql
│       └── 002_one_scan_per_day.sql
├── index.html
├── vite.config.js
├── vercel.json
├── package.json
└── .env.example
```

---

## Database tables

| Table | Purpose |
|---|---|
| profiles | Linked to auth.users — role (consumer/owner), avatar, town |
| towns | Available towns with active flag |
| spots | Business listings owned by an owner |
| stamp_cards | One per user per spot — tracks current + lifetime stamps |
| visits | Each QR scan creates a row — unique per user/spot/day |
| offers | Offers sent by owners |
| feedback | Customer mood + note after a visit |

### Views
- spots_with_stamps — spots + current user's stamp count (used in consumer app)
- spot_customer_stats — visit/stamp aggregates per customer per spot (used in owner dashboard)

---

## Known limitations / next steps

- Push notifications (Supabase Edge Functions + a mobile wrapper)
- Native iOS/Android wrapper (Expo) — currently a responsive web app
- Email notifications for offers (Resend + Supabase Edge Functions)
- Admin panel for managing towns and moderating listings
- Stripe integration for paid owner plans
- A real npm run build has not been executed in this development environment due to sandboxed
  network restrictions — all files pass static syntax validation (esbuild), but run a local
  build before deploying to catch anything a syntax check can't:
  ```bash
  npm run build
  npm run preview
  ```
