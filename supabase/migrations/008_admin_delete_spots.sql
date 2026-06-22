-- ============================================================
-- Migration: allow admins to delete any spot (for moderation)
-- Run this in Supabase → SQL Editor
-- ============================================================

create policy "spots: admin delete" on public.spots
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Also let admins read every spot (regular public read policy already
-- covers active=true spots, but admins should see inactive ones too
-- if any get added later)
create policy "spots: admin read all" on public.spots
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
