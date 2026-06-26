-- ============================================================
-- Migration: Founder badge — first 50 signups get founder status
-- Run this in Supabase → SQL Editor
-- ============================================================

-- A view that ranks every profile by signup time and flags the
-- earliest 50 as founders. Because it's computed from created_at,
-- founder status is assigned automatically as people sign up and
-- can never be gamed or accidentally reassigned.
create or replace view public.founder_status as
select
  p.id,
  p.full_name,
  p.created_at,
  row_number() over (order by p.created_at asc) as signup_rank,
  (row_number() over (order by p.created_at asc) <= 50) as is_founder
from public.profiles p;

-- Allow anyone signed in to read founder status (so the app can show
-- a user their own badge, and show the "X of 50 claimed" counter).
-- Views inherit RLS from underlying tables, but we expose a couple of
-- security-definer helper functions so a user can check status without
-- being able to read everyone else's rows.

-- Returns the founder info for the currently signed-in user.
create or replace function public.my_founder_status()
returns table (is_founder boolean, signup_rank bigint)
language sql
security definer
set search_path = public
as $$
  select fs.is_founder, fs.signup_rank
  from public.founder_status fs
  where fs.id = auth.uid();
$$;

-- Returns how many of the 50 founder spots have been claimed so far.
create or replace function public.founder_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select least(count(*), 50)::integer from public.profiles;
$$;

grant execute on function public.my_founder_status() to authenticated;
grant execute on function public.founder_count() to authenticated, anon;
