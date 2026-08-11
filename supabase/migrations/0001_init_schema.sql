-- =====================================================================
-- Docuscan Phase 1 — Initial schema
-- Tables: profiles, documents, document_pages, document_ocr,
--         document_analysis, tags, document_tags, notifications
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text,
  preferred_language text not null default 'en',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);

-- ---------------------------------------------------------------------
-- documents
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text not null,
  file_size bigint not null check (file_size >= 0),
  category text not null default 'uncategorized',
  document_type text,
  original_language text,
  status text not null default 'uploading'
    check (status in ('uploading', 'processing', 'completed', 'failed')),
  importance text not null default 'normal'
    check (importance in ('low', 'normal', 'high')),
  is_important boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents (user_id);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_category_idx on public.documents (category);
create index if not exists documents_created_at_idx on public.documents (created_at desc);
create index if not exists documents_user_important_idx on public.documents (user_id, is_important);
create index if not exists documents_user_archived_idx on public.documents (user_id, is_archived);

-- ---------------------------------------------------------------------
-- document_pages
-- ---------------------------------------------------------------------
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  page_number integer not null check (page_number > 0),
  image_path text not null,
  extracted_text text,
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);

create index if not exists document_pages_document_id_idx on public.document_pages (document_id);

-- ---------------------------------------------------------------------
-- document_ocr
-- ---------------------------------------------------------------------
create table if not exists public.document_ocr (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  raw_text text,
  confidence numeric(5, 4) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_ocr_document_id_idx on public.document_ocr (document_id);

-- ---------------------------------------------------------------------
-- document_analysis
-- ---------------------------------------------------------------------
create table if not exists public.document_analysis (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  summary text,
  document_type text,
  extracted_data jsonb not null default '{}'::jsonb,
  confidence numeric(5, 4) check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_analysis_document_id_idx on public.document_analysis (document_id);
create index if not exists document_analysis_extracted_data_idx on public.document_analysis using gin (extracted_data);

-- ---------------------------------------------------------------------
-- tags
-- ---------------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists tags_user_id_idx on public.tags (user_id);

-- ---------------------------------------------------------------------
-- document_tags (join table)
-- ---------------------------------------------------------------------
create table if not exists public.document_tags (
  document_id uuid not null references public.documents (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, tag_id)
);

create index if not exists document_tags_document_id_idx on public.document_tags (document_id);
create index if not exists document_tags_tag_id_idx on public.document_tags (tag_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null default 'info',
  title text not null,
  message text,
  document_id uuid references public.documents (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read);
create index if not exists notifications_created_at_idx on public.notifications (created_at desc);

-- ---------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.documents;
create trigger set_updated_at before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.document_ocr;
create trigger set_updated_at before update on public.document_ocr
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.document_analysis;
create trigger set_updated_at before update on public.document_analysis
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- auto-create profile on new auth user
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
