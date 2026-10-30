-- Weighted AI credits: one input token = 1, one output/thinking token = 6.
-- Only trusted Edge Functions can reserve/settle usage; clients can read their own.
create table public.ai_monthly_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  credits bigint not null default 0 check (credits >= 0),
  primary key (user_id, month)
);
alter table public.ai_monthly_usage enable row level security;
create policy own_ai_usage on public.ai_monthly_usage for select to authenticated using (auth.uid() = user_id);
grant select on public.ai_monthly_usage to authenticated;
revoke insert, update, delete on public.ai_monthly_usage from anon, authenticated;
create table public.ai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  credits bigint not null,
  settled boolean not null default false
);
alter table public.ai_usage_reservations enable row level security;
revoke all on public.ai_usage_reservations from anon, authenticated;

create function public.reserve_ai_credits(p_user_id uuid, p_credits bigint) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  allowance bigint;
  used bigint;
  period date := date_trunc('month', now() at time zone 'UTC')::date;
  reservation uuid;
begin
  if p_credits <= 0 or p_credits > 100000000 then raise exception 'Invalid AI reservation'; end if;
  select * into strict p from profiles where user_id = p_user_id;
  allowance := case
    when p.role = 'admin' then 64000000
    when p.is_comp_access then 16000000
    when p.subscription_status in ('active','trialing') and p.subscription_tier = 'enterprise' then 64000000
    when p.subscription_status in ('active','trialing') and p.subscription_tier = 'pro' then 16000000
    when p.subscription_status in ('active','trialing') and p.subscription_tier = 'basic' then 4000000
    else 1000000 end;
  insert into ai_monthly_usage(user_id, month) values (p_user_id, period) on conflict do nothing;
  select credits into used from ai_monthly_usage where user_id = p_user_id and month = period for update;
  if used + p_credits > allowance then
    raise exception 'AI_LIMIT_REACHED: Monthly OCR/AI allowance reached or request exceeds remaining credits. Upgrade or try again next month.';
  end if;
  update ai_monthly_usage set credits = credits + p_credits where user_id = p_user_id and month = period;
  insert into ai_usage_reservations(user_id, month, credits) values (p_user_id, period, p_credits) returning id into reservation;
  return reservation;
end $$;

create function public.settle_ai_credits(p_reservation uuid, p_actual bigint) returns void
language plpgsql security definer set search_path = public as $$
declare r public.ai_usage_reservations%rowtype;
begin
  select * into strict r from ai_usage_reservations where id = p_reservation for update;
  if r.settled then return; end if;
  if p_actual < 0 or p_actual > r.credits then raise exception 'Invalid AI settlement'; end if;
  update ai_monthly_usage set credits = credits - (r.credits - p_actual) where user_id = r.user_id and month = r.month;
  update ai_usage_reservations set settled = true where id = r.id;
end $$;
revoke all on function public.reserve_ai_credits(uuid, bigint) from public, anon, authenticated;
revoke all on function public.settle_ai_credits(uuid, bigint) from public, anon, authenticated;
grant execute on function public.reserve_ai_credits(uuid, bigint) to service_role;
grant execute on function public.settle_ai_credits(uuid, bigint) to service_role;
grant all on public.ai_monthly_usage, public.ai_usage_reservations to service_role;
