-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — map coordinates
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.spots add column if not exists lat double precision;
alter table public.spots add column if not exists lng double precision;

-- Catch a swapped pair or a bad geocode before it puts a Clark bakery in the
-- Indian Ocean. Both must be set together — half a coordinate is useless.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'spots_coords_valid') then
    alter table public.spots
      add constraint spots_coords_valid
      check (
        (lat is null and lng is null)
        or (lat between -90 and 90 and lng between -180 and 180)
      );
  end if;
end $$;

-- Expose through the view the consumer app reads.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='spots_with_stamps' and column_name='lat'
  ) then
    raise notice 'lat/lng already exposed on the view — nothing to do';

  elsif to_regclass('public.spots_with_stamps_base') is not null then
    execute 'create or replace view public.spots_with_stamps as
             select b.*, s.photo_url, s.spot_type, s.hours, s.lat, s.lng
               from public.spots_with_stamps_base b
               left join public.spots s on s.id = b.id';

  else
    raise exception
      'spots_with_stamps_base not found. Check pg_get_viewdef(''public.spots_with_stamps'') before continuing.';
  end if;
end $$;

-- Admins set coordinates, since they own the geocoding step. Owners never
-- touch these directly — a business dragging its own pin to the wrong block
-- helps nobody.
create or replace function public.admin_set_spot_coords(
  p_spot_id uuid,
  p_lat     double precision,
  p_lng     double precision
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return json_build_object('ok', false, 'error', 'Admins only.');
  end if;

  update public.spots set lat = p_lat, lng = p_lng where id = p_spot_id;
  if not found then
    return json_build_object('ok', false, 'error', 'That business no longer exists.');
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.admin_set_spot_coords(uuid, double precision, double precision) from public, anon;
grant execute on function public.admin_set_spot_coords(uuid, double precision, double precision) to authenticated;

-- Which listings still need placing:
--   select name, address from public.spots where lat is null and address is not null;

-- ── Admin draft list needs the new columns ─────────────────────────────────
-- Return type changes require a drop first; CREATE OR REPLACE can't reshape it.
drop function if exists public.admin_draft_spots();

create or replace function public.admin_draft_spots()
returns table (
  id uuid, name text, category text, emoji text, address text,
  claim_code text, photo_url text, spot_type text, perk text,
  lat double precision, lng double precision,
  town_name text, is_claimed boolean, claimed_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Admins only.';
  end if;

  return query
    select s.id, s.name, s.category, s.emoji, s.address,
           s.claim_code, s.photo_url, s.spot_type, s.perk,
           s.lat, s.lng,
           t.name, (s.owner_id is not null), s.claimed_at, s.created_at
    from public.spots s
    left join public.towns t on t.id = s.town_id
    where s.claim_code is not null or s.claimed_at is not null
    order by (s.owner_id is not null), s.name;
end $$;

revoke all on function public.admin_draft_spots() from public, anon;
grant execute on function public.admin_draft_spots() to authenticated;
