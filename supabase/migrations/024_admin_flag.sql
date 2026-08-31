-- 024_admin_flag.sql
-- Run AFTER 023_messages.sql.
--
-- App.jsx routes on profiles.role being 'owner' or not, so there is no 'admin'
-- role to check against — is_admin() as written in 023 would always be false.
-- A separate boolean keeps admin rights orthogonal to the role routing, which
-- also means granting someone admin can't accidentally change what app they
-- land in.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Set your own account. Replace the email with the one you sign in with.
update public.profiles p
   set is_admin = true
 where p.id = (select u.id from auth.users u where u.email = 'john.tortora@yahoo.com');

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  )
$$;

-- Confirm it took: should return true while signed in as you.
-- select public.is_admin();
