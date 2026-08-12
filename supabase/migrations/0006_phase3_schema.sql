-- =====================================================================
-- Docuscan Phase 3 — Smart calendar, deadlines, payments, notifications
-- =====================================================================

-- ---------------------------------------------------------------------
-- events
-- Dates are stored as plain `date`/`time` (no timezone) so a deadline of
-- "2026-09-01" never shifts because of timezone math — see profiles.timezone
-- for how reminders/"today" are computed relative to the user's zone.
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  type text not null
    check (type in ('deadline', 'appointment', 'payment_due', 'renewal', 'expiration', 'task', 'other')),
  title text not null,
  description text,
  event_date date,
  event_time time,
  location text,
  priority text not null default 'medium'
    check (priority in ('critical', 'high', 'medium', 'low')),
  status text not null default 'confirmed'
    check (status in ('needs_review', 'confirmed', 'completed', 'dismissed')),
  source_confidence numeric(5, 4) check (source_confidence >= 0 and source_confidence <= 1),
  -- Which extracted_data field this event was generated from (e.g.
  -- 'deadline', 'payment_due_date', 'appointment_datetime', 'expiry_date',
  -- 'required_action'). Null for manually-created events. Combined with
  -- document_id this is the dedup key so reprocessing never duplicates.
  source_field text,
  is_user_edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_document_id_idx on public.events (document_id);
create index if not exists events_event_date_idx on public.events (event_date);
create index if not exists events_user_status_idx on public.events (user_id, status);
create index if not exists events_user_type_idx on public.events (user_id, type);
create unique index if not exists events_document_source_field_unique
  on public.events (document_id, source_field)
  where document_id is not null and source_field is not null;

drop trigger if exists set_updated_at on public.events;
create trigger set_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  event_id uuid references public.events (id) on delete set null,
  amount numeric(12, 2) check (amount is null or amount >= 0),
  currency text,
  recipient text,
  due_date date,
  reference_number text,
  status text not null default 'unknown'
    check (status in ('pending', 'paid', 'cancelled', 'disputed', 'unknown')),
  recurring boolean not null default false,
  recurrence_interval text
    check (recurrence_interval is null or recurrence_interval in ('weekly', 'monthly', 'quarterly', 'yearly')),
  confidence numeric(5, 4) check (confidence >= 0 and confidence <= 1),
  is_user_edited boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_document_id_idx on public.payments (document_id);
create index if not exists payments_event_id_idx on public.payments (event_id);
create index if not exists payments_due_date_idx on public.payments (due_date);
create index if not exists payments_user_status_idx on public.payments (user_id, status);

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- reminders
-- reminder_date is computed from the parent event's event_date minus the
-- offset (7/3/1/0 days) at creation time — plain `date`, timezone-safe.
-- ---------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  reminder_date date not null,
  reminder_type text not null
    check (reminder_type in ('seven_days', 'three_days', 'one_day', 'same_day', 'custom')),
  sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, reminder_type)
);

create index if not exists reminders_user_id_idx on public.reminders (user_id);
create index if not exists reminders_event_id_idx on public.reminders (event_id);
create index if not exists reminders_pending_idx on public.reminders (reminder_date) where sent = false;

-- ---------------------------------------------------------------------
-- notification_preferences (one row per user)
-- ---------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  seven_days boolean not null default true,
  three_days boolean not null default true,
  one_day boolean not null default true,
  same_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_preferences_user_id_idx on public.notification_preferences (user_id);

drop trigger if exists set_updated_at on public.notification_preferences;
create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- notification_events — reminder/calendar-driven notifications, created by
-- the scheduled process-reminders Edge Function. Distinct from Phase 1's
-- `notifications` table, which covers document upload/processing status;
-- the Notification Center reads both.
-- ---------------------------------------------------------------------
create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  type text not null default 'reminder',
  title text not null,
  message text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notification_events_user_id_idx on public.notification_events (user_id);
create index if not exists notification_events_user_read_idx on public.notification_events (user_id, read);
create index if not exists notification_events_event_id_idx on public.notification_events (event_id);

-- ---------------------------------------------------------------------
-- auto-create notification_preferences on new auth user (mirrors profiles)
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user_notification_preferences()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_notification_preferences on auth.users;
create trigger on_auth_user_created_notification_preferences
  after insert on auth.users
  for each row execute function public.handle_new_user_notification_preferences();

-- Back-fill for users who signed up before this migration.
insert into public.notification_preferences (user_id)
select u.id from auth.users u
left join public.notification_preferences np on np.user_id = u.id
where np.id is null;

-- ---------------------------------------------------------------------
-- documents: allow a "creating_events" processing stage between summary
-- generation and completion (event/payment auto-creation step).
-- ---------------------------------------------------------------------
alter table public.documents
  drop constraint if exists documents_processing_stage_check;

alter table public.documents
  add constraint documents_processing_stage_check
  check (processing_stage in (
    'reading', 'extracting_text', 'understanding',
    'finding_important_information', 'creating_summary', 'creating_events', null
  ));
