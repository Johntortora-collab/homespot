-- ============================================================
-- Migration: town requests + admin role for managing towns
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── Town requests ─────────────────────────────────────────
-- Anyone (signed in) can request a town that isn't listed yet.
create table if not exists public.town_requests (
  id          uuid default uuid_generate_v4() primary key,
  requested_by uuid references public.profiles(id) on delete set null,
  town_name   text not null,
  state       text,
  note        text,
  status      text not null default 'pending' check (status in ('pending','added','declined')),
  created_at  timestamptz default now()
);

alter table public.town_requests enable row level security;

-- Anyone signed in can submit a request
create policy "town_requests: insert own" on public.town_requests
  for insert with check (auth.uid() = requested_by);

-- People can see their own requests
create policy "town_requests: read own" on public.town_requests
  for select using (auth.uid() = requested_by);

-- ── Admin role ────────────────────────────────────────────
-- Adds an is_admin flag to profiles. Set this manually for yourself —
-- see the bottom of this file for the one-time command.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Admins can read all town requests (regular users only see their own)
create policy "town_requests: admin read all" on public.town_requests
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Admins can update request status (mark added/declined)
create policy "town_requests: admin update" on public.town_requests
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Admins can insert/update/delete towns directly (regular users only get public read,
-- already covered by the existing "towns: public read" policy from 001_schema.sql)
create policy "towns: admin insert" on public.towns
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "towns: admin update" on public.towns
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "towns: admin delete" on public.towns
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ============================================================
-- ONE-TIME SETUP: make yourself an admin
-- Replace the email below with your own, then run just this line:
-- ============================================================
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
