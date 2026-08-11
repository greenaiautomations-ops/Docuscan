-- =====================================================================
-- Docuscan Phase 1 — Row Level Security
-- Every user-owned table: RLS enabled, owner-only access.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.document_ocr enable row level security;
alter table public.document_analysis enable row level security;
alter table public.tags enable row level security;
alter table public.document_tags enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------
-- profiles: user can only see/edit their own profile
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- documents: user can only access their own documents
-- ---------------------------------------------------------------------
drop policy if exists "documents_select_own" on public.documents;
create policy "documents_select_own" on public.documents
  for select using (auth.uid() = user_id);

drop policy if exists "documents_insert_own" on public.documents;
create policy "documents_insert_own" on public.documents
  for insert with check (auth.uid() = user_id);

drop policy if exists "documents_update_own" on public.documents;
create policy "documents_update_own" on public.documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "documents_delete_own" on public.documents;
create policy "documents_delete_own" on public.documents
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- document_pages: access via parent document ownership
-- ---------------------------------------------------------------------
drop policy if exists "document_pages_select_own" on public.document_pages;
create policy "document_pages_select_own" on public.document_pages
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_pages_insert_own" on public.document_pages;
create policy "document_pages_insert_own" on public.document_pages
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_pages_update_own" on public.document_pages;
create policy "document_pages_update_own" on public.document_pages
  for update using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_pages_delete_own" on public.document_pages;
create policy "document_pages_delete_own" on public.document_pages
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- document_ocr: access via parent document ownership
-- ---------------------------------------------------------------------
drop policy if exists "document_ocr_select_own" on public.document_ocr;
create policy "document_ocr_select_own" on public.document_ocr
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_ocr_insert_own" on public.document_ocr;
create policy "document_ocr_insert_own" on public.document_ocr
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_ocr_update_own" on public.document_ocr;
create policy "document_ocr_update_own" on public.document_ocr
  for update using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_ocr_delete_own" on public.document_ocr;
create policy "document_ocr_delete_own" on public.document_ocr
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- document_analysis: access via parent document ownership
-- ---------------------------------------------------------------------
drop policy if exists "document_analysis_select_own" on public.document_analysis;
create policy "document_analysis_select_own" on public.document_analysis
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_analysis_insert_own" on public.document_analysis;
create policy "document_analysis_insert_own" on public.document_analysis
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_analysis_update_own" on public.document_analysis;
create policy "document_analysis_update_own" on public.document_analysis
  for update using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_analysis_delete_own" on public.document_analysis;
create policy "document_analysis_delete_own" on public.document_analysis
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- tags: user can only access their own tags
-- ---------------------------------------------------------------------
drop policy if exists "tags_select_own" on public.tags;
create policy "tags_select_own" on public.tags
  for select using (auth.uid() = user_id);

drop policy if exists "tags_insert_own" on public.tags;
create policy "tags_insert_own" on public.tags
  for insert with check (auth.uid() = user_id);

drop policy if exists "tags_update_own" on public.tags;
create policy "tags_update_own" on public.tags
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tags_delete_own" on public.tags;
create policy "tags_delete_own" on public.tags
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- document_tags: access via both the document and the tag being owned
-- ---------------------------------------------------------------------
drop policy if exists "document_tags_select_own" on public.document_tags;
create policy "document_tags_select_own" on public.document_tags
  for select using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "document_tags_insert_own" on public.document_tags;
create policy "document_tags_insert_own" on public.document_tags
  for insert with check (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
    and exists (select 1 from public.tags t where t.id = tag_id and t.user_id = auth.uid())
  );

drop policy if exists "document_tags_delete_own" on public.document_tags;
create policy "document_tags_delete_own" on public.document_tags
  for delete using (
    exists (select 1 from public.documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- notifications: user can only access their own notifications
-- ---------------------------------------------------------------------
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications_insert_own" on public.notifications;
create policy "notifications_insert_own" on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete using (auth.uid() = user_id);
