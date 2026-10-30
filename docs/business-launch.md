# DocVault package and Business release — 30 October 2026

Implemented in source; not deployed to Supabase or Stripe during this task.

| Plan | VAT-inclusive launch price | Stored docs | OCR pages/month | AI requests/month | Storage |
| --- | --- | --- | --- | --- | --- |
| Free | €0 | 20 | 30 | 3 | 100 MB |
| Basic | €6.99/month | 200 | 150 | 30 | 1 GB |
| Pro | €17.99/month | 1,500 | 750 | 200 | 10 GB |
| Business | From €49/month | 5,000 | 2,000 shared | 500 shared | 25 GB shared |

Business includes the owner and two other members. The internal tier ID remains `enterprise` for compatibility; larger Enterprise accounts use custom quotes. All plans can ask their included AI questions. Explain and translation start at Basic; semantic search starts at Pro. Priority email support is a service commitment that the operator must fulfill.

Optional add-ons: 100 pages for €2, 100 AI requests for €3 (one-time packs, valid in the purchase's UTC calendar month); 5 GB for €2/month and an additional Business seat for €5/month (recurring subscriptions). Recurring add-ons can be canceled through Stripe Portal. They expire at the paid period end. An expired seat suspends access for members beyond the remaining seat capacity, ordered by join date; it does not delete their accounts or documents. Owners must buy shared-library add-ons on their own billing account.

## What is implemented

- Homepage Sign out when authenticated, Sign in when unauthenticated, using the same sign-out control as the app shell.
- Memory-only auth: closing, refreshing, or leaving the document drops local credentials. SPA navigation stays authenticated. Old persistent credentials are removed. Restoring a back/forward-cache document redirects to a fresh sign-in. Server revocation on page exit is best-effort; a browser crash cannot reliably make a network request, but reopening still requires login. The 10-minute inactivity rule remains.
- OCR page counts are calculated from the actual PDF with pdf-lib before invoking OCR; images count as one page. PDFs must be unlocked and at most 100 pages per processing request. Retrying processing consumes pages again.
- Chat, Explain and translation each consume one monthly AI request. Token budgets remain as a safety cap for unusually long requests, separately from the page/request allowances. All quotas are checked on the server; monthly counters reset on the 1st in UTC.
- Storage quotas count actual storage-object metadata, including orphan files, rather than trusting browser-reported document size. Stored-document inserts are serialized per owner. Account ownership cannot be changed to bypass limits.
- Business shared libraries: creating a library explicitly shares the owner's existing library with invited members after acceptance. The UI explains this before creation. Verified-email invitations expire in seven days and reserve seats; no email is sent automatically. Owner/admin/editor/viewer roles are enforced with RLS. Removed members and inactive Business subscriptions lose shared access.
- Read-only audit history records document, folder, event, payment and membership changes. The UI shows the latest 50 entries; this is change history, not a complete file-download/read-access log.
- Pro/Business semantic search uses Gemini embeddings and pgvector, restricted to the selected accessible library. Existing documents need processing/reprocessing to obtain embeddings. Search shows matching excerpts, not generated claims. Embeddings remain best-effort: provider failures leave ordinary keyword search available.
- Checkout validates configured EUR amounts, monthly intervals and inclusive tax behavior before accepting payments. Add-on grants come only from signed Stripe webhooks; duplicate one-time webhook deliveries do not duplicate allowance. Webhook failures return 500 for retry. Plan changes use Stripe Portal.

## Required deployment

1. Apply migrations through `0016_seat_expiry.sql` in order, first on a staging Supabase project. `0013` adds workspaces/add-ons, `0014` enforces packages, `0015` adds pgvector smart search, `0016` enforces expiring seats. Existing migration `0012` remains required for token accounting.
2. Configure the following Stripe **test-mode** prices, all EUR with `tax_behavior=inclusive`: Basic 699 cents/month, Pro 1799/month, Business 4900/month; pages 200 cents one-time, questions 300 one-time, storage 200/month, seats 500/month. Existing subscribers must not be silently repriced; announce changes and decide grandfathering before changing their subscriptions.
3. Set server secrets `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ADDON_PAGES`, `STRIPE_PRICE_ADDON_QUESTIONS`, `STRIPE_PRICE_ADDON_STORAGE`, `STRIPE_PRICE_ADDON_SEATS`, `APP_URL`, Stripe keys, and the Gemini key. `GEMINI_MODEL=gemini-3.1-flash-lite`; embedding model is `gemini-embedding-001`. Never expose service-role or Stripe keys in frontend environment variables.
4. Enable Stripe Tax and configure the Billing Portal for base-plan changes and recurring add-on cancellation. Configure the webhook endpoint API version `2023-10-16`, matching the Stripe 14 SDK. Subscribe to `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `checkout.session.completed`, and `checkout.session.async_payment_succeeded`.
5. Deploy `process-document`, `chat-with-document`, `translate-document`, `smart-search`, `create-checkout-session`, `create-addon-checkout`, `create-portal-session`, and `stripe-webhook`, including shared modules. Deploy the frontend together with the backend release.
6. Run staging smoke tests with real test accounts: personal and shared uploads, viewer denial, invitation acceptance/revocation, OCR and search quality, quota exhaustion, inclusive VAT checkout, webhook replay, and addon cancellation. Test storage upload failures against actual Supabase Storage and semantic ranking against real pgvector. Verify all amounts in hosted Checkout before enabling live payment keys.

No live payments, invitations, external messages, or production database changes were performed. One-time pack refunds/disputes require administrative review and allowance revocation; automated refund/dispute workflows are not implemented in this release. Contact/support operations and live tax registration configuration remain operator responsibilities.

## Validation and limits

49 application tests cover existing behavior, package parity, expiry boundaries, memory-only auth, back/forward restoration, and signed-in/signed-out landing controls. Local PostgreSQL-compatible tests cover RLS isolation, verified-email invitations, seat caps, editor/viewer behavior, audit immutability, shared page/question quotas, add-ons, storage caps, document limits, and expired paid seats. All eight changed Edge Function entry points type-check. Frontend build passes; existing bundle-size and five unrelated lint warnings remain.

The final in-app browser connection was unavailable, so the latest screens were not visually rechecked. No real account was used for an end-to-end checkout, shared workspace, ten-minute idle session, or close/reopen test. Local tests do not replace the staging checks above.
