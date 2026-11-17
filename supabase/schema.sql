-- ManaLife V1 • Run in the SQL Editor of a NEW Supabase project.
-- One owner + one invited household member. All content is shared inside the household.
-- No per-item private mode: members can see every task/bill/event of their home.
-- IMPORTANT: Run setup-owner.sql after this script (set YOUR verified email).

create extension if not exists pgcrypto;
create schema if not exists private;

-- Owner invitation is provisioned by the database administrator, never the browser.
create table private.allowed_owners (
  email text primary key check (email = lower(trim(email)))
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  created_at timestamptz not null default now()
);
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id,user_id)
);
create table private.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  email text not null,
  code uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '48 hours',
  used_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_members_user on public.household_members(user_id);
create index idx_invites_code on private.invitations(code);

-- SECURITY DEFINER helpers exist only in the non-exposed private schema.
create or replace function private.is_household_member(p_household uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.household_members m
  where m.household_id=p_household and m.user_id=(select auth.uid())
) $$;

create or replace function private.shares_household(p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (
  select 1 from public.household_members a
  join public.household_members b on a.household_id=b.household_id
  where a.user_id=(select auth.uid()) and b.user_id=p_user
) $$;

create or replace function private.verified_email()
returns text language sql stable security definer set search_path = ''
as $$
  select lower(u.email) from auth.users u
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null
$$;

create or replace function private.create_household(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_household uuid; v_email text;
begin
  v_email:=private.verified_email();
  if v_email is null then raise exception 'Please verify your email first'; end if;
  if not exists(select 1 from private.allowed_owners where email=v_email) then
    raise exception 'This email is not approved as a ManaLife household owner';
  end if;
  if length(trim(coalesce(p_name,''))) not between 1 and 100 then raise exception 'Invalid household name'; end if;
  if exists(select 1 from public.household_members where user_id=(select auth.uid())) then
    raise exception 'Already a household member';
  end if;
  if exists(select 1 from public.households where created_by=(select auth.uid())) then
    raise exception 'Household already created';
  end if;
  insert into public.households(name,created_by)
  values(trim(p_name),auth.uid()) returning id into v_household;
  insert into public.household_members(household_id,user_id,role)
  values(v_household,auth.uid(),'owner');
  return v_household;
end; $$;

create or replace function private.create_invite(p_email text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_household uuid; v_code uuid; v_email text;
begin
  v_email:=lower(trim(coalesce(p_email,'')));
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address';
  end if;
  select household_id into v_household from public.household_members
  where user_id=(select auth.uid()) and role='owner';
  if v_household is null then raise exception 'Only a household owner can invite'; end if;
  if (select count(*) from public.household_members where household_id=v_household)>=2 then
    raise exception 'This household already has two members';
  end if;
  if v_email=private.verified_email() then raise exception 'You cannot invite yourself'; end if;
  -- Invalidate any previous invitation to this household (one active partner invitation).
  delete from private.invitations where household_id=v_household and used_at is null;
  insert into private.invitations(household_id,email,created_by)
  values(v_household,v_email,auth.uid()) returning code into v_code;
  return v_code::text;
end; $$;

create or replace function private.accept_invite(p_code text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_invite private.invitations%rowtype; v_email text;
begin
  v_email:=private.verified_email();
  if v_email is null then raise exception 'Please verify your email first'; end if;
  if exists(select 1 from public.household_members where user_id=(select auth.uid())) then
    raise exception 'Already a household member';
  end if;
  begin
    select * into v_invite from private.invitations
    where code=p_code::uuid and used_at is null and expires_at>now() for update;
  exception when invalid_text_representation then raise exception 'Invalid invitation code';
  end;
  if v_invite.id is null or v_invite.email<>v_email then
    raise exception 'Invalid, expired or wrong-email invitation';
  end if;
  if (select count(*) from public.household_members where household_id=v_invite.household_id)>=2 then
    raise exception 'Household is full';
  end if;
  insert into public.household_members(household_id,user_id,role)
  values(v_invite.household_id,auth.uid(),'member');
  update private.invitations set used_at=now() where id=v_invite.id;
  return v_invite.household_id;
end; $$;

-- Browser-callable RPCs are invoker wrappers, not exposed security-definer functions.
create function public.create_household(p_name text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_household(p_name) $$;
create function public.create_invite(p_email text)
returns text language sql security invoker set search_path = ''
as $$ select private.create_invite(p_email) $$;
create function public.accept_invite(p_code text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.accept_invite(p_code) $$;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 180),
  description text not null default '',
  category text not null default 'Home',
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  assigned_to uuid references auth.users(id),
  due_on date not null,
  time text,
  repeat text not null default 'none' check(repeat in ('none','daily','weekly','monthly')),
  created_at timestamptz not null default now()
);
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  occurrence_on date not null,
  completed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(task_id,occurrence_on)
);
create table public.groceries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 150),
  quantity text not null default '',
  checked boolean not null default false,
  added_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 160),
  amount numeric(12,2) not null default 0 check(amount>=0),
  category text not null default 'Other',
  due_on date not null,
  repeat text not null default 'monthly' check(repeat in ('none','monthly')),
  created_at timestamptz not null default now()
);
create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  occurrence_on date not null,
  completed_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique(bill_id,occurrence_on)
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null check (length(trim(title)) between 1 and 180),
  event_date date not null,
  time text,
  category text not null default 'Family',
  created_at timestamptz not null default now()
);

create index idx_tasks_household on public.tasks(household_id,due_on);
create index idx_groceries_household on public.groceries(household_id);
create index idx_bills_household on public.bills(household_id,due_on);
create index idx_events_household on public.events(household_id,event_date);
create index idx_completions_task on public.task_completions(task_id,occurrence_on);
create index idx_payments_bill on public.bill_payments(bill_id,occurrence_on);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'),''),split_part(new.email,'@',1),'Member'));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

-- Immutable owner / household IDs prevent a member from re-homing content.
create or replace function private.protect_content_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.household_id is distinct from old.household_id
     or new.owner_id is distinct from old.owner_id then
    raise exception 'Cannot change household or owner';
  end if;
  return new;
end; $$;
create trigger task_protect before update on public.tasks for each row execute function private.protect_content_identity();
create trigger bill_protect before update on public.bills for each row execute function private.protect_content_identity();
create trigger event_protect before update on public.events for each row execute function private.protect_content_identity();

create or replace function private.validate_task_assignment()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.assigned_to is not null and not exists(
    select 1 from public.household_members
    where household_id=new.household_id and user_id=new.assigned_to
  ) then raise exception 'Assignee is not in this household'; end if;
  return new;
end; $$;
create trigger validate_assignment before insert or update on public.tasks
for each row execute function private.validate_task_assignment();

create or replace function private.protect_grocery_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.household_id is distinct from old.household_id or new.added_by is distinct from old.added_by then
    raise exception 'Cannot change grocery household or creator';
  end if;
  return new;
end; $$;
create trigger grocery_protect before update on public.groceries for each row
execute function private.protect_grocery_identity();

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table private.allowed_owners enable row level security;
alter table private.invitations enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.groceries enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.events enable row level security;

create policy profile_select on public.profiles for select to authenticated
using (id=(select auth.uid()) or private.shares_household(id));
create policy profile_update on public.profiles for update to authenticated
using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy household_select on public.households for select to authenticated
using(private.is_household_member(id));
create policy member_select on public.household_members for select to authenticated
using(private.is_household_member(household_id));

create policy task_select on public.tasks for select to authenticated
using(private.is_household_member(household_id));
create policy task_insert on public.tasks for insert to authenticated
with check(private.is_household_member(household_id) and owner_id=(select auth.uid()));
create policy task_update on public.tasks for update to authenticated
using(private.is_household_member(household_id))
with check(private.is_household_member(household_id));
create policy task_delete on public.tasks for delete to authenticated
using(private.is_household_member(household_id));

create policy completion_select on public.task_completions for select to authenticated
using(exists(select 1 from public.tasks t where t.id=task_id));
create policy completion_insert on public.task_completions for insert to authenticated
with check(completed_by=(select auth.uid()) and exists(select 1 from public.tasks t where t.id=task_id));
create policy completion_delete on public.task_completions for delete to authenticated
using(exists(select 1 from public.tasks t where t.id=task_id));

create policy grocery_select on public.groceries for select to authenticated
using(private.is_household_member(household_id));
create policy grocery_insert on public.groceries for insert to authenticated
with check(private.is_household_member(household_id) and added_by=(select auth.uid()));
create policy grocery_update on public.groceries for update to authenticated
using(private.is_household_member(household_id)) with check(private.is_household_member(household_id));
create policy grocery_delete on public.groceries for delete to authenticated
using(private.is_household_member(household_id));

create policy bill_select on public.bills for select to authenticated
using(private.is_household_member(household_id));
create policy bill_insert on public.bills for insert to authenticated
with check(private.is_household_member(household_id) and owner_id=(select auth.uid()));
create policy bill_update on public.bills for update to authenticated
using(private.is_household_member(household_id))
with check(private.is_household_member(household_id));
create policy bill_delete on public.bills for delete to authenticated
using(private.is_household_member(household_id));
create policy payment_select on public.bill_payments for select to authenticated
using(exists(select 1 from public.bills b where b.id=bill_id));
create policy payment_insert on public.bill_payments for insert to authenticated
with check(completed_by=(select auth.uid()) and exists(select 1 from public.bills b where b.id=bill_id));
create policy payment_delete on public.bill_payments for delete to authenticated
using(exists(select 1 from public.bills b where b.id=bill_id));

create policy event_select on public.events for select to authenticated
using(private.is_household_member(household_id));
create policy event_insert on public.events for insert to authenticated
with check(private.is_household_member(household_id) and owner_id=(select auth.uid()));
create policy event_update on public.events for update to authenticated
using(private.is_household_member(household_id))
with check(private.is_household_member(household_id));
create policy event_delete on public.events for delete to authenticated
using(private.is_household_member(household_id));

-- Explicit grants. Signed-out users cannot access any application tables or RPCs.
revoke all on schema private from public, anon, authenticated;
revoke all on all tables in schema public from anon;
revoke all on all tables in schema private from anon, authenticated;
revoke all on all tables in schema public from authenticated;
revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_household_member(uuid), private.shares_household(uuid),
  private.create_household(text), private.create_invite(text), private.accept_invite(text) to authenticated;
grant execute on function public.create_household(text), public.create_invite(text), public.accept_invite(text)
  to authenticated;
grant select,update on public.profiles to authenticated;
grant select on public.households, public.household_members to authenticated;
grant select,insert,update,delete on public.tasks, public.task_completions, public.groceries,
  public.bills, public.bill_payments, public.events to authenticated;

-- Security: service role and postgres only for administrative owner allowlist/invite table.
-- Never place service_role/secret key in the frontend or GitHub repository.
