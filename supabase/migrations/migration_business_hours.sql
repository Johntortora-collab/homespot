-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — opening hours on business listings
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Free text, not seven rows of open/close times.
--
-- Structured hours would let the app show "Open now" and filter on it, which is
-- genuinely better — but it means an owner filling in fourteen time fields
-- during signup, and half of them won't. A single line they can type however
-- they like ("Tue–Sat 7–3, closed Mondays") gets filled in; a form doesn't.
-- Worth revisiting once businesses are actually on board and asking for it.
alter table public.spots
  add column if not exists hours text;

-- Expose it through the view the consumer app reads. Same story as photo_url
-- and spot_type: a column on the table is invisible until the view carries it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='spots_with_stamps'
      and column_name='hours'
  ) then
    raise notice 'hours already exposed on the view — nothing to do';

  elsif to_regclass('public.spots_with_stamps_base') is not null then
    execute 'create or replace view public.spots_with_stamps as
             select b.*, s.photo_url, s.spot_type, s.hours
               from public.spots_with_stamps_base b
               left join public.spots s on s.id = b.id';

  else
    raise exception
      'spots_with_stamps_base not found. Check pg_get_viewdef(''public.spots_with_stamps'') before continuing.';
  end if;
end $$;

-- Also surface it on the draft preview, so a business you are pitching sees
-- their own hours on the demo page.
create or replace function public.get_draft_spot(p_spot_id uuid)
returns table (
  id uuid, name text, emoji text, category text, tagline text,
  perk text, stamps_required int, photo_url text, spot_type text,
  phone text, address text, color text, hours text, website text,
  town_name text, town_state text,
  is_claimed boolean
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.emoji, s.category, s.tagline,
         s.perk, s.stamps_required, s.photo_url, s.spot_type,
         s.phone, s.address, s.color, s.hours, s.website,
         t.name, t.state,
         (s.owner_id is not null) as is_claimed
  from public.spots s
  left join public.towns t on t.id = s.town_id
  where s.id = p_spot_id
    and s.claim_code is not null
$$;

grant execute on function public.get_draft_spot(uuid) to anon, authenticated;
