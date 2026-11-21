-- Simulates the undocumented V2 changes the live app depends on (rooms, modules, multi-room, period shares).
alter table public.households add column room_type text not null default 'family';
alter table public.households add constraint households_room_type_legacy check (room_type in ('family','friends','office','custom'));
alter table public.households add column enabled_modules MODTYPE not null default MODEMPTY;
alter table public.households add column overview_modules MODTYPE not null default MODEMPTY;
alter table public.household_members drop constraint household_members_user_id_key;
create table public.period_shares (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id), viewer_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(), unique(room_id, owner_id, viewer_id));
alter table public.period_shares enable row level security;
create policy ps_rw on public.period_shares for all to authenticated
  using (owner_id = (select auth.uid()) or viewer_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, delete on public.period_shares to authenticated;
