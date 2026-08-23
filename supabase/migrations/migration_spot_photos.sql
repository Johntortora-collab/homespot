-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — business photos
-- Run this in the Supabase SQL editor BEFORE deploying the app changes.
-- Safe to re-run: every statement is guarded.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. The column ─────────────────────────────────────────────────────────────
alter table public.spots
  add column if not exists photo_url text;

-- Reject anything that isn't a plain http(s) URL. Same reasoning as the
-- website field: this string ends up in a src attribute on a page customers
-- load, so a javascript: or data: URL has no business being storable.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'spots_photo_url_scheme'
  ) then
    alter table public.spots
      add constraint spots_photo_url_scheme
      check (photo_url is null or photo_url ~* '^https?://');
  end if;
end $$;

-- 2. The storage bucket ─────────────────────────────────────────────────────
-- Public read: these are storefront photos meant to be seen by everyone,
-- and a public bucket means plain <img src> with no signed-URL round trip.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'spot-photos',
  'spot-photos',
  true,
  5242880,                                             -- 5MB ceiling
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- 3. Storage policies ───────────────────────────────────────────────────────
-- Files are written to {user_id}/{uuid}.jpg. The folder check is what stops
-- one owner from overwriting or deleting another owner's photo — without it,
-- any authenticated user could write anywhere in the bucket.

drop policy if exists "spot photos are publicly readable" on storage.objects;
create policy "spot photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'spot-photos');

drop policy if exists "owners upload to their own folder" on storage.objects;
create policy "owners upload to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'spot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owners update their own photos" on storage.objects;
create policy "owners update their own photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'spot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "owners delete their own photos" on storage.objects;
create policy "owners delete their own photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'spot-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. CHECK YOUR VIEW ────────────────────────────────────────────────────────
-- The consumer app reads spots through `spots_with_stamps`, not `spots`.
-- If that view lists columns explicitly, photo_url will NOT appear in it and
-- every photo will silently render as missing. Run this first:
--
--     select pg_get_viewdef('public.spots_with_stamps', true);
--
-- If you see `select s.*` — you're done, nothing else to do.
-- If you see a column list (s.id, s.name, s.emoji, ...), copy that definition,
-- add `s.photo_url,` to the list, and recreate it with CREATE OR REPLACE VIEW.
-- Column ORDER matters to CREATE OR REPLACE: append the new column at the END
-- of the select list, or Postgres will refuse with "cannot change name of
-- view column". If it refuses anyway, DROP VIEW then CREATE.
