-- ManaLife 2.0 • Migration 001 — Spaces v2
-- ---------------------------------------------------------------------------
-- WHAT THIS ADDS
--   • Personal space ("My Space"): one private room per user, room_type = 'personal'.
--     Enforced by triggers + a unique index, so nobody can ever be added to it.
--   • 'couple' space type.
--   • Optional icon / accent colour per space.
--   • RPCs: ensure_personal_space, create_space, update_space, remove_space_member.
--   • Automatic revocation of period_shares when a member leaves or is removed.
--
-- WHAT THIS DOES NOT DO
--   • It does not delete, rewrite or move any existing row.
--   • It does not change or replace any existing RPC (create_room, leave_room,
--     get_room_join_invite, decide_room_join, ...). They keep working.
--   • It does not loosen any existing RLS policy.
--
-- HOW TO RUN
--   1. Run supabase/introspect.sql and keep the output (it is your schema backup).
--   2. Paste this whole file into the Supabase SQL Editor and run it once.
--      It runs in a single transaction: if anything fails, nothing is applied.
--   3. Re-running is safe (idempotent).
-- ---------------------------------------------------------------------------

begin;

create schema if not exists private;

-- 1. Appearance columns -----------------------------------------------------
alter table public.households add column if not exists icon text;
alter table public.households add column if not exists accent text;

alter table public.households drop constraint if exists households_icon_check;
alter table public.households add constraint households_icon_check
  check (icon is null or icon ~ '^[a-z0-9-]{1,40}$') not valid;

alter table public.households drop constraint if exists households_accent_check;
alter table public.households add constraint households_accent_check
  check (accent is null or accent ~ '^[a-z]{1,20}$') not valid;

-- 2. Allow the new space types ---------------------------------------------
-- Drop whatever CHECK constraint currently restricts room_type (its name is not
-- tracked in the repo), then add one that includes 'personal' and 'couple'.
-- NOT VALID: existing rows are not re-checked, so legacy values can never block this.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.households'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%room_type%'
  loop
    execute format('alter table public.households drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.households add constraint households_room_type_check
  check (room_type in ('personal','couple','family','friends','office','custom')) not valid;

-- 3. One personal space per user --------------------------------------------
create unique index if not exists households_one_personal_per_user
  on public.households (created_by) where room_type = 'personal';

-- 4. Guards: a personal space can only ever contain its creator -------------
create or replace function private.guard_personal_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_type text; v_owner uuid;
begin
  select h.room_type, h.created_by into v_type, v_owner
  from public.households h where h.id = new.household_id;
  if v_type = 'personal' and new.user_id is distinct from v_owner then
    raise exception 'Personal spaces are private and cannot have other members';
  end if;
  return new;
end $$;

drop trigger if exists guard_personal_membership on public.household_members;
create trigger guard_personal_membership
  before insert or update on public.household_members
  for each row execute function private.guard_personal_membership();

create or replace function private.guard_personal_type()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (coalesce(old.room_type, '') = 'personal') <> (coalesce(new.room_type, '') = 'personal') then
    raise exception 'A personal space cannot be converted to or from a shared space';
  end if;
  if coalesce(new.room_type, '') = 'personal' and new.created_by is distinct from old.created_by then
    raise exception 'A personal space cannot change owner';
  end if;
  return new;
end $$;

drop trigger if exists guard_personal_type on public.households;
create trigger guard_personal_type
  before update on public.households
  for each row execute function private.guard_personal_type();

-- 5. Revoke cycle sharing automatically when someone leaves / is removed ----
create or replace function private.cleanup_member_shares()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Room itself being deleted: its rows are already cascading away.
  if not exists (select 1 from public.households h where h.id = old.household_id) then
    return old;
  end if;
  if to_regclass('public.period_shares') is not null then
    execute 'delete from public.period_shares where room_id = $1 and (viewer_id = $2 or owner_id = $2)'
      using old.household_id, old.user_id;
  end if;
  return old;
end $$;

drop trigger if exists cleanup_member_shares on public.household_members;
create trigger cleanup_member_shares
  after delete on public.household_members
  for each row execute function private.cleanup_member_shares();

-- 6. Helper: render a module list as a SQL literal matching the column type --
-- (enabled_modules / overview_modules may be text[] or jsonb in the live DB.)
create or replace function private.ml_module_sql(p_col text, p_vals text[])
returns text language plpgsql stable set search_path = '' as $$
declare v_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into v_type
  from pg_attribute a
  where a.attrelid = 'public.households'::regclass
    and a.attname = p_col and a.attnum > 0 and not a.attisdropped;
  if v_type is null then return null; end if;
  if v_type in ('jsonb', 'json') then
    return format('%L::%s', to_jsonb(coalesce(p_vals, '{}'::text[]))::text, v_type);
  end if;
  return format('%L::%s', coalesce(p_vals, '{}'::text[])::text, v_type);
end $$;

create or replace function private.ml_valid_appearance(p_icon text, p_accent text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_icon is not null and p_icon !~ '^[a-z0-9-]{1,40}$' then raise exception 'Invalid icon'; end if;
  if p_accent is not null and p_accent !~ '^[a-z]{1,20}$' then raise exception 'Invalid colour'; end if;
end $$;

-- 7. ensure_personal_space() ------------------------------------------------
create or replace function private.ensure_personal_space()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_cols text := 'name, created_by, room_type';
  v_vals text;
  v_mods text;
  v_cards text;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;

  select h.id into v_id from public.households h
  where h.created_by = v_uid and h.room_type = 'personal' limit 1;

  if v_id is null then
    v_vals := format('%L, %L, %L', 'My Space', v_uid, 'personal');
    v_mods := private.ml_module_sql('enabled_modules', array[
      'tasks','expenses','bills','calendar','habits','groceries','meals',
      'medicines','periods','reminders','documents']);
    v_cards := private.ml_module_sql('overview_modules', array[
      'tasks','calendar','expenses','habits','medicines','reminders']);
    if v_mods is not null then v_cols := v_cols || ', enabled_modules'; v_vals := v_vals || ', ' || v_mods; end if;
    if v_cards is not null then v_cols := v_cols || ', overview_modules'; v_vals := v_vals || ', ' || v_cards; end if;
    begin
      execute format('insert into public.households(%s) values (%s) returning id', v_cols, v_vals) into v_id;
    exception when unique_violation then
      select h.id into v_id from public.households h
      where h.created_by = v_uid and h.room_type = 'personal' limit 1;
    end;
  end if;

  insert into public.household_members(household_id, user_id, role)
  values (v_id, v_uid, 'owner')
  on conflict do nothing;

  return v_id;
end $$;

-- 8. create_space() ---------------------------------------------------------
create or replace function private.create_space(
  p_name text, p_room_type text, p_enabled text[], p_cards text[],
  p_icon text default null, p_accent text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_allowed text[] := array['tasks','groceries','bills','expenses','reminders','habits','meals','documents','calendar'];
  v_cards_clean text[];
  v_cols text := 'name, created_by, room_type, icon, accent';
  v_vals text;
  v_mods text;
  v_cards text;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  if private.verified_email() is null then raise exception 'Please verify your email first'; end if;
  if p_room_type is null or p_room_type not in ('couple','family','friends','office','custom') then
    raise exception 'Choose a valid space type';
  end if;
  if length(trim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Space name must be 1 to 100 characters';
  end if;
  if coalesce(array_length(p_enabled, 1), 0) = 0 then raise exception 'Select at least one feature'; end if;
  if not (p_enabled <@ v_allowed) then raise exception 'Unknown feature selected'; end if;
  perform private.ml_valid_appearance(p_icon, p_accent);
  if (select count(*) from public.households h where h.created_by = v_uid) >= 50 then
    raise exception 'You have reached the limit of 50 spaces';
  end if;

  v_cards_clean := array(
    select c from unnest(coalesce(p_cards, '{}'::text[])) with ordinality u(c, o)
    where c = any(p_enabled) order by o);

  v_vals := format('%L, %L, %L, %L, %L', trim(p_name), v_uid, p_room_type, p_icon, p_accent);
  v_mods := private.ml_module_sql('enabled_modules', p_enabled);
  v_cards := private.ml_module_sql('overview_modules', v_cards_clean);
  if v_mods is not null then v_cols := v_cols || ', enabled_modules'; v_vals := v_vals || ', ' || v_mods; end if;
  if v_cards is not null then v_cols := v_cols || ', overview_modules'; v_vals := v_vals || ', ' || v_cards; end if;

  execute format('insert into public.households(%s) values (%s) returning id', v_cols, v_vals) into v_id;

  insert into public.household_members(household_id, user_id, role)
  values (v_id, v_uid, 'owner');

  return v_id;
end $$;

-- 9. update_space() ---------------------------------------------------------
create or replace function private.update_space(
  p_room uuid, p_name text, p_room_type text, p_enabled text[], p_cards text[],
  p_icon text default null, p_accent text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_type text;
  v_allowed text[];
  v_cards_clean text[];
  v_set text;
  v_mods text;
  v_cards text;
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  if not exists (
    select 1 from public.household_members m
    where m.household_id = p_room and m.user_id = v_uid and m.role = 'owner'
  ) then
    raise exception 'Only the owner of this space can change its settings';
  end if;

  select h.room_type into v_type from public.households h where h.id = p_room;

  if v_type = 'personal' then
    if p_room_type is distinct from 'personal' then raise exception 'A personal space stays personal'; end if;
    v_allowed := array['tasks','groceries','bills','expenses','reminders','habits','meals','documents','calendar','medicines','periods'];
  else
    if p_room_type is null or p_room_type not in ('couple','family','friends','office','custom') then
      raise exception 'Choose a valid space type';
    end if;
    v_allowed := array['tasks','groceries','bills','expenses','reminders','habits','meals','documents','calendar'];
  end if;

  if length(trim(coalesce(p_name, ''))) not between 1 and 100 then
    raise exception 'Space name must be 1 to 100 characters';
  end if;
  if coalesce(array_length(p_enabled, 1), 0) = 0 then raise exception 'Select at least one feature'; end if;
  if not (p_enabled <@ v_allowed) then raise exception 'Unknown feature selected'; end if;
  perform private.ml_valid_appearance(p_icon, p_accent);

  v_cards_clean := array(
    select c from unnest(coalesce(p_cards, '{}'::text[])) with ordinality u(c, o)
    where c = any(p_enabled) order by o);

  v_set := format('name = %L, room_type = %L, icon = %L, accent = %L', trim(p_name), p_room_type, p_icon, p_accent);
  v_mods := private.ml_module_sql('enabled_modules', p_enabled);
  v_cards := private.ml_module_sql('overview_modules', v_cards_clean);
  if v_mods is not null then v_set := v_set || ', enabled_modules = ' || v_mods; end if;
  if v_cards is not null then v_set := v_set || ', overview_modules = ' || v_cards; end if;

  execute format('update public.households set %s where id = %L', v_set, p_room);
end $$;

-- 10. remove_space_member() -------------------------------------------------
create or replace function private.remove_space_member(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Please sign in first'; end if;
  if not exists (
    select 1 from public.household_members m
    where m.household_id = p_room and m.user_id = v_uid and m.role = 'owner'
  ) then
    raise exception 'Only the owner of this space can remove members';
  end if;
  if p_user = v_uid then raise exception 'Transfer ownership before leaving your own space'; end if;
  if not exists (select 1 from public.household_members m where m.household_id = p_room and m.user_id = p_user) then
    raise exception 'This person is not a member of the space';
  end if;
  if exists (select 1 from public.household_members m where m.household_id = p_room and m.user_id = p_user and m.role = 'owner') then
    raise exception 'An owner cannot be removed';
  end if;

  -- Unassign their open tasks so nothing points at a former member.
  update public.tasks set assigned_to = null where household_id = p_room and assigned_to = p_user;
  -- period_shares for this person in this room are revoked by the cleanup trigger.
  delete from public.household_members where household_id = p_room and user_id = p_user;
end $$;

-- 11. Browser-callable invoker wrappers (same pattern as schema.sql) -------
create or replace function public.ensure_personal_space()
returns uuid language sql security invoker set search_path = ''
as $$ select private.ensure_personal_space() $$;

create or replace function public.create_space(
  p_name text, p_room_type text, p_enabled text[], p_cards text[],
  p_icon text default null, p_accent text default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_space(p_name, p_room_type, p_enabled, p_cards, p_icon, p_accent) $$;

create or replace function public.update_space(
  p_room uuid, p_name text, p_room_type text, p_enabled text[], p_cards text[],
  p_icon text default null, p_accent text default null)
returns void language sql security invoker set search_path = ''
as $$ select private.update_space(p_room, p_name, p_room_type, p_enabled, p_cards, p_icon, p_accent) $$;

create or replace function public.remove_space_member(p_room uuid, p_user uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.remove_space_member(p_room, p_user) $$;

-- 12. Grants: only the functions created here are touched -------------------
revoke execute on function
  private.guard_personal_membership(), private.guard_personal_type(), private.cleanup_member_shares(),
  private.ml_module_sql(text, text[]), private.ml_valid_appearance(text, text),
  private.ensure_personal_space(),
  private.create_space(text, text, text[], text[], text, text),
  private.update_space(uuid, text, text, text[], text[], text, text),
  private.remove_space_member(uuid, uuid)
from public, anon;

revoke execute on function
  public.ensure_personal_space(),
  public.create_space(text, text, text[], text[], text, text),
  public.update_space(uuid, text, text, text[], text[], text, text),
  public.remove_space_member(uuid, uuid)
from public, anon;

grant usage on schema private to authenticated;
grant execute on function
  private.ensure_personal_space(),
  private.create_space(text, text, text[], text[], text, text),
  private.update_space(uuid, text, text, text[], text[], text, text),
  private.remove_space_member(uuid, uuid)
to authenticated;
grant execute on function
  public.ensure_personal_space(),
  public.create_space(text, text, text[], text[], text, text),
  public.update_space(uuid, text, text, text[], text[], text, text),
  public.remove_space_member(uuid, uuid)
to authenticated;

commit;

-- Ask PostgREST to pick up the new functions immediately.
notify pgrst, 'reload schema';
