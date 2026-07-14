-- ============================================================
-- Migration: offers can expire, or be switched off manually
-- Run this in Supabase → SQL Editor
-- ============================================================

-- expires_at NULL  = runs until the owner ends it manually
-- active     false = owner ended it early
alter table public.offers
  add column if not exists expires_at timestamptz,
  add column if not exists active     boolean not null default true;

-- Keep the "is this offer still live?" lookup fast
create index if not exists offers_live_idx
  on public.offers (spot_id, sent_at desc)
  where active;

-- ── Rebuild spots_with_stamps so latest_offer only shows LIVE offers ──
-- Previously it grabbed the most recent offer regardless of age or status,
-- so a promo from three months ago would still show a PERK badge forever.
-- Column list below is identical to 001_schema.sql; ONLY the latest_offer
-- subquery changed.
drop view if exists public.spots_with_stamps;

create view public.spots_with_stamps as
  select
    s.*,
    t.name as town_name,
    t.state as town_state,
    coalesce(sc.stamps, 0) as my_stamps,
    coalesce(sc.lifetime, 0) as my_lifetime,
    (
      select o.message
      from public.offers o
      where o.spot_id = s.id
        and o.active
        and (o.expires_at is null or o.expires_at > now())
      order by o.sent_at desc
      limit 1
    ) as latest_offer
  from public.spots s
  join public.towns t on t.id = s.town_id
  left join public.stamp_cards sc on sc.spot_id = s.id and sc.user_id = auth.uid();
