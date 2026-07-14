-- ============================================================
-- Migration: let owners actually identify their customers
--
-- Fixes three things:
--  1. RLS on `profiles` was `for all using (auth.uid() = id)` — owners could
--     only read their OWN profile, so every customer joined as NULL and
--     showed up as "A customer" everywhere.
--  2. profiles had no email column at all.
--  3. The signup trigger only read raw_user_meta_data->>'full_name', but
--     Google OAuth puts the name under 'name' — so every Google signup got
--     an empty name.
-- ============================================================

-- ── 1. Store email on the profile ─────────────────────────
alter table public.profiles
  add column if not exists email text;

-- Backfill everyone who already signed up
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

-- ── 2. Fix the signup trigger ─────────────────────────────
-- Captures email, and checks Google's 'name' key as well as 'full_name'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    nullif(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',       -- Google uses this
      ''
    ), ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'consumer')
  );
  return new;
end;
$$;

-- Also backfill names for existing Google users who came through with a blank
update public.profiles p
set full_name = nullif(coalesce(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      ''
    ), '')
from auth.users u
where u.id = p.id
  and (p.full_name is null or p.full_name = '');

-- ── 3. Let owners see the customers who actually visited them ──
-- Scoped deliberately: an owner can only read the profile of someone who has
-- a visit or a redemption at THEIR spot. Not every user in the database.
create policy "profiles: owner sees their own customers" on public.profiles
  for select using (
    exists (
      select 1
      from public.visits v
      join public.spots s on s.id = v.spot_id
      where v.user_id = public.profiles.id
        and s.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.redemptions r
      join public.spots s on s.id = r.spot_id
      where r.user_id = public.profiles.id
        and s.owner_id = auth.uid()
    )
  );
