-- =====================================================================
-- Docuscan Phase 2 — OCR + AI document intelligence: schema changes
-- =====================================================================

create extension if not exists "vector";

-- ---------------------------------------------------------------------
-- documents: richer lifecycle + processing UX + full-text search
-- ---------------------------------------------------------------------
alter table public.documents
  drop constraint if exists documents_status_check;

alter table public.documents
  add constraint documents_status_check
  check (status in ('uploading', 'uploaded', 'processing', 'analyzed', 'completed', 'failed'));

alter table public.documents
  add column if not exists processing_stage text
    check (processing_stage in (
      'reading', 'extracting_text', 'understanding',
      'finding_important_information', 'creating_summary', null
    )),
  add column if not exists error_message text,
  add column if not exists issuer text,
  add column if not exists language text,
  add column if not exists search_vector tsvector;

create index if not exists documents_search_vector_idx on public.documents using gin (search_vector);

-- Keep a baseline search vector (title/category/type/issuer) fresh on every
-- write. The Edge Function additionally calls refresh_document_search_vector()
-- once OCR text and extracted entities are available, to fold those in too.
create or replace function public.documents_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.issuer, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.document_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.category, '')), 'D');
  return new;
end;
$$;

drop trigger if exists documents_search_vector_trigger on public.documents;
create trigger documents_search_vector_trigger
  before insert or update of title, issuer, document_type, category
  on public.documents
  for each row execute function public.documents_search_vector_update();

-- Recomputes the full search vector including OCR text, extracted issuer,
-- summary and tag names. Called by the process-document Edge Function once
-- analysis is available; SECURITY INVOKER so RLS still applies to the caller.
create or replace function public.refresh_document_search_vector(p_document_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  v_ocr_text text;
  v_summary text;
  v_tags text;
begin
  select raw_text into v_ocr_text
  from public.document_ocr
  where document_id = p_document_id
  order by created_at desc
  limit 1;

  select summary into v_summary
  from public.document_analysis
  where document_id = p_document_id
  order by created_at desc
  limit 1;

  select string_agg(t.name, ' ') into v_tags
  from public.document_tags dt
  join public.tags t on t.id = dt.tag_id
  where dt.document_id = p_document_id;

  update public.documents d
  set search_vector =
    setweight(to_tsvector('english', coalesce(d.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(d.issuer, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(d.document_type, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(d.category, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(v_tags, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(v_summary, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(v_ocr_text, '')), 'D')
  where d.id = p_document_id;
end;
$$;

-- ---------------------------------------------------------------------
-- document_ocr: processing status + errors, per Phase 2 pipeline
-- ---------------------------------------------------------------------
alter table public.document_ocr
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  add column if not exists error_message text,
  add column if not exists provider text not null default 'gemini';

-- ---------------------------------------------------------------------
-- document_pages: per-page OCR confidence
-- ---------------------------------------------------------------------
alter table public.document_pages
  add column if not exists confidence numeric(5, 4) check (confidence >= 0 and confidence <= 1);

-- ---------------------------------------------------------------------
-- document_analysis: detected language + user-edit tracking
-- ---------------------------------------------------------------------
alter table public.document_analysis
  add column if not exists language text,
  add column if not exists edited_by_user boolean not null default false;

-- ---------------------------------------------------------------------
-- document_chat_messages
-- ---------------------------------------------------------------------
create table if not exists public.document_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_chat_messages_document_id_idx
  on public.document_chat_messages (document_id, created_at);
create index if not exists document_chat_messages_user_id_idx
  on public.document_chat_messages (user_id);

-- ---------------------------------------------------------------------
-- document_translations
-- ---------------------------------------------------------------------
create table if not exists public.document_translations (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  language text not null check (language in ('en', 'de', 'es', 'zh', 'ru')),
  scope text not null default 'full' check (scope in ('full', 'summary', 'selection')),
  source_excerpt text,
  translated_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists document_translations_document_id_idx
  on public.document_translations (document_id);
create unique index if not exists document_translations_full_summary_unique
  on public.document_translations (document_id, language, scope)
  where scope in ('full', 'summary');

-- ---------------------------------------------------------------------
-- document_embeddings (pgvector — architecture ready for Phase 3 search/RAG)
-- Dimension matches Voyage AI's voyage-3-lite model (512). Adjust if you
-- swap embedding providers/models.
-- ---------------------------------------------------------------------
create table if not exists public.document_embeddings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  chunk_index integer not null default 0,
  content text not null,
  embedding vector(512),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_embeddings_document_id_idx
  on public.document_embeddings (document_id);

create index if not exists document_embeddings_vector_idx
  on public.document_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
