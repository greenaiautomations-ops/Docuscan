-- =====================================================================
-- Docuscan — user-created document folders (e.g. "Taxes", "Finance",
-- "Marketing"), distinct from the fixed AI/system `category` field and
-- from the existing many-to-many `tags`. A document belongs to at most
-- one folder, like a real filing folder.
-- =====================================================================

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text not null default 'slate'
    check (color in ('red', 'orange', 'amber', 'emerald', 'teal', 'blue', 'indigo', 'purple', 'pink', 'slate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);

-- Case-insensitive uniqueness per user, so "Taxes" and "taxes" can't both exist.
create unique index if not exists folders_user_id_lower_name_key
  on public.folders (user_id, lower(name));

drop trigger if exists set_updated_at on public.folders;
create trigger set_updated_at before update on public.folders
  for each row execute function public.set_updated_at();

-- Deleting a folder never deletes its documents — they just become
-- unfiled again (folder_id -> null).
alter table public.documents
  add column if not exists folder_id uuid references public.folders (id) on delete set null;

create index if not exists documents_folder_id_idx on public.documents (folder_id);

-- Defense in depth: RLS on `documents` only checks that the document row
-- itself belongs to the caller, not that a folder_id being assigned also
-- belongs to them. Without this, a user could (in principle) file a
-- document into another user's folder id. Block that explicitly.
create or replace function public.check_document_folder_ownership()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.folder_id is not null then
    if not exists (
      select 1 from public.folders f
      where f.id = new.folder_id and f.user_id = new.user_id
    ) then
      raise exception 'folder_id must reference a folder owned by the same user';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists check_document_folder_ownership on public.documents;
create trigger check_document_folder_ownership
  before insert or update of folder_id on public.documents
  for each row execute function public.check_document_folder_ownership();
