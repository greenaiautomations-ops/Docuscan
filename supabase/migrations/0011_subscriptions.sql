-- =====================================================================
-- Docuscan — subscription tiers, admin role, and enforcement.
--
-- Tiers (business rules, enforced both here and in
-- src/utils/entitlements.ts / supabase/functions/_shared/entitlements.ts):
--   free       10 documents,   no translation, no explain, no ask-AI
--   basic      100 documents,  translation + explain, NO ask-AI    (€5/mo)
--   pro        1000 documents, everything incl. ask-AI            (€14.99/mo)
--   enterprise unlimited,      everything — sales-assisted, no self-serve price
--
-- `is_comp_access` is an admin-granted complimentary flag (capped at 5
-- accounts) that gives full Pro-level access without paying, for testing.
-- =====================================================================

alter table public.profiles
  add column if not exists email text,
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin')),
  add column if not exists subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'basic', 'pro', 'enterprise')),
  add column if not exists subscription_status text not null default 'active'
    check (subscription_status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists is_comp_access boolean not null default false,
  add column if not exists comp_access_granted_by uuid references auth.users (id) on delete set null,
  add column if not exists comp_access_granted_at timestamptz;

create index if not exists profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);
create unique index if not exists profiles_stripe_subscription_id_key on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ---------------------------------------------------------------------
-- Denormalize email onto profiles. The client SDK has no way to read
-- auth.users directly (by design — it's the auth system's own table), and
-- the admin panel needs to show *who* it's granting comp access to. Kept
-- in sync going forward by a trigger on auth.users; backfilled for
-- existing accounts below.
-- ---------------------------------------------------------------------
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.user_id and p.email is distinct from u.email;

create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform set_config('app.bypass_privileged_check', 'true', true);
  update public.profiles set email = new.email where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- ---------------------------------------------------------------------
-- Extend handle_new_user() (defined in 0001_init_schema.sql) to also copy
-- the email onto the profile at signup, now that profiles.email exists.
-- Redefining with `create or replace` — same signature/trigger, just adds
-- one more column to the insert.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), new.email)
  on conflict (user_id) do update set email = excluded.email;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- is_admin() — RLS helper. security definer + owned by a bypassrls role
-- (the migration-running role in Supabase) so the internal lookup doesn't
-- recurse into the RLS policies it's used to define.
-- ---------------------------------------------------------------------
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = uid and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Defense in depth: subscription/role columns must never be settable by a
-- user updating their own profile (that would let anyone grant themselves
-- Pro access for free). Only an admin's own session, or the service-role
-- client (Stripe webhook), may change them.
-- ---------------------------------------------------------------------
create or replace function public.check_profile_privileged_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- Transaction-local escape hatch for trusted internal triggers (e.g.
  -- sync_profile_email below) that run outside any PostgREST session and
  -- so have no auth.role()/auth.uid() to check.
  if coalesce(current_setting('app.bypass_privileged_check', true), '') = 'true' then
    return new;
  end if;

  -- auth.role() is Supabase's standard JWT-role helper; the service-role
  -- key (used only by the Stripe webhook, never shipped to the browser)
  -- is exempt from this check so the webhook can sync subscription state.
  if auth.role() = 'service_role' then
    return new;
  end if;

  caller_is_admin := public.is_admin(auth.uid());

  if caller_is_admin then
    return new;
  end if;

  if new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.subscription_tier is distinct from old.subscription_tier
     or new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id
     or new.subscription_current_period_end is distinct from old.subscription_current_period_end
     or new.is_comp_access is distinct from old.is_comp_access
     or new.comp_access_granted_by is distinct from old.comp_access_granted_by
     or new.comp_access_granted_at is distinct from old.comp_access_granted_at
  then
    raise exception 'Subscription and role fields can only be changed by an admin or the billing system.';
  end if;

  return new;
end;
$$;

drop trigger if exists check_profile_privileged_update on public.profiles;
create trigger check_profile_privileged_update
  before update on public.profiles
  for each row execute function public.check_profile_privileged_update();

-- ---------------------------------------------------------------------
-- Cap complimentary (admin-granted, free-for-testing) accounts at 5.
-- ---------------------------------------------------------------------
create or replace function public.check_comp_access_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  comp_count integer;
begin
  if new.is_comp_access and not coalesce(old.is_comp_access, false) then
    select count(*) into comp_count from public.profiles where is_comp_access = true;
    if comp_count >= 5 then
      raise exception 'Comp access limit reached (5 accounts). Revoke one before granting another.';
    end if;
    new.comp_access_granted_at := now();
    new.comp_access_granted_by := auth.uid();
  elsif not new.is_comp_access and coalesce(old.is_comp_access, false) then
    new.comp_access_granted_by := null;
    new.comp_access_granted_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists check_comp_access_limit on public.profiles;
create trigger check_comp_access_limit
  before update on public.profiles
  for each row execute function public.check_comp_access_limit();

-- ---------------------------------------------------------------------
-- Document upload limit, enforced server-side so it can't be bypassed by
-- calling the client SDK directly. Admins and comp-access accounts are
-- unlimited; paid tiers only get their higher limit while the
-- subscription is actually active/trialing (a lapsed subscription falls
-- back to the free limit until it's renewed or canceled cleanly).
-- ---------------------------------------------------------------------
create or replace function public.check_document_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  prof record;
  doc_count integer;
  doc_limit integer;
begin
  select subscription_tier, subscription_status, is_comp_access, role
    into prof
    from public.profiles where user_id = new.user_id;

  if prof.role = 'admin' or prof.is_comp_access then
    return new;
  end if;

  if prof.subscription_tier = 'enterprise' and prof.subscription_status in ('active', 'trialing') then
    return new;
  end if;

  doc_limit := case
    when prof.subscription_tier = 'pro' and prof.subscription_status in ('active', 'trialing') then 1000
    when prof.subscription_tier = 'basic' and prof.subscription_status in ('active', 'trialing') then 100
    else 10
  end;

  select count(*) into doc_count from public.documents where user_id = new.user_id;

  if doc_count >= doc_limit then
    raise exception 'DOCUMENT_LIMIT_REACHED: Your plan allows % documents. Upgrade to upload more.', doc_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists check_document_limit on public.documents;
create trigger check_document_limit
  before insert on public.documents
  for each row execute function public.check_document_limit();

-- ---------------------------------------------------------------------
-- RLS: admins can see and manage every profile (for the admin panel /
-- comp-access grants); everyone still keeps their existing own-row access.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_admin(auth.uid()));

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Seed: grant admin to the project owner's account, if it already exists.
-- Safe to re-run; does nothing if the user hasn't signed up yet (in which
-- case, run this statement again after they do, or grant it from the
-- Supabase SQL editor). Migrations run outside any PostgREST session, so
-- auth.role()/auth.uid() aren't set here and the privileged-update trigger
-- above would otherwise reject this — briefly disable it just for this
-- one trusted, migration-only statement.
-- ---------------------------------------------------------------------
alter table public.profiles disable trigger check_profile_privileged_update;

update public.profiles
set role = 'admin'
where user_id = (select id from auth.users where email = 'zoraiz1002@gmail.com');

alter table public.profiles enable trigger check_profile_privileged_update;
