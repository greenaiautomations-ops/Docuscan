create function public.effective_plan(p_owner uuid) returns text language sql stable security definer set search_path=public as $$
 select case when role='admin' then 'enterprise' when is_comp_access then 'pro'
 when subscription_status in ('active','trialing') then subscription_tier else 'free' end from profiles where user_id=p_owner
$$;
create table public.package_monthly_usage (
 owner_id uuid not null references auth.users(id) on delete cascade,
 month date not null,
 pages integer not null default 0 check(pages>=0),
 questions integer not null default 0 check(questions>=0),
 primary key(owner_id,month)
);
alter table package_monthly_usage enable row level security;
create policy usage_read on package_monthly_usage for select to authenticated using(can_workspace(owner_id));
revoke all on package_monthly_usage from anon,authenticated;
grant select on package_monthly_usage to authenticated;
grant all on package_monthly_usage to service_role;

create function public.consume_package_usage(p_owner uuid,p_kind text,p_amount integer) returns void
language plpgsql security definer set search_path=public as $$
declare plan text; allowance bigint; used bigint; period date:=date_trunc('month',now() at time zone 'UTC')::date;
begin
 if p_kind not in ('pages','questions') or p_amount<1 or p_amount>2000 then raise exception 'Invalid usage'; end if;
 plan:=effective_plan(p_owner);
 allowance:=case when p_kind='pages' then case plan when 'enterprise' then 2000 when 'pro' then 750 when 'basic' then 150 else 30 end
 else case plan when 'enterprise' then 500 when 'pro' then 200 when 'basic' then 30 else 3 end end;
 allowance:=allowance+100*addon_units(p_owner,p_kind);
 insert into package_monthly_usage(owner_id,month) values(p_owner,period) on conflict do nothing;
 select case when p_kind='pages' then pages else questions end into used from package_monthly_usage where owner_id=p_owner and month=period for update;
 if used+p_amount>allowance then raise exception 'PACKAGE_LIMIT_REACHED: Monthly % allowance reached. Buy an optional add-on or wait until next month.',p_kind; end if;
 update package_monthly_usage set pages=pages+case when p_kind='pages' then p_amount else 0 end,
 questions=questions+case when p_kind='questions' then p_amount else 0 end where owner_id=p_owner and month=period;
end $$;
revoke all on function consume_package_usage(uuid,text,integer) from public,anon,authenticated;
grant execute on function consume_package_usage(uuid,text,integer) to service_role;

create or replace function public.check_document_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare plan text; cap integer;
begin
 perform 1 from profiles where user_id=new.user_id for update;
 plan:=effective_plan(new.user_id);
 cap:=case plan when 'enterprise' then 5000 when 'pro' then 1500 when 'basic' then 200 else 20 end;
 if (select count(*) from documents where user_id=new.user_id)>=cap then raise exception 'DOCUMENT_LIMIT_REACHED: Your plan allows % stored documents.',cap; end if;
 return new;
end $$;
create function public.check_storage_allowance() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; plan text; used bigint; cap bigint; size_bytes bigint;
begin
 if new.bucket_id<>'documents' then return new; end if;
 owner:=split_part(new.name,'/',1)::uuid;
 perform 1 from profiles where user_id=owner for update;
 plan:=effective_plan(owner);
 cap:=case plan when 'enterprise' then 25000000000 when 'pro' then 10000000000 when 'basic' then 1000000000 else 100000000 end;
 cap:=cap+5000000000*addon_units(owner,'storage');
 size_bytes:=coalesce((new.metadata->>'size')::bigint,0);
 if size_bytes<0 then raise exception 'Invalid object size'; end if;
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into used from storage.objects
 where bucket_id='documents' and split_part(name,'/',1)=owner::text and id<>new.id;
 if used+size_bytes>cap then raise exception 'STORAGE_LIMIT_REACHED: Storage allowance reached. Remove files or purchase more storage.'; end if;
 return new;
end $$;
create trigger check_storage_allowance before insert or update on storage.objects for each row execute function check_storage_allowance();

create function public.prevent_owner_change() returns trigger language plpgsql as $$
begin
 if new.user_id is distinct from old.user_id then raise exception 'Library ownership cannot be changed'; end if;
 return new;
end $$;
do $$ declare tab text;
begin
 foreach tab in array array['documents','folders','tags','events','payments','reminders','notifications','notification_events'] loop
 execute format('create trigger immutable_owner before update on public.%I for each row execute function public.prevent_owner_change()',tab);
 end loop;
end $$;

create function public.package_usage(p_owner uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare plan text; usage package_monthly_usage%rowtype; bytes bigint;
begin
 if not can_workspace(p_owner) then raise exception 'Workspace access denied'; end if;
 plan:=effective_plan(p_owner);
 select * into usage from package_monthly_usage where owner_id=p_owner and month=date_trunc('month',now() at time zone 'UTC')::date;
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into bytes from storage.objects where bucket_id='documents' and split_part(name,'/',1)=p_owner::text;
 return jsonb_build_object('pages',coalesce(usage.pages,0),'questions',coalesce(usage.questions,0),'storageBytes',bytes,
 'pageLimit',(case plan when 'enterprise' then 2000 when 'pro' then 750 when 'basic' then 150 else 30 end)+100*addon_units(p_owner,'pages'),
 'questionLimit',(case plan when 'enterprise' then 500 when 'pro' then 200 when 'basic' then 30 else 3 end)+100*addon_units(p_owner,'questions'),
 'storageLimit',(case plan when 'enterprise' then 25000000000 when 'pro' then 10000000000 when 'basic' then 1000000000 else 100000000 end)+5000000000*addon_units(p_owner,'storage'),
 'seats',3+addon_units(p_owner,'seats'));
end $$;
revoke all on function package_usage(uuid) from public,anon;
grant execute on function package_usage(uuid) to authenticated,service_role;
revoke all on function effective_plan(uuid) from public,anon,authenticated;

-- Additional metered credits accompany paid packs, so the internal cost guard
-- cannot silently erase the allowance a customer just purchased.
create or replace function public.reserve_ai_credits(p_user_id uuid,p_credits bigint) returns uuid
language plpgsql security definer set search_path=public as $$
declare allowance bigint; used bigint; period date:=date_trunc('month',now() at time zone 'UTC')::date; reservation uuid; plan text;
begin
 if p_credits<=0 or p_credits>100000000 then raise exception 'Invalid AI reservation'; end if;
 plan:=effective_plan(p_user_id);
 allowance:=case plan when 'enterprise' then 64000000 when 'pro' then 16000000 when 'basic' then 4000000 else 1000000 end;
 allowance:=allowance+6000000*addon_units(p_user_id,'pages')+3000000*addon_units(p_user_id,'questions');
 insert into ai_monthly_usage(user_id,month) values(p_user_id,period) on conflict do nothing;
 select credits into used from ai_monthly_usage where user_id=p_user_id and month=period for update;
 if used+p_credits>allowance then raise exception 'AI_LIMIT_REACHED: Monthly token safety allowance reached. Contact support for unusually long documents.'; end if;
 update ai_monthly_usage set credits=credits+p_credits where user_id=p_user_id and month=period;
 insert into ai_usage_reservations(user_id,month,credits) values(p_user_id,period,p_credits) returning id into reservation;
 return reservation;
end $$;
