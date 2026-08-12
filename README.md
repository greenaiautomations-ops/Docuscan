# Docuscan — Document Management + AI Intelligence + Smart Calendar

Docuscan turns uploaded documents into structured, understandable, and
*actionable* information.

- **Phase 1** built the document-management foundation (auth, upload,
  storage, library, dashboard, scanner).
- **Phase 2** added OCR and AI document intelligence on top of it: automatic
  text extraction, classification, structured data extraction, summaries, a
  per-document AI chat, and translation.
- **Phase 3** turns that extracted information into deadlines, payments,
  appointments, reminders, notifications, and a real calendar — so
  Docuscan doesn't just read your documents, it tells you what to do about
  them and when.

Pipeline: **Upload → Storage → OCR → Language Detection → Classification →
AI Extraction → Summary → Database → Search / Chat / Translation → Events /
Payments → Reminders → Scheduled Notifications → Calendar**

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4, React Router 7
- Supabase: Postgres + Row Level Security, Auth, Storage, Edge Functions,
  scheduled jobs (`pg_cron` + `pg_net`)
- Google Gemini for OCR + AI (classification, extraction, summary,
  translation, chat) *and* embeddings — one free-tier API key, no credit
  card required, swappable behind a provider interface (an Anthropic Claude
  implementation ships too — see `supabase/functions/_shared/`)
- Deployed on Vercel, source on GitHub

## Project structure

```
src/
  components/     UI, grouped by feature: layout, documents, scan,
                   dashboard, analysis, chat, translation, events
                   (EventCard, PaymentCard, DeadlineCard, AppointmentCard,
                   NotificationCard, EventModal, PaymentModal,
                   ReminderSettings, EventTypeBadge), common
  pages/          Route-level views, incl. Phase 3: PaymentsPage,
                   DeadlinesPage, upgraded CalendarPage/NotificationsPage/
                   DashboardPage
  hooks/          Data-fetching + polling hooks (useAuth, useDocuments,
                   useDocumentProcessing, useDashboardStats, useEvents,
                   usePayments, useUnifiedNotifications,
                   useUnreadNotificationCount)
  services/       All Supabase reads/writes + Edge Function calls
                   (documents, storage, profile, tags, notifications,
                   upload, processing, chat, translation, events, payments,
                   reminders, notificationPreferences)
  contexts/       AuthContext (session, profile, sign in/up/out)
  lib/            Supabase client singleton
  types/          Database types + domain types (AI extraction shapes,
                   events/payments/reminders/notifications)
  utils/          Formatters, validation, constants (incl. event type
                   colors/labels, priority + payment status styles)
supabase/
  migrations/     SQL migrations (schema, RLS, storage; Phase 2 schema +
                   RLS; Phase 3 schema + RLS + scheduling extensions)
  functions/
    _shared/      Auth/service-role client helpers, Zod schemas, Gemini
                   provider (default) + Anthropic Claude provider (drop-in
                   alternative), date-parsing + priority-scoring helpers,
                   event/payment/reminder sync logic
    process-document/      OCR -> classification -> extraction -> summary
                            -> events/payments/reminders (Phase 3) pipeline
    chat-with-document/    Per-document Q&A grounded in OCR/analysis, no
                            hallucination
    translate-document/    Full/summary/selection translation into 5
                            languages
    process-reminders/     Scheduled (pg_cron), service-role function that
                            finds due reminders, creates notifications, and
                            marks reminders sent — never depends on the
                            browser being open
```

Business/database logic lives in `services/`, `hooks/`, and
`supabase/functions/` — never directly inside page or component files.

## Prerequisites

- Node.js 20+
- The Supabase CLI: `npm install -g supabase`
- A Supabase project (free tier is fine): https://supabase.com/dashboard
- A Gemini API key: https://aistudio.google.com/apikey — free, no credit card
  required (Flash models). Used for OCR, classification, extraction,
  summary, translation, chat, and embeddings.
  New Google AI Studio keys use an `AQ.`-prefixed "auth key" format; older
  `AIza`-prefixed "Standard keys" are being phased out. Either works with
  Docuscan as-is — just make sure you copy the *exact* key string from AI
  Studio (use its "Copy key" button rather than retyping it).

## 1. Clone & install

```bash
git clone <your-repo-url>
cd docuscan
npm install
```

## 2. Create the Supabase project

1. Create a new project at https://supabase.com/dashboard.
2. In **Settings → API**, copy the **Project URL** and **anon/public key**.
3. Copy `.env.example` to `.env` and fill in the two `VITE_` values:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   Never put the `service_role` key, or any AI/OCR provider secret, in this
   file or anywhere in frontend code — anything prefixed `VITE_` is bundled
   into the client. Provider keys only ever live in Edge Function secrets
   (step 5).

## 3. Run the database migrations

`supabase/migrations/` contains, in order:

- `0001_init_schema.sql` / `0002_rls_policies.sql` / `0003_storage.sql` —
  Phase 1: tables, indexes, triggers, RLS, the private `documents` storage
  bucket
- `0004_phase2_schema.sql` — enables `pgvector`; adds processing
  stage/error columns and full-text `search_vector` to `documents`; adds
  status/error columns to `document_ocr`; adds per-page confidence to
  `document_pages`; adds `document_chat_messages`, `document_translations`,
  `document_embeddings`
- `0005_phase2_rls.sql` — RLS for the three new Phase 2 tables
- `0006_phase3_schema.sql` — Phase 3: `events`, `payments`, `reminders`,
  `notification_preferences` (with an auto-create-on-signup trigger +
  backfill for existing users), `notification_events`; a deduplication
  unique index on `events (document_id, source_field)` so reprocessing a
  document never creates duplicate events
- `0007_phase3_rls.sql` — RLS for the five new Phase 3 tables (all simple
  `auth.uid() = user_id` ownership checks)
- `0008_scheduled_reminders_extensions.sql` — enables the `pg_cron` and
  `pg_net` extensions used to run `process-reminders` on a schedule (the
  actual `cron.schedule(...)` call is a manual step — see below — because
  it needs your project's own URL and a secret that must never be committed
  to git)

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

(Or paste each file, in order, into the Supabase dashboard's SQL Editor.)

## 4. Configure Auth

Email auth is enabled by default. For local development you can disable
"Confirm email" under **Authentication → Settings**; for production, keep
confirmation on and set Site URL / Redirect URLs under **Authentication →
URL Configuration** to your deployed domain.

Docuscan reads the user's timezone from `profiles.timezone` (defaults to
the browser's detected timezone at signup, editable on the **Settings**
page) — this is what `process-reminders` uses to decide what "today" means
for each user, so date-only deadlines never shift because of UTC math.

## 5. Deploy the Edge Functions + set secrets

```bash
supabase functions deploy process-document
supabase functions deploy chat-with-document
supabase functions deploy translate-document
supabase functions deploy process-reminders

supabase secrets set GEMINI_API_KEY=AQ....   # or AIza... for older keys
# optional override — the default is already gemini-flash-lite-latest:
supabase secrets set GEMINI_MODEL=gemini-flash-lite-latest
```

**About the model choice / "429 quota exceeded" errors:** Docuscan defaults
to `gemini-flash-lite-latest`, not the plain `-latest` Flash alias. Google
cut the full Flash model's free-tier quota hard in late 2025 (as low as
~20 requests/day in some configurations), which is easy to blow through in
a single testing session — Flash-Lite keeps a much higher free daily quota.
If you already deployed before this change, redeploy `process-document`,
`chat-with-document`, and `translate-document` to pick up the new default
(or just set `GEMINI_MODEL` explicitly as shown above). The Edge Functions
also now parse Gemini's suggested retry delay out of 429 responses and wait
that long before retrying automatically, and the UI shows a plain-language
"AI usage limit reached, try again shortly" message instead of the raw
error JSON.

`process-document`, `chat-with-document`, and `translate-document`
authenticate using the caller's own Supabase session (the frontend forwards
it automatically via `supabase.functions.invoke`), so they read/write the
database under the same RLS policies as the browser client.

`process-reminders` is different: it's never called from the browser. It
runs on a schedule under the **service_role**, and independently verifies
the `role: 'service_role'` claim in its own JWT payload (defense-in-depth
beyond the platform gateway's default signature check) before touching the
database — so a leaked anon key can never trigger it.

## 6. Set up scheduled reminders (Phase 3)

`process-reminders` needs to run periodically (every 15–60 minutes is
plenty) so reminders and notifications work without anyone having the app
open. Pick one:

**Option A — Supabase Dashboard (simplest):**
Go to **Database → Cron Jobs** in the Supabase dashboard, create a new job
that calls the `process-reminders` Edge Function URL
(`https://<project-ref>.functions.supabase.co/process-reminders`) with an
`Authorization: Bearer <service_role_key>` header, on a schedule like
`*/30 * * * *`.

**Option B — SQL via `pg_cron` + Vault:**

```sql
-- One-time: store the service role key in Vault instead of inline SQL.
select vault.create_secret('your-service-role-key', 'service_role_key');

select cron.schedule(
  'process-reminders-every-30-min',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/process-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

This step is project-specific (it needs your project ref and service role
key) and is intentionally **not** included in a migration file, so it's
never committed to git.

## 7. Run locally

```bash
npm run dev
```

Sign up, upload a document, and watch it move through
`uploaded → processing → analyzed → completed` on the Documents page and in
the document viewer — then check the **Calendar**, **Deadlines**, and
**Payments** pages for anything the AI detected.

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
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under Project
   Settings → Environment Variables. (Edge Function secrets and the cron
   schedule are configured in Supabase, not Vercel — see steps 5–6 above.)
4. Deploy. Build command `npm run build`, output directory `dist`.
5. In Supabase, add your Vercel domain to **Authentication → URL
   Configuration → Redirect URLs**.

## Testing the full Phase 1 → 2 → 3 flow

1. Sign in, go to **Upload**, upload a PDF or image (try a bill/invoice with
   a due date, or a letter with a deadline/appointment).
2. The document row moves `uploading → uploaded`, then the Edge Function
   takes over: `processing` (stages: Reading… → Extracting text… →
   Understanding… → Finding important information… → Creating summary… →
   Finding dates and payments…) → `analyzed` → `completed`. The Documents
   list and the viewer poll and update live.
3. Open the document. In order: file preview, AI Summary, Document Type,
   Important Information, Dates, Payments, Required Action, then a
   **"Dates, payments & tasks"** section showing any events/payments the AI
   detected — each linking to its own record — and finally the raw
   Extracted Data JSON.
4. If a detected event has low confidence, its status is `needs_review` and
   opening it shows **"Possible \<type\> detected — please verify"** with
   **Confirm / Edit & Confirm / Ignore** — nothing uncertain is ever shown
   as authoritative without you confirming it.
5. Go to **Calendar** — the event appears on its date, color-coded by type
   (🔴 deadline, 🟠 payment, 🔵 appointment, 🟣 renewal/expiration, 🟢
   completed). Switch between Month/Week/Day/Agenda views. Click it to open
   details, then **"Open source document"** to jump back to step 3.
6. Go to **Deadlines** — see it bucketed into Overdue/Today/This
   week/Upcoming/Completed with a priority badge. Try **Complete**, **Snooze**
   (+1/+3/+7 days or a custom date), and **Edit**.
7. If the document had a payment, go to **Payments** — see it in the right
   bucket (Upcoming/Overdue/Paid/Unknown) with the total upcoming amount at
   the top. Try **Mark paid**.
8. Once `process-reminders` is scheduled (step 6 above) and a reminder's
   date arrives, a row appears in `notification_events`. Check
   **Notifications** — unread badge on the sidebar nav, mark read/all read,
   click a notification to jump straight to the event or document.
9. Go to **Settings** and toggle a reminder default (7/3/1 days/same day)
   off — reminders of that type stop being created for new events; existing
   ones you've customized per-event are untouched.
10. **Edit an event's date manually**, then trigger **Retry Processing** on
    its source document. Your manual edit survives — `is_user_edited` is set
    on every user-initiated write, and the sync logic skips re-applying AI
    values to any event/payment where that flag is `true` (also skips
    anything already `dismissed` or `completed`).
11. Search: on Documents, search by title/OCR text/type/issuer; on
    Deadlines/Payments/Calendar, filter by type, status, priority, or date
    range; on Payments, search recipient/reference number.

## What's implemented

**Phase 1 + 2:** Auth, protected routes, profiles, document
upload/storage/library/viewer, dashboard, camera scanner; server-side OCR
(PDF, JPG/JPEG, PNG, WEBP, multi-page PDFs); a provider-independent AI
service abstraction backed by Google Gemini (Anthropic Claude drop-in
available) with Zod-validated structured output and automatic retry;
15-type document classification + language detection; structured entity
extraction with per-field confidence that never invents missing data; a
7-question AI summary separating fact from interpretation; Explain /
Translate / Ask AI / Edit Information / Retry Processing actions;
per-document AI chat with persisted, grounded, non-hallucinating history;
full/summary/selection translation into 5 languages; full-text search; a
pgvector-backed `document_embeddings` table.

**Phase 3:** Automatic, deduplicated creation of events (deadlines,
appointments, payment-due dates, renewals, expirations, tasks) and payments
from AI-extracted document data, every one linked back to its source
document; human confirmation flow (Confirm/Edit/Ignore) for low-confidence
or high-impact detections; a Payments page with bucketed views, totals, and
Mark Paid/Edit/Ignore/Open Document actions (recurring fields supported,
future payments never auto-generated); a Deadlines/Tasks page with
Overdue/Today/This week/Upcoming/Completed buckets, rule-based priority
(Critical/High/Medium/Low — proximity, amount, overdue status, confidence,
required-action, never AI-arbitrary), and Complete/Edit/Snooze/Open
Document actions; a functional Month/Week/Day/Agenda calendar over real
Supabase data with a color-coded legend, click-through to details and the
source document, and manual event creation; per-event and global reminder
customization (7/3/1 days/same-day, no duplicate reminders — enforced by a
unique `(event_id, reminder_type)` index); a scheduled, service-role Edge
Function (`process-reminders`, run via `pg_cron`/`pg_net`) that finds due
reminders and creates notifications without any browser needing to be
open; a merged Notification Center (Phase 1 document notifications + Phase
3 event/reminder notifications) with unread/read filtering, mark-read/
mark-all-read, a live sidebar badge, and click-through to the relevant
event or document; an upgraded Dashboard with Today / Upcoming (7 days) /
Action Required / Payments / Documents / Notifications sections built
entirely from real data; two-way document ↔ event/payment linking; manual
overrides on every editable field, permanently protected from being
overwritten by future AI reprocessing via an `is_user_edited` flag; and
full RLS parity — a user can never read, edit, or delete another user's
events, payments, reminders, or notifications.

## What's intentionally NOT in Phase 3

Google/Outlook Calendar sync, email ingestion, WhatsApp/Telegram
notifications, family/shared accounts, mobile apps, advanced financial
analytics, and automatic bank connections. Those are future phases.
