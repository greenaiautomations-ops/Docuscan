# OCR / AI pricing review — 30 October 2026

Decision: keep Basic at €5/month and Pro at €14.99/month, but replace unbounded AI use with an enforced shared monthly credit allowance. Stored-document limits are unchanged. These are changes in source, not a production deployment or Stripe configuration change.

| Plan | Price | Stored documents | Monthly credits | Modeled maximum provider cost |
| --- | --- | --- | --- | --- |
| Free | €0 | 10 | 1 million | $0.25 |
| Basic | €5/month | 100 | 4 million | $1 |
| Pro | €14.99/month | 1,000 | 16 million | $4 |
| Enterprise | Quote | Unlimited | 64 million | $16 |

Source: https://ai.google.dev/gemini-api/docs/pricing (checked 2026-10-30). Gemini 3.1 Flash-Lite Standard text/image/video input is $0.25 per million tokens; output including thinking is $1.50 per million. OCR uses the same multimodal Gemini API, so there is no separate per-page OCR invoice in this implementation. One input token uses one credit; one output/thinking token uses six. Embeddings conservatively consume four credits per UTF-8 input byte plus 1,024 credits per call, retaining headroom over embedding-001's token rate. Embedding reservations are not refunded.

The old storage cap did not bound spending: users could repeat processing, translation and chat or delete and re-upload documents. Raising subscription prices alone would not fix that. This change meters each generation, including JSON repair calls, and optional embeddings. Monthly usage is independent of document deletion and resets by UTC calendar month, not Stripe billing anniversary. Atomic row locks prevent parallel requests from overspending a user's allowance. Failed or interrupted calls retain their reserved credits; successful generations release unused output reservation. A request may be declined near the limit because its maximum output must fit before it starts. No automatic overage billing is implemented.

These cost ceilings are modeled at the pinned model's current standard rates, not profitability guarantees or invoice measurements. They exclude tax, currency conversion, Stripe fees, database/storage/egress, hosting, support, acquisition, and free-account abuse. At a conservative planning conversion of $1 = €1 (an assumption, not a quoted FX rate), Basic leaves €4 and Pro €10.99 before those costs. Production invoices and workload measurements are still needed to assess overall margin. Enterprise needs a quote that covers its storage and support requirements as well as its $16 AI budget. Admin and comp accounts also receive finite AI budgets (64M and 16M) to contain accidental spend.

The moving `gemini-flash-lite-latest` alias is replaced with the priced `gemini-3.1-flash-lite`. Overrides to other generation or embedding models fail closed until their credit weights are reviewed. This is a model change and requires an OCR quality smoke test against representative documents before production rollout.

## Deployment order

1. Apply `supabase/migrations/0012_ai_usage.sql` to staging, then run database checks for owner-only reads, rejection of browser reservation/settlement calls, concurrent reservations at the cap, and settlement idempotency. Local PGlite SQL tests passed for tier caps, owner-only reads, blocked browser mutations, settlement idempotency, and canceled-plan fallback. A live Supabase staging check and multi-connection concurrency test are still required.
2. Set `GEMINI_MODEL=gemini-3.1-flash-lite` (or remove the old override), use the paid standard API tier, and ensure the Edge Functions have `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy `process-document`, `chat-with-document`, and `translate-document` together with their shared modules. Metering intentionally fails closed if the migration is missing.
4. Smoke-test OCR, JSON repair, translation, chat, allowance exhaustion, and month rollover in staging. Announce new allowances to existing subscribers before activating them.
5. Deploy the frontend. Prices are unchanged, so no new Stripe Price IDs are required. Live Stripe values were not inspected; confirm configured IDs still charge €5 and €14.99 monthly before release.

## Session behavior

The browser signs out after 10 minutes without pointer, keyboard, touch or scroll activity. A shared user-specific timestamp survives refresh and coordinates tabs. Background refresh and polling do not renew it; return from sleep checks expiry before counting activity. The sign-in page explains expiry. Sign-out uses local Supabase session scope, affecting this browser's session rather than every device. This is an application inactivity policy, not a server-enforced JWT lifetime; already issued access tokens retain their configured server expiry.
