-- =====================================================================
-- Docuscan Phase 2 — RLS for new tables
-- =====================================================================

alter table public.document_chat_messages enable row level security;
alter table public.document_translations enable row level security;
alter table public.document_embeddings enable row level security;

-- ---------------------------------------------------------------------
-- document_chat_messages: owner-only, and the row's own user_id must match
-- ---------------------------------------------------------------------
drop policy if exists "document_chat_messages_select_own" on public.document_chat_messages;
create policy "document_chat_messages_select_own" on public.document_chat_messages
  for select using (
    auth.uid() = user_id
    and exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_chat_messages_insert_own" on public.document_chat_messages;
create policy "document_chat_messages_insert_own" on public.document_chat_messages
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_chat_messages_delete_own" on public.document_chat_messages;
create policy "document_chat_messages_delete_own" on public.document_chat_messages
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- document_translations: access via parent document ownership
-- ---------------------------------------------------------------------
drop policy if exists "document_translations_select_own" on public.document_translations;
create policy "document_translations_select_own" on public.document_translations
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_translations_insert_own" on public.document_translations;
create policy "document_translations_insert_own" on public.document_translations
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_translations_update_own" on public.document_translations;
create policy "document_translations_update_own" on public.document_translations
  for update using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_translations_delete_own" on public.document_translations;
create policy "document_translations_delete_own" on public.document_translations
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- document_embeddings: access via parent document ownership (server-side
-- writes only; no direct client insert/update policy is needed yet, but
-- select is scoped for the Phase 3 search work that will read these).
-- ---------------------------------------------------------------------
drop policy if exists "document_embeddings_select_own" on public.document_embeddings;
create policy "document_embeddings_select_own" on public.document_embeddings
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_embeddings_insert_own" on public.document_embeddings;
create policy "document_embeddings_insert_own" on public.document_embeddings
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_embeddings_delete_own" on public.document_embeddings;
create policy "document_embeddings_delete_own" on public.document_embeddings
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );
