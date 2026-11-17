-- Run AFTER schema.sql in Supabase SQL Editor.
-- Change the email below to YOUR verified email address.
-- This is what blocks random sign-ups from creating a household.
insert into private.allowed_owners(email)
values ('mandadibenno@gmail.com')
on conflict (email) do nothing;
