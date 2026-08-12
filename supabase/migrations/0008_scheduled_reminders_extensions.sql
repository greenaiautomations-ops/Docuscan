-- =====================================================================
-- Docuscan Phase 3 — enable extensions needed for scheduled reminders.
--
-- This migration ONLY enables the extensions. The actual cron.schedule(...)
-- call is deliberately NOT included here, because it needs your project's
-- own URL and a service-role credential — values that must never be
-- committed to a migration file that lives in git. See the README section
-- "Set up scheduled reminders" for the one-time manual step (either via the
-- Supabase Dashboard's Cron Jobs UI, or a short SQL snippet using Vault).
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
