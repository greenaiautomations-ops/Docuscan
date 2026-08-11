# Docuscan — Document Management + AI Intelligence

Docuscan turns uploaded documents into structured, understandable information.
Phase 1 built the document-management foundation (auth, upload, storage,
library, dashboard, scanner). Phase 2 adds OCR and AI document intelligence
on top of it: automatic text extraction, classification, structured data
extraction, summaries, a per-document AI chat, and translation.

Pipeline: **Upload → Storage → OCR → Language Detection → Classification →
AI Extraction → Summary → Database → Search / Chat / Translation**

## Stack

- React 19 + TypeScript + Vite, Tailwind CSS v4, React Router 7
- Supabase: Postgres + Row Level Security, Auth, Storage, Edge Functions
- Google Gemini for OCR + AI (classification, extraction, summary,
  translation, chat) *and* embeddings — one free-tier API key, no credit
  card required, swappable behind a provider interface (an Anthropic Claude
  implementation ships too — see `supabase/functions/_shared/`)
- Deployed on Vercel, source on GitHub

## Project structure

```
src/
  components/     UI, grouped by feature (layout, documents, scan, dashboard,
                   analysis, chat, translation, common)
  pages/          Route-level views
  hooks/          Data-fetching + polling hooks (useAuth, useDocuments,
                   useDocumentProcessing, useDashboardStats, useNotifications)
  services/       All Supabase reads/writes + Edge Function calls
                   (documents, storage, profile, tags, notifications, upload,
                   processing, chat, translation)
  contexts/       AuthContext (session, profile, sign in/up/out)
  lib/            Supabase client singleton
  types/          Database types + domain types (incl. AI extraction shapes)
  utils/          Formatters, validation, constants
supabase/
  migrations/     SQL migrations (schema, RLS, storage, Phase 2 schema + RLS)
  functions/
    _shared/      Auth client helper, Zod schemas, Gemini provider (default) +
                   Anthropic Claude provider (drop-in alternative)
    process-document/      OCR -> classification -> extraction -> summary pipeline
    chat-with-document/    Per-document Q&A grounded in OCR/analysis, no hallucination
    translate-document/    Full/summary/selection translation into 5 languages
```

Business/database logic lives in `services/`, `hooks/`, and
`supabase/functions/` — never directly inside page or component files.

## Prerequisites

- Node.js 20+
- The Supabase CLI: `npm install -g supabase`
- A Supabase project (free tier is fine): https://supabase.com/dashboard
- A Gemini API key: https://aistudio.google.com/apikey — free, no credit card
  required (Flash models). Used for OCR, classification, extraction, summary,
  translation, chat, and embeddings. Embeddings are best-effort groundwork for
  Phase 3 semantic search and are silently skipped if processing hits a quota
  limit — everything else still works.

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

## 5. Deploy the Edge Functions + set secrets

```bash
supabase functions deploy process-document
supabase functions deploy chat-with-document
supabase functions deploy translate-document

supabase secrets set GEMINI_API_KEY=AIza...
# optional override:
supabase secrets set GEMINI_MODEL=gemini-flash-latest
```

The functions authenticate using the caller's own Supabase session (the
frontend forwards it automatically via `supabase.functions.invoke`), so they
read/write the database under the same RLS policies as the browser client —
no service-role key is needed or used.

## 6. Run locally

```bash
npm run dev
```

Sign up, upload a document, and watch it move through
`uploaded → processing → analyzed → completed` on the Documents page and in
the document viewer.

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
   Settings → Environment Variables. (Edge Function secrets are configured
   in Supabase, not Vercel — see step 5 above.)
4. Deploy. Build command `npm run build`, output directory `dist`.
5. In Supabase, add your Vercel domain to **Authentication → URL
   Configuration → Redirect URLs**.

## Testing the full Phase 2 flow

1. Sign in, go to **Upload**, upload a PDF or image.
2. The document row moves `uploading → uploaded`, then the Edge Function
   takes over: `processing` (stages: Reading… → Extracting text… →
   Understanding… → Finding important information… → Creating summary…) →
   `analyzed` → `completed`. The Documents list and the viewer poll and
   update live — no manual refresh needed.
3. Open the document. You'll see, in order: the file preview, AI Summary,
   Document Type, Important Information, Dates, Payments, Required Action,
   and a collapsible raw Extracted Data JSON block.
4. Try **Explain** (asks the AI chat to summarize in plain language),
   **Ask AI** (open-ended Q&A grounded only in this document — try "When is
   the deadline?" or "How much do I need to pay?"), **Translate** (full
   text, summary, or pasted excerpt, into English/German/Spanish/Chinese/
   Russian), and **Edit Information** (correct any AI-extracted field).
5. Search for the document from the Documents page by title, by a phrase
   from its OCR text, by its detected type, or by its issuer — all are
   indexed in `documents.search_vector`.
6. To see retry handling, temporarily remove `GEMINI_API_KEY` from your
   Edge Function secrets, upload a document (it will land on `failed` with
   an error message), restore the key, and click **Retry Processing**.

## What's implemented (Phase 1 + Phase 2)

Auth, protected routes, profiles, document upload/storage/library/viewer,
dashboard, camera scanner, and Calendar/Notifications/Settings shells
(Phase 1) — plus, in Phase 2: server-side OCR (PDF, JPG/JPEG, PNG, WEBP,
multi-page PDFs) via a Supabase Edge Function; a provider-independent AI
service abstraction (`analyzeDocument`-style functions: OCR, classify,
extract, summarize, translate, answer questions, generate embeddings),
backed by Google Gemini by default (an Anthropic Claude implementation of
the same interface ships alongside it) with Zod-validated structured output
and automatic one-shot retry on invalid AI JSON; automatic document type classification (15 types) and language
detection; structured entity extraction with per-field confidence scores
that never invents missing data; a 7-question AI summary that separates
extracted fact from AI interpretation; an upgraded document viewer with
Explain / Translate / Ask AI / Edit Information / Retry Processing actions;
per-document AI chat with persisted history that refuses to hallucinate;
full/summary/selection translation into 5 languages, stored separately from
the original OCR text; full-text document search across title, OCR text,
document type, issuer, and tags; a pgvector-backed `document_embeddings`
table (embeddings generated best-effort via Gemini) as groundwork for
Phase 3 semantic search — without building out RAG yet; and RLS on every new
table, so a user can never read another user's OCR, analysis, translations,
or chat.

## What's intentionally NOT in Phase 2

Advanced calendar intelligence, payment tracking, appointment management,
automated reminders, an advanced notification system, family/shared
accounts, email integration, and advanced animations. Those belong to
Phase 3, along with turning the embeddings groundwork into full semantic
search / RAG.
