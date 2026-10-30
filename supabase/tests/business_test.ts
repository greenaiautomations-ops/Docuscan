// deno test --node-modules-dir=none --no-lock --allow-read --allow-env supabase/tests/business_test.ts
import { PGlite } from 'npm:@electric-sql/pglite@0.3.14'
Deno.test('Business RLS, invitations, audit, shared usage and storage limits', async () => {
  const db = new PGlite()
  const owner = '00000000-0000-0000-0000-000000000001'
  const editor = '00000000-0000-0000-0000-000000000002'
  const viewer = '00000000-0000-0000-0000-000000000003'
  const outsider = '00000000-0000-0000-0000-000000000004'
  const doc = '10000000-0000-0000-0000-000000000001'
  const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
  const login = async (id: string) => db.exec(`reset role; set role authenticated; set "request.jwt.claim.sub"='${id}'`)
  const reject = async (action: () => Promise<unknown>, label: string) => {
    let failed = false
    try { await action() } catch { failed = true }
    assert(failed, label)
  }
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,storage to authenticated,service_role;
      create table profiles(user_id uuid primary key,role text,is_comp_access boolean,subscription_status text,subscription_tier text);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
      alter table storage.objects enable row level security;
    `)
    for (const table of ['documents','folders','tags','events','payments','reminders','notifications','notification_events']) {
      await db.exec(`create table ${table}(id uuid primary key default gen_random_uuid(),user_id uuid not null,title text); alter table ${table} enable row level security; grant select,insert,update,delete on ${table} to authenticated;`)
    }
    for (const table of ['document_pages','document_ocr','document_analysis','document_translations','document_embeddings','document_chat_messages','document_tags']) {
      await db.exec(`create table ${table}(id uuid primary key default gen_random_uuid(),document_id uuid,user_id uuid,tag_id uuid); alter table ${table} enable row level security; grant select,insert,update,delete on ${table} to authenticated;`)
    }
    await db.exec(`insert into auth.users values('${owner}','owner@test.invalid',now()),('${editor}','editor@test.invalid',now()),('${viewer}','viewer@test.invalid',now()),('${outsider}','other@test.invalid',now());
      insert into profiles values('${owner}','user',false,'active','enterprise'),('${editor}','user',false,'active','free'),('${viewer}','user',false,'active','free'),('${outsider}','user',false,'active','free');
      insert into documents values('${doc}','${owner}','Team document');
      insert into documents(user_id,title) values('${outsider}','Private document');
      grant all on all tables in schema public to service_role;
      grant all on storage.objects to authenticated,service_role;
    `)
    for (const migration of ['0012_ai_usage.sql','0013_business_workspaces.sql','0014_package_allowances.sql','0016_seat_expiry.sql']) await db.exec(await Deno.readTextFile(new URL(`../migrations/${migration}`, import.meta.url)))
    await db.exec('create trigger check_document_limit before insert on documents for each row execute function check_document_limit()')
    await login(owner)
    await db.query('select create_workspace($1)', ['Company'])
    const editorInvite = (await db.query<{ id: string }>('select invite_workspace_member($1,$2,$3) id', [owner,'editor@test.invalid','editor'])).rows[0].id
    const viewerInvite = (await db.query<{ id: string }>('select invite_workspace_member($1,$2,$3) id', [owner,'viewer@test.invalid','viewer'])).rows[0].id
    await reject(() => db.query('select invite_workspace_member($1,$2,$3)', [owner,'other@test.invalid','editor']), 'Pending invitations must reserve seats')
    await login(outsider)
    await reject(() => db.query('select accept_workspace_invite($1)', [editorInvite]), 'Wrong email must not accept invitation')
    await login(editor); await db.query('select accept_workspace_invite($1)', [editorInvite])
    await login(viewer); await db.query('select accept_workspace_invite($1)', [viewerInvite])
    assert((await db.query('select * from documents')).rows.length === 1, 'Viewer sees team document only')
    assert((await db.query('update documents set title=$1 where id=$2 returning id', ['changed',doc])).rows.length === 0, 'Viewer cannot update')
    await reject(() => db.query('select invite_workspace_member($1,$2,$3)', [owner,'x@test.invalid','admin']), 'Viewer cannot invite')
    await reject(() => db.query('insert into workspace_audit(owner_id,action) values($1,$2)', [owner,'fake']), 'Audit must be immutable')
    assert((await db.query('select * from workspace_audit')).rows.length === 0, 'Viewer cannot read admin audit')
    await login(editor)
    assert((await db.query('update documents set title=$1 where id=$2 returning id', ['updated',doc])).rows.length === 1, 'Editor can update shared document')
    await reject(() => db.query('update documents set user_id=$1 where id=$2', [editor,doc]), 'Cannot transfer ownership to bypass quotas')
    await login(owner)
    assert((await db.query('select * from workspace_audit')).rows.length >= 5, 'Changes are audited')
    await db.query('select change_workspace_member($1,$2,$3)', [owner,editor,'remove'])
    await login(editor)
    assert((await db.query('select * from documents')).rows.length === 0, 'Removed member loses access')
    await reject(() => db.query('select package_usage($1)', [owner]), 'Removed member cannot inspect shared usage')
    await db.exec('reset role; set role service_role')
    await db.query('select consume_package_usage($1,$2,$3)', [owner,'pages',2000])
    await reject(() => db.query('select consume_package_usage($1,$2,$3)', [owner,'pages',1]), 'Business page cap applies')
    await db.query('select consume_package_usage($1,$2,$3)', [owner,'questions',500])
    await reject(() => db.query('select consume_package_usage($1,$2,$3)', [owner,'questions',1]), 'Business shared question cap applies')
    await db.query("insert into billing_addons values('pack',$1,'pages',1,now()+interval '1 day',true)", [owner])
    await db.query('select consume_package_usage($1,$2,$3)', [owner,'pages',100])
    await reject(() => db.query('select consume_package_usage($1,$2,$3)', [owner,'pages',1]), 'Pack adds exactly 100 pages')
    await db.query("insert into storage.objects(bucket_id,name,metadata) values('documents',$1,$2)", [`${owner}/large`, {size: 25000000000}])
    await reject(() => db.query("insert into storage.objects(bucket_id,name,metadata) values('documents',$1,$2)", [`${owner}/overflow`, {size: 1}]), 'Storage cap applies to real objects')
    await db.query("insert into billing_addons values('storage',$1,'storage',1,now()+interval '1 day',true)", [owner])
    await db.query("insert into storage.objects(bucket_id,name,metadata) values('documents',$1,$2)", [`${owner}/additional`, {size: 5000000000}])
    await db.query('select consume_package_usage($1,$2,$3)', [outsider,'questions',3])
    await reject(() => db.query('select consume_package_usage($1,$2,$3)', [outsider,'questions',1]), 'Free questions capped at three')
    for (let i=0;i<19;i++) await db.query('insert into documents(user_id,title) values($1,$2)', [outsider,'doc'])
    await reject(() => db.query('insert into documents(user_id,title) values($1,$2)', [outsider,'overflow']), 'Free stored documents capped at 20')
    // Paid seats expire without silently retaining excess shared access.
    await db.query("insert into billing_addons values('seat',$1,'seats',1,now()+interval '1 day',true)", [owner])
    await db.exec('reset role')
    await db.query("insert into workspace_members(owner_id,user_id,role,joined_at) values($1,$2,'editor',now()-interval '1 day')", [owner,editor])
    await db.query("insert into workspace_members(owner_id,user_id,role,joined_at) values($1,$2,'viewer',now()+interval '1 day')", [owner,outsider])
    await login(outsider)
    assert((await db.query<{ allowed: boolean }>('select can_workspace($1) allowed', [owner])).rows[0].allowed, 'Paid extra seat grants access')
    await db.exec("reset role; update billing_addons set active=false where stripe_id='seat'")
    await login(outsider)
    assert(!(await db.query<{ allowed: boolean }>('select can_workspace($1) allowed', [owner])).rows[0].allowed, 'Expired extra seat removes excess access')
    await db.exec(`reset role; update profiles set subscription_status='canceled' where user_id='${owner}'`)
    await login(viewer)
    assert((await db.query('select * from documents')).rows.length === 0, 'Inactive Business plan suspends shared access')
  } finally { await db.close() }
})
