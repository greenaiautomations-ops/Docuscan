# Docuscan — Phase 1: Document Management MVP

A functional MVP for an AI-powered document management app. Phase 1 covers
authentication, document upload/storage, a document library, a basic camera
scanner, and a dashboard — all backed by Supabase (Postgres + RLS + Storage +
Auth). AI/OCR features are intentionally out of scope for this phase; the UI
has placeholders ready for Phase 2 to fill in.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- React Router 7
- Supabase (Postgres, Row Level Security, Auth, Storage)
- Deployed on Vercel, source on GitHub

## Project structure

```
src/
  components/   Reusable UI, grouped by feature (layout, documents, scan, dashboard, common)
  pages/        Route-level views
  hooks/        Data-fetching hooks (useAuth, useDocuments, useDashboardStats, useNotifications)
  services/     All Supabase reads/writes (documents, storage, profile, tags, notifications, upload)
  contexts/     AuthContext (session, profile, sign in/up/out)
  lib/          Supabase client singleton
  types/        Database types + domain types
  utils/        Formatters, validation, constants
supabase/
  migrations/   SQL migrations (schema, RLS policies, storage bucket + policies)
```

Business/database logic lives in `services/` and `hooks/` — never directly
inside page or component files.

## Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine): https://supabase.com/dashboard
- The Supabase CLI (optional but recommended): `npm install -g supabase`

## 1. Clone & install

```bash
git clone <your-repo-url>
cd docuscan
rm -rf node_modules package-lock.json   # only needed once, see note below
npm install
```

> Note: if you received this project via an automated setup, an earlier
> partial install may have left a stray `node_modules` folder. Deleting it
> once and reinstalling avoids odd `ENOTEMPTY` npm errors.

## 2. Create the Supabase project

1. Create a new project at https://supabase.com/dashboard.
2. In **Settings → API**, copy the **Project URL** and **anon/public key**.
3. Copy `.env.example` to `.env` and fill both values in:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Never put the `service_role` key, or any AI/OCR provider secret, in this
   file or anywhere in frontend code — those only ever belong in Supabase
   Edge Function secrets (Phase 2).

## 3. Run the database migrations

The SQL in `supabase/migrations/` creates every table, index, trigger, RLS
policy, and the storage bucket, in order:

- `0001_init_schema.sql` — tables, indexes, triggers, auto-profile-on-signup
- `0002_rls_policies.sql` — Row Level Security policies (every user-owned
  table is locked to its owner)
- `0003_storage.sql` — the private `documents` storage bucket + owner-only
  storage policies

**Option A — Supabase CLI (recommended):**

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

**Option B — SQL editor:** open each file in `supabase/migrations/` in order
and run its contents in the Supabase dashboard's SQL Editor.

## 4. Configure Auth

In **Authentication → Providers**, Email is enabled by default. For local
development you can disable "Confirm email" under **Authentication →
Settings** so you can sign in immediately after signing up; for production,
leave confirmation on and set your Site URL / Redirect URLs under
**Authentication → URL Configuration** to your deployed domain.

## 5. Run locally

```bash
npm run dev
```

Visit the printed local URL, sign up, and you're in.

## Available scripts

```bash
npm run dev       # start the dev server
npm run build     # type-check (tsc -b) and build for production
npm run preview   # preview the production build locally
npm run lint       # run oxlint
```

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, "Add New Project" → import the repo. Framework preset: Vite.
3. Add the two environment variables from `.env` (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) under Project Settings → Environment Variables.
4. Deploy. Build command `npm run build`, output directory `dist` (Vercel's
   Vite preset sets these automatically).
5. Back in Supabase, add your Vercel domain to **Authentication → URL
   Configuration → Redirect URLs**.

## What's implemented (Phase 1)

- Email/password sign up, sign in, sign out; persisted sessions; protected
  routes; a profile row auto-created on signup (`profiles` table)
- Document upload (PDF/JPG/JPEG/PNG/WEBP, 25MB limit) with status tracking
  (`uploading` → `processing` → `completed`/`failed`) and retry on failure
- Documents library: search, filters (category, status, important, archived),
  rename, delete, archive/unarchive, mark important, open
- Document viewer: signed-URL preview/download, file info panel, and clearly
  labeled placeholder sections for AI Summary, Translation, Important Dates,
  Payments, Appointments, and AI Chat (Phase 2)
- Dashboard: total documents, recently added, important documents, documents
  needing action (failed uploads), recent notifications — all live Supabase
  queries
- Basic browser camera scanner: permission request, capture, preview, retake,
  and hand-off into the same upload pipeline
- Calendar, Notifications, and Settings pages are fully functional shells:
  Notifications reads/writes real `notifications` rows; Settings edits the
  real `profiles` row; Calendar is a working month view with an extension
  point for Phase 2's date extraction
- RLS enabled on every user-owned table; a private Storage bucket with
  owner-only policies keyed off the `{user_id}/...` path prefix

## What's intentionally NOT in Phase 1

AI/OCR processing, translation, payment/appointment extraction, calendar
intelligence, and AI chat. The document viewer and calendar have placeholder
UI and the schema (`document_ocr`, `document_analysis`) already has room for
Phase 2 to plug into without further schema changes.
