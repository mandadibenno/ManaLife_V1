-- ManaLife • READ-ONLY schema export
-- Run this in the Supabase SQL Editor BEFORE applying any migration and save the results.
-- It changes nothing. It documents the live tables, constraints, RLS policies, functions,
-- triggers and storage buckets that are not yet tracked in this repository.
-- Each statement returns one result set; run them one at a time if your editor shows only the last.

-- 1. Tables and columns in public/private
select table_schema, table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema in ('public','private')
order by table_schema, table_name, ordinal_position;

-- 2. Constraints (checks, uniques, foreign keys)
select n.nspname as schema, c.relname as table_name, con.conname, con.contype,
       pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private')
order by 1,2,3;

-- 3. Row Level Security status
select n.nspname as schema, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and n.nspname in ('public','private')
order by 1,2;

-- 4. RLS policies (including storage)
select schemaname, tablename, policyname, cmd, roles, qual as using_expr, with_check
from pg_policies
where schemaname in ('public','private','storage')
order by 1,2,3;

-- 5. Full function definitions (RPCs and helpers)
select n.nspname as schema, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','private')
order by 1,2;

-- 6. Triggers
select event_object_schema as schema, event_object_table as table_name, trigger_name,
       action_timing, event_manipulation, action_statement
from information_schema.triggers
where event_object_schema in ('public','private')
order by 1,2,3;

-- 7. Table grants for API roles
select table_schema, table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema in ('public','private') and grantee in ('anon','authenticated')
group by 1,2,3 order by 1,2,3;

-- 8. Storage buckets
select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by id;
