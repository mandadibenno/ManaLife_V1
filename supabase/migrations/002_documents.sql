-- ManaLife 2.0 • Migration 002 — Documents vault
-- ---------------------------------------------------------------------------
-- WHAT THIS ADDS
--   • public.space_documents: metadata for files stored per space.
--   • Private Storage bucket 'space-documents' (20 MB per file).
--   • RLS on both: only members of the space that owns the file can see,
--     upload or delete it. Personal-space documents are therefore private.
--
-- Files are stored at  <space_id>/<random-id>-<file name>
-- Requires schema.sql helpers (private.is_household_member). Independent of 001.
-- Transactional and safe to re-run.
-- ---------------------------------------------------------------------------

begin;

create table if not exists public.space_documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  category text not null default 'Other' check (length(category) between 1 and 40),
  notes text not null default '' check (length(notes) <= 1000),
  storage_path text not null unique check (length(storage_path) <= 400),
  file_name text not null check (length(file_name) between 1 and 255),
  mime_type text not null default 'application/octet-stream' check (length(mime_type) <= 120),
  size_bytes bigint not null default 0 check (size_bytes between 0 and 20971520),
  expires_on date,
  created_at timestamptz not null default now()
);

create index if not exists idx_space_documents_household
  on public.space_documents (household_id, created_at desc);

-- Immutable identity: a document cannot be moved to another space or re-pointed.
create or replace function private.protect_document_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.household_id is distinct from old.household_id
     or new.storage_path is distinct from old.storage_path
     or new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'Cannot change document space, file or uploader';
  end if;
  return new;
end $$;

drop trigger if exists document_protect on public.space_documents;
create trigger document_protect before update on public.space_documents
  for each row execute function private.protect_document_identity();

alter table public.space_documents enable row level security;

drop policy if exists document_select on public.space_documents;
create policy document_select on public.space_documents for select to authenticated
  using (private.is_household_member(household_id));

drop policy if exists document_insert on public.space_documents;
create policy document_insert on public.space_documents for insert to authenticated
  with check (
    private.is_household_member(household_id)
    and uploaded_by = (select auth.uid())
    and storage_path like household_id::text || '/%'
  );

drop policy if exists document_update on public.space_documents;
create policy document_update on public.space_documents for update to authenticated
  using (private.is_household_member(household_id))
  with check (private.is_household_member(household_id));

drop policy if exists document_delete on public.space_documents;
create policy document_delete on public.space_documents for delete to authenticated
  using (private.is_household_member(household_id));

grant select, insert, update, delete on public.space_documents to authenticated;
revoke all on public.space_documents from anon;

-- Storage ------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'space-documents', 'space-documents', false, 20971520,
  array[
    'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;

-- First path segment is the space id. Returns NULL (=> no access) for malformed paths.
create or replace function private.space_from_path(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

revoke execute on function private.space_from_path(text), private.protect_document_identity() from public, anon;
grant execute on function private.space_from_path(text) to authenticated;

drop policy if exists "space documents read" on storage.objects;
create policy "space documents read" on storage.objects for select to authenticated
  using (bucket_id = 'space-documents' and private.is_household_member(private.space_from_path(name)));

drop policy if exists "space documents upload" on storage.objects;
create policy "space documents upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'space-documents' and private.is_household_member(private.space_from_path(name)));

drop policy if exists "space documents delete" on storage.objects;
create policy "space documents delete" on storage.objects for delete to authenticated
  using (bucket_id = 'space-documents' and private.is_household_member(private.space_from_path(name)));

commit;

notify pgrst, 'reload schema';
