// Run with: deno test --node-modules-dir=none --no-lock --allow-read --allow-env supabase/tests/ai_usage_test.ts
import { PGlite } from 'npm:@electric-sql/pglite@0.3.14'

Deno.test('AI usage: SQL permissions, caps, settlement and plan fallback', async () => {
  const db = new PGlite()
  const user = '00000000-0000-0000-0000-000000000001'
  const other = '00000000-0000-0000-0000-000000000002'
  const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      create table public.profiles(user_id uuid primary key, role text, is_comp_access boolean, subscription_status text, subscription_tier text);
      insert into auth.users values ('${user}'), ('${other}');
      insert into profiles values ('${user}', 'user', false, 'active', 'basic'), ('${other}', 'user', false, 'active', 'free');
    `)
    await db.exec(await Deno.readTextFile(new URL('../migrations/0012_ai_usage.sql', import.meta.url)))
    await db.exec('set role service_role')
    const first = await db.query<{ id: string }>('select reserve_ai_credits($1, 3999990) as id', [user])
    await db.query('select reserve_ai_credits($1, 10)', [user])
    let rejected = false
    try { await db.query('select reserve_ai_credits($1, 1)', [user]) } catch (error) { rejected = String(error).includes('AI_LIMIT_REACHED') }
    assert(rejected, 'Basic must reject usage over 4M')
    await db.query('select settle_ai_credits($1, 90)', [first.rows[0].id])
    await db.query('select settle_ai_credits($1, 0)', [first.rows[0].id])
    const usage = await db.query<{ credits: number }>('select credits from ai_monthly_usage where user_id = $1', [user])
    assert(Number(usage.rows[0].credits) === 100, 'Settlement must refund only once')
    await db.exec(`reset role; set role authenticated; set "request.jwt.claim.sub" = '${other}'`)
    assert((await db.query('select * from ai_monthly_usage')).rows.length === 0, 'RLS must hide another user’s usage')
    rejected = false
    try { await db.query('select reserve_ai_credits($1, 1)', [other]) } catch { rejected = true }
    assert(rejected, 'Clients must not reserve credits')
    rejected = false
    try { await db.query('select settle_ai_credits($1, 0)', [first.rows[0].id]) } catch { rejected = true }
    assert(rejected, 'Clients must not refund credits')
    rejected = false
    try { await db.query('update ai_monthly_usage set credits = 0') } catch { rejected = true }
    assert(rejected, 'Clients must not overwrite usage')
    await db.exec(`reset role; update profiles set subscription_status = 'canceled' where user_id = '${user}'; set role service_role`)
    rejected = false
    try { await db.query('select reserve_ai_credits($1, 1000000)', [user]) } catch { rejected = true }
    assert(rejected, 'Canceled plans must fall back to the Free allowance')
    await db.exec(`reset role; update profiles set subscription_status = 'active', subscription_tier = 'pro' where user_id = '${user}'; set role service_role`)
    await db.query('select reserve_ai_credits($1, 15999900)', [user])
    rejected = false
    try { await db.query('select reserve_ai_credits($1, 1)', [user]) } catch { rejected = true }
    assert(rejected, 'Pro must reject usage over 16M')
  } finally { await db.close() }
})
