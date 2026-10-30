-- When paid seat capacity expires, only the oldest included/paid memberships
-- remain active. Membership records remain available to the owner for cleanup.
alter table workspace_members add column joined_at timestamptz not null default now();
create or replace function public.can_workspace(p_owner uuid,p_write boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid()=p_owner or (business_active(p_owner) and exists(
   select 1 from (
     select user_id,role,row_number() over(order by joined_at,user_id) position
     from workspace_members where owner_id=p_owner
   ) m where m.user_id=auth.uid() and m.position<=2+addon_units(p_owner,'seats')
   and (not p_write or m.role in ('admin','editor'))
 ))
$$;
create or replace function public.manage_workspace(p_owner uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid()=p_owner or (can_workspace(p_owner,true) and exists(
   select 1 from workspace_members where owner_id=p_owner and user_id=auth.uid() and role='admin'))
$$;
