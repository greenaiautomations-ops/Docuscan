# Pricing review

The earlier €5 / €14.99 credit-only proposal has been superseded by the user-approved Free / €6.99 Basic / €17.99 Pro / from €49 Business packages.

See [the current package table, implementation details, and release instructions](business-launch.md).

The cost model uses pinned Gemini 3.1 Flash-Lite standard pricing: $0.25 per million text/image/video input tokens and $1.50 per million output/thinking tokens, as checked against https://ai.google.dev/gemini-api/docs/pricing on 30 October 2026. OCR uses that same multimodal service. Base monthly safety budgets remain 1M/4M/16M/64M weighted credits (input=1, output/thinking=6), corresponding to modeled generation cost ceilings of $0.25/$1/$4/$16 before infrastructure and support. Embeddings conservatively reserve credits too. Optional page packs add 6M credits and question packs 3M credits. Page/request limits and maximum input sizes still apply; unusually long workloads can hit the token safety cap first.

These are proposed launch economics, not verified operating margins. Measure real token consumption, OCR quality, storage/egress, tax, payment fees, support cost and free-account abuse before scaling. The new displayed prices require new Stripe Price IDs and coordinated backend deployment; old live prices were not altered.
