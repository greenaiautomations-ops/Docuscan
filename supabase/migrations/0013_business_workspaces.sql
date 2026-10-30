-- Business libraries use the owner's existing user_id as their billing/storage
-- boundary. Creating a team explicitly shares that library with accepted members.
create table public.workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  created_at timestamptz not null default now()
);
create table public.workspace_members (
  owner_id uuid not null references public.workspaces(owner_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','editor','viewer')),
  primary key(owner_id,user_id), check(owner_id <> user_id)
);
create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.workspaces(owner_id) on delete cascade,
  email text not null,
  role text not null check(role in ('admin','editor','viewer')),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  unique(owner_id,email)
);
create table public.workspace_audit (
  id bigint generated always as identity primary key,
  owner_id uuid not null references public.workspaces(owner_id) on delete cascade,
  actor_id uuid,
  action text not null,
  subject text,
  created_at timestamptz not null default now()
);

create function public.business_active(p_owner uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where user_id=p_owner and
   (role='admin' or (subscription_tier='enterprise' and subscription_status in ('active','trialing'))))
$$;
create function public.can_workspace(p_owner uuid, p_write boolean default false) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() = p_owner or (business_active(p_owner) and exists(
   select 1 from workspace_members where owner_id=p_owner and user_id=auth.uid()
   and (not p_write or role in ('admin','editor'))))
$$;
create function public.manage_workspace(p_owner uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid()=p_owner or (business_active(p_owner) and exists(
   select 1 from workspace_members where owner_id=p_owner and user_id=auth.uid() and role='admin'))
$$;
create function public.workspace_plan(p_owner uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if not can_workspace(p_owner) then raise exception 'Workspace access denied'; end if;
 select jsonb_build_object('role',case when p_owner=auth.uid() then role else 'user' end,
 'subscription_tier',subscription_tier,'subscription_status',subscription_status,'is_comp_access',is_comp_access)
 into result from profiles where user_id=p_owner;
 return result;
end $$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.workspace_audit enable row level security;
create policy workspace_read on workspaces for select to authenticated using(can_workspace(owner_id));
create policy members_read on workspace_members for select to authenticated using(can_workspace(owner_id));
create policy invites_read on workspace_invites for select to authenticated using(manage_workspace(owner_id));
create policy audit_read on workspace_audit for select to authenticated using(manage_workspace(owner_id));
grant select on workspaces, workspace_members, workspace_invites, workspace_audit to authenticated;
revoke insert,update,delete on workspaces,workspace_members,workspace_invites,workspace_audit from anon,authenticated;
grant all on workspaces,workspace_members,workspace_invites,workspace_audit to service_role;
grant usage on sequence workspace_audit_id_seq to service_role;

-- Updated by verified Stripe events only. Additional seats and storage are
-- recurring subscriptions; page/question packs are calendar-month purchases.
create table public.billing_addons (
  stripe_id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('pages','questions','storage','seats')),
  quantity integer not null check(quantity between 1 and 100),
  expires_at timestamptz not null,
  active boolean not null default true
);
alter table billing_addons enable row level security;
create policy addons_read on billing_addons for select to authenticated using(owner_id=auth.uid());
revoke all on billing_addons from anon,authenticated;
grant select on billing_addons to authenticated;
grant all on billing_addons to service_role;
create function public.addon_units(p_owner uuid,p_kind text) returns bigint
language sql stable security definer set search_path=public as $$
 select coalesce(sum(quantity),0)::bigint from billing_addons where owner_id=p_owner and kind=p_kind and active and expires_at>now()
$$;

create function public.create_workspace(p_name text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not business_active(auth.uid()) then raise exception 'Business plan required'; end if;
 insert into workspaces(owner_id,name) values(auth.uid(),trim(p_name));
 insert into workspace_audit(owner_id,actor_id,action) values(auth.uid(),auth.uid(),'workspace.created');
end $$;
create function public.invite_workspace_member(p_owner uuid,p_email text,p_role text) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid; occupied bigint;
begin
 if not manage_workspace(p_owner) or not business_active(p_owner) then raise exception 'Workspace administration required'; end if;
 if p_role not in ('admin','editor','viewer') or (p_role='admin' and auth.uid()<>p_owner) then raise exception 'Invalid role'; end if;
 if length(p_email)>254 or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Valid email required'; end if;
 perform 1 from workspaces where owner_id=p_owner for update;
 select 1+(select count(*) from workspace_members where owner_id=p_owner)+
 (select count(*) from workspace_invites where owner_id=p_owner and accepted_at is null and expires_at>now() and email<>lower(trim(p_email))) into occupied;
 if occupied>=3+addon_units(p_owner,'seats') then raise exception 'Team seat limit reached. Purchase another seat first.'; end if;
 insert into workspace_invites(owner_id,email,role) values(p_owner,lower(trim(p_email)),p_role)
 on conflict(owner_id,email) do update set id=gen_random_uuid(),role=excluded.role,expires_at=now()+interval '7 days',accepted_at=null returning id into result;
 insert into workspace_audit(owner_id,actor_id,action,subject) values(p_owner,auth.uid(),'member.invited',lower(trim(p_email)));
 return result;
end $$;
create function public.accept_workspace_invite(p_invite uuid) returns void
language plpgsql security definer set search_path=public as $$
declare invitation workspace_invites%rowtype; email_address text;
begin
 select email into email_address from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into strict invitation from workspace_invites where id=p_invite for update;
 if invitation.accepted_at is not null or invitation.expires_at<=now() or lower(email_address) is distinct from invitation.email
 or not business_active(invitation.owner_id) then raise exception 'Invitation is invalid, expired, or intended for a different verified email'; end if;
 perform 1 from workspaces where owner_id=invitation.owner_id for update;
 if 1+(select count(*) from workspace_members where owner_id=invitation.owner_id)>=3+addon_units(invitation.owner_id,'seats') then raise exception 'Team seat limit reached'; end if;
 insert into workspace_members(owner_id,user_id,role) values(invitation.owner_id,auth.uid(),invitation.role);
 update workspace_invites set accepted_at=now() where id=p_invite;
 insert into workspace_audit(owner_id,actor_id,action,subject) values(invitation.owner_id,auth.uid(),'member.joined',auth.uid()::text);
end $$;
create function public.change_workspace_member(p_owner uuid,p_user uuid,p_role text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not manage_workspace(p_owner) then raise exception 'Workspace administration required'; end if;
 if p_user=p_owner then raise exception 'The owner cannot be changed here'; end if;
 if auth.uid()<>p_owner and (p_role='admin' or exists(select 1 from workspace_members where owner_id=p_owner and user_id=p_user and role='admin')) then raise exception 'Owner required to manage admins'; end if;
 if p_role='remove' then delete from workspace_members where owner_id=p_owner and user_id=p_user;
 elsif p_role in ('admin','editor','viewer') then update workspace_members set role=p_role where owner_id=p_owner and user_id=p_user;
 else raise exception 'Invalid role'; end if;
 insert into workspace_audit(owner_id,actor_id,action,subject) values(p_owner,auth.uid(),'member.'||p_role,p_user::text);
end $$;
create function public.revoke_workspace_invite(p_invite uuid) returns void
language plpgsql security definer set search_path=public as $$
declare owner uuid;
begin
 select owner_id into strict owner from workspace_invites where id=p_invite;
 if not manage_workspace(owner) then raise exception 'Workspace administration required'; end if;
 update workspace_invites set expires_at=now() where id=p_invite;
 insert into workspace_audit(owner_id,actor_id,action,subject) values(owner,auth.uid(),'invite.revoked',p_invite::text);
end $$;

-- Extend existing own-row policies with membership policies. Existing owner
-- permissions remain, while viewers receive SELECT only.
do $$ declare tab text;
begin
 foreach tab in array array['documents','folders','tags','events','payments','reminders','notifications','notification_events'] loop
   execute format('create policy team_read on public.%I for select to authenticated using(public.can_workspace(user_id))',tab);
   execute format('create policy team_insert on public.%I for insert to authenticated with check(public.can_workspace(user_id,true))',tab);
   execute format('create policy team_update on public.%I for update to authenticated using(public.can_workspace(user_id,true)) with check(public.can_workspace(user_id,true))',tab);
   execute format('create policy team_delete on public.%I for delete to authenticated using(public.can_workspace(user_id,true))',tab);
 end loop;
 foreach tab in array array['document_pages','document_ocr','document_analysis','document_translations','document_embeddings','document_chat_messages','document_tags'] loop
   execute format('create policy team_read on public.%I for select to authenticated using(exists(select 1 from public.documents d where d.id=document_id and public.can_workspace(d.user_id)))',tab);
   execute format('create policy team_insert on public.%I for insert to authenticated with check(exists(select 1 from public.documents d where d.id=document_id and public.can_workspace(d.user_id,true)))',tab);
   execute format('create policy team_update on public.%I for update to authenticated using(exists(select 1 from public.documents d where d.id=document_id and public.can_workspace(d.user_id,true))) with check(exists(select 1 from public.documents d where d.id=document_id and public.can_workspace(d.user_id,true)))',tab);
   execute format('create policy team_delete on public.%I for delete to authenticated using(exists(select 1 from public.documents d where d.id=document_id and public.can_workspace(d.user_id,true)))',tab);
 end loop;
end $$;

create function public.storage_workspace_access(p_name text,p_write boolean default false) returns boolean
language plpgsql stable security definer set search_path=public as $$
begin
 return can_workspace(split_part(p_name,'/',1)::uuid,p_write);
exception when invalid_text_representation then return false;
end $$;
create policy team_storage_read on storage.objects for select to authenticated using(bucket_id='documents' and public.storage_workspace_access(name));
create policy team_storage_insert on storage.objects for insert to authenticated with check(bucket_id='documents' and public.storage_workspace_access(name,true));
create policy team_storage_update on storage.objects for update to authenticated using(bucket_id='documents' and public.storage_workspace_access(name,true)) with check(bucket_id='documents' and public.storage_workspace_access(name,true));
create policy team_storage_delete on storage.objects for delete to authenticated using(bucket_id='documents' and public.storage_workspace_access(name,true));

create function public.audit_workspace_change() returns trigger language plpgsql security definer set search_path=public as $$
declare row_data jsonb; owner uuid;
begin
 row_data:=case when TG_OP='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 owner:=(row_data->>'user_id')::uuid;
 if exists(select 1 from workspaces where owner_id=owner) then
 insert into workspace_audit(owner_id,actor_id,action,subject) values(owner,auth.uid(),TG_TABLE_NAME||'.'||lower(TG_OP),row_data->>'id');
 end if;
 return coalesce(new,old);
end $$;
create trigger document_audit after insert or update or delete on documents for each row execute function audit_workspace_change();
create trigger folder_audit after insert or update or delete on folders for each row execute function audit_workspace_change();
create trigger event_audit after insert or update or delete on events for each row execute function audit_workspace_change();
create trigger payment_audit after insert or update or delete on payments for each row execute function audit_workspace_change();

-- Explicitly restrict RPC entry points. Helper functions expose only booleans;
-- addon_units is internal and must not reveal another customer's purchases.
revoke all on function addon_units(uuid,text) from public,anon,authenticated;
do $$ declare fn regprocedure;
begin
 foreach fn in array array['business_active(uuid)'::regprocedure,'can_workspace(uuid,boolean)'::regprocedure,'manage_workspace(uuid)'::regprocedure,'workspace_plan(uuid)'::regprocedure,'create_workspace(text)'::regprocedure,'invite_workspace_member(uuid,text,text)'::regprocedure,'accept_workspace_invite(uuid)'::regprocedure,'change_workspace_member(uuid,uuid,text)'::regprocedure,'revoke_workspace_invite(uuid)'::regprocedure,'storage_workspace_access(text,boolean)'::regprocedure] loop
 execute format('revoke all on function %s from public,anon',fn);
 execute format('grant execute on function %s to authenticated,service_role',fn);
 end loop;
end $$;

create function public.workspace_snapshot() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'ownerId',w.owner_id,'name',w.name,'role',case when w.owner_id=auth.uid() then 'owner' else m.role end,
 'members',(select coalesce(jsonb_agg(jsonb_build_object('userId',members.user_id,'role',members.role,'email',u.email)),'[]'::jsonb)
   from workspace_members members join auth.users u on u.id=members.user_id where members.owner_id=w.owner_id),
 'invites',case when manage_workspace(w.owner_id) then (select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'role',i.role,'expiresAt',i.expires_at)),'[]'::jsonb) from workspace_invites i where i.owner_id=w.owner_id and i.accepted_at is null and i.expires_at>now()) else '[]'::jsonb end,
 'audit',case when manage_workspace(w.owner_id) then (select coalesce(jsonb_agg(a),'[]'::jsonb) from (select id,actor_id,action,subject,created_at from workspace_audit where owner_id=w.owner_id order by created_at desc limit 50) a) else '[]'::jsonb end
 )),'[]'::jsonb) from workspaces w left join workspace_members m on m.owner_id=w.owner_id and m.user_id=auth.uid()
 where can_workspace(w.owner_id)
$$;
revoke all on function workspace_snapshot() from public,anon;
grant execute on function workspace_snapshot() to authenticated;

-- A tag attached to a shared document must belong to that same library.
create function public.check_document_tag_library() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from documents d join tags t on t.user_id=d.user_id where d.id=new.document_id and t.id=new.tag_id) then
 raise exception 'Document and tag must belong to the same library'; end if;
 return new;
end $$;
create trigger check_document_tag_library before insert or update on document_tags for each row execute function check_document_tag_library();
