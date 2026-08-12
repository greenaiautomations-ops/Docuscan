-- =====================================================================
-- Docuscan Phase 3 — RLS for events, payments, reminders, notification
-- tables. Every table is owned directly by user_id (no join needed), so
-- policies mirror the simple owner-only pattern used for documents/tags.
-- =====================================================================

alter table public.events enable row level security;
alter table public.payments enable row level security;
alter table public.reminders enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_events enable row level security;

-- ---------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own" on public.events
  for select using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own" on public.events
  for insert with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments
  for select using (auth.uid() = user_id);

drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments
  for insert with check (auth.uid() = user_id);

drop policy if exists "payments_update_own" on public.payments;
create policy "payments_update_own" on public.payments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "payments_delete_own" on public.payments;
create policy "payments_delete_own" on public.payments
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------
drop policy if exists "reminders_select_own" on public.reminders;
create policy "reminders_select_own" on public.reminders
  for select using (auth.uid() = user_id);

drop policy if exists "reminders_insert_own" on public.reminders;
create policy "reminders_insert_own" on public.reminders
  for insert with check (auth.uid() = user_id);

drop policy if exists "reminders_update_own" on public.reminders;
create policy "reminders_update_own" on public.reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_delete_own" on public.reminders
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------
drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (auth.uid() = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- notification_events
-- ---------------------------------------------------------------------
drop policy if exists "notification_events_select_own" on public.notification_events;
create policy "notification_events_select_own" on public.notification_events
  for select using (auth.uid() = user_id);

drop policy if exists "notification_events_insert_own" on public.notification_events;
create policy "notification_events_insert_own" on public.notification_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "notification_events_update_own" on public.notification_events;
create policy "notification_events_update_own" on public.notification_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notification_events_delete_own" on public.notification_events;
create policy "notification_events_delete_own" on public.notification_events
  for delete using (auth.uid() = user_id);
