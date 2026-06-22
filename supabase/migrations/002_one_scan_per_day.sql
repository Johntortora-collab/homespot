-- ============================================================
-- Migration: Limit stamp scans to once per day per user per spot
--
-- ONLY RUN THIS if your database was set up before this constraint
-- was added to 001_schema.sql. If you're setting up Homespot fresh,
-- 001_schema.sql already includes this — skip this file entirely.
--
-- Run this in Supabase → SQL Editor (safe to run even if already applied,
-- thanks to the "if not exists" guards)
-- ============================================================

-- Add a generated date column based on when the visit happened (UTC day)
alter table public.visits
  add column if not exists visit_date date
  generated always as ( (created_at at time zone 'utc')::date ) stored;

-- Enforce one scan per user per spot per day at the database level
create unique index if not exists visits_one_per_day
  on public.visits (user_id, spot_id, visit_date);
