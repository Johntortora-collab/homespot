-- ============================================================
-- Migration: expose the live offer's ID (not just its text)
--
-- spots_with_stamps only surfaced `latest_offer` (the message string), so the
-- app had no offer id to claim against. Adding latest_offer_id lets the
-- consumer actually claim the deal.
-- ============================================================

drop view if exists public.spots_with_stamps;

create view public.spots_with_stamps as
  select
    s.*,
    t.name as town_name,
    t.state as town_state,
    coalesce(sc.stamps, 0) as my_stamps,
    coalesce(sc.lifetime, 0) as my_lifetime,
    (
      select o.message from public.offers o
      where o.spot_id = s.id and o.active
        and (o.expires_at is null or o.expires_at > now())
      order by o.sent_at desc limit 1
    ) as latest_offer,
    (
      select o.id from public.offers o
      where o.spot_id = s.id and o.active
        and (o.expires_at is null or o.expires_at > now())
      order by o.sent_at desc limit 1
    ) as latest_offer_id
  from public.spots s
  join public.towns t on t.id = s.town_id
  left join public.stamp_cards sc on sc.spot_id = s.id and sc.user_id = auth.uid();
