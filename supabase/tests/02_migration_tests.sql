\set ON_ERROR_STOP on
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'
\set HOME '10000000-0000-0000-0000-000000000001'
-- expect_fail(sql): passes only if the statement raises
create or replace function pg_temp.expect_fail(q text) returns text language plpgsql as $$
begin
  begin execute q; exception when others then return 'ok (rejected: ' || sqlerrm || ')'; end;
  raise exception 'EXPECTED FAILURE BUT SUCCEEDED: %', q;
end $$;

-- ===== Pre-migration data (must survive untouched) =====
insert into auth.users(id,email,email_confirmed_at) values (:'A','a@x.com',now()),(:'B','b@x.com',now()),(:'C','c@x.com',now());
insert into public.households(id,name,created_by,room_type) values (:'HOME','Our Home',:'A','family');
insert into public.household_members(household_id,user_id,role) values (:'HOME',:'A','owner'),(:'HOME',:'B','member');
insert into public.tasks(household_id,owner_id,title,due_on,assigned_to) values (:'HOME',:'A','Legacy task',current_date,:'B');
insert into public.period_shares(room_id,owner_id,viewer_id) values (:'HOME',:'A',:'B');
select count(*) as legacy_rows_before from public.tasks \gset

-- ===== Run migrations (twice = idempotent) =====
\i MIG1
\i MIG1
\i MIG2
\i MIG2
\echo '--- migrations applied twice without error'

select count(*) = :legacy_rows_before as legacy_tasks_intact from public.tasks;

-- ===== A: personal space =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
select public.ensure_personal_space() as pa \gset
select public.ensure_personal_space() = :'pa' as ensure_is_idempotent;
select room_type, enabled_modules is not null as has_modules from public.households where id = :'pa';
insert into public.tasks(household_id,owner_id,title,due_on) values (:'pa',:'A','Private task',current_date);
commit;

-- ===== Guards (even as superuser, bypassing RLS) =====
select pg_temp.expect_fail(format('insert into public.household_members(household_id,user_id,role) values (%L,%L,''member'')', :'pa', :'B')) as cannot_add_member_to_personal;
select pg_temp.expect_fail(format('update public.households set room_type=''family'' where id=%L', :'pa')) as cannot_convert_personal;
select pg_temp.expect_fail(format('update public.households set room_type=''personal'' where id=%L', :'HOME')) as cannot_convert_to_personal;
select pg_temp.expect_fail(format('insert into public.households(name,created_by,room_type) values (''Dup'',%L,''personal'')', :'A')) as one_personal_per_user;

-- ===== B cannot see or touch A's personal data =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'B', true);
select count(*) = 0 as b_cannot_see_a_personal_space from public.households where id = :'pa';
select count(*) = 0 as b_cannot_see_a_private_task from public.tasks where household_id = :'pa';
select pg_temp.expect_fail(format('insert into public.tasks(household_id,owner_id,title,due_on) values (%L,%L,''x'',current_date)', :'pa', :'B')) as b_cannot_write_into_a_space;
select pg_temp.expect_fail(format('select public.update_space(%L,''Hacked'',''personal'',array[''tasks''],array[]::text[])', :'pa')) as b_cannot_update_a_space;
select public.ensure_personal_space() as pb \gset
select :'pb' <> :'pa' as b_gets_own_space;
-- B creates a couple space
select public.create_space('B & C', 'couple', array['tasks','calendar','expenses'], array['calendar','medicines'], 'heart', 'rose') as couple \gset
select room_type, icon, accent from public.households where id = :'couple';
select pg_temp.expect_fail($q$select public.create_space('X','personal',array['tasks'],array[]::text[])$q$) as cannot_create_personal_via_create_space;
select pg_temp.expect_fail($q$select public.create_space('X','couple',array['medicines'],array[]::text[])$q$) as health_modules_not_shareable;
select pg_temp.expect_fail($q$select public.create_space('X','couple',array['tasks'],array[]::text[],'Bad Icon!')$q$) as icon_validated;
commit;
select overview_modules from public.households where id = :'couple';

-- ===== update_space: owner only =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'C', true);
select pg_temp.expect_fail(format('select public.update_space(%L,''X'',''family'',array[''tasks''],array[]::text[])', :'couple')) as non_member_cannot_update;
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
select public.update_space(:'HOME', 'Rao Home', 'family', array['tasks','groceries'], array['tasks'], 'house', 'amber');
select pg_temp.expect_fail(format('select public.update_space(%L,''My Space'',''family'',array[''tasks''],array[]::text[])', :'pa')) as personal_stays_personal;
select public.update_space(:'pa', 'Me', 'personal', array['tasks','medicines','periods'], array['tasks'], null, 'violet');
commit;
select name, room_type, icon, accent from public.households where id in (:'HOME', :'pa') order by name;

-- ===== remove_space_member + share revocation =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'B', true);
select pg_temp.expect_fail(format('select public.remove_space_member(%L,%L)', :'HOME', :'A')) as member_cannot_remove_owner;
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
select public.remove_space_member(:'HOME', :'B');
commit;
select count(*) = 0 as b_removed from public.household_members where household_id = :'HOME' and user_id = :'B';
select count(*) = 0 as cycle_share_revoked from public.period_shares where room_id = :'HOME';
select assigned_to is null as tasks_unassigned from public.tasks where title = 'Legacy task';

-- leaving (any path that deletes membership) also revokes shares
insert into public.household_members(household_id,user_id,role) values (:'couple',:'C','member');
insert into public.period_shares(room_id,owner_id,viewer_id) values (:'couple',:'B',:'C');
delete from public.household_members where household_id = :'couple' and user_id = :'C';
select count(*) = 0 as share_revoked_on_leave from public.period_shares where room_id = :'couple';

-- ===== Documents (002) =====
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'A', true);
insert into storage.objects(bucket_id,name) values ('space-documents', :'pa' || '/f1-passport.pdf');
insert into public.space_documents(household_id,uploaded_by,title,storage_path,file_name,size_bytes) values (:'pa',:'A','Passport',:'pa' || '/f1-passport.pdf','passport.pdf',100);
select pg_temp.expect_fail($q$insert into storage.objects(bucket_id,name) values ('space-documents','not-a-uuid/x.pdf')$q$) as malformed_path_rejected;
select pg_temp.expect_fail(format('insert into public.space_documents(household_id,uploaded_by,title,storage_path,file_name) values (%L,%L,''x'',%L,''x'')', :'pa', :'A', :'HOME' || '/x')) as path_must_match_space;
commit;
begin; set local role authenticated; select set_config('request.jwt.claim.sub', :'B', true);
select count(*) = 0 as b_cannot_list_a_documents from public.space_documents;
select count(*) = 0 as b_cannot_read_a_files from storage.objects where bucket_id = 'space-documents';
select pg_temp.expect_fail(format('insert into storage.objects(bucket_id,name) values (''space-documents'',%L)', :'pa' || '/evil.pdf')) as b_cannot_upload_into_a_space;
commit;

-- ===== Deleting a space with members/shares cascades cleanly =====
insert into public.household_members(household_id,user_id,role) values (:'couple',:'C','member');
insert into public.period_shares(room_id,owner_id,viewer_id) values (:'couple',:'B',:'C');
delete from public.households where id = :'couple';
select count(*) = 0 as couple_fully_deleted from public.household_members where household_id = :'couple';
\echo '=== ALL MIGRATION TESTS PASSED ==='
