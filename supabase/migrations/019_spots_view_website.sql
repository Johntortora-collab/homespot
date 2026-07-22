-- 019_spots_view_website.sql
-- Recreates spots_with_stamps so the website column added in 018 reaches the client.
--
-- Postgres expands SELECT * when a view is created, so a new column on the base
-- table never appears in an existing view. It has to be added explicitly.
--
-- NOTE: create or replace view cannot rename or reorder existing columns, so
-- s.website is appended at the END of the select list rather than sitting next
-- to s.tagline where it logically belongs. Moving it up would fail with
-- "cannot change name of view column". Grants and RLS survive this unchanged.

create or replace view public.spots_with_stamps as
 SELECT s.id,
    s.owner_id,
    s.town_id,
    s.name,
    s.emoji,
    s.category,
    s.tagline,
    s.phone,
    s.address,
    s.stamps_required,
    s.perk,
    s.active,
    s.color,
    s.created_at,
    t.name AS town_name,
    t.state AS town_state,
    COALESCE(sc.stamps, 0) AS my_stamps,
    COALESCE(sc.lifetime, 0) AS my_lifetime,
    ( SELECT o.message
           FROM offers o
          WHERE o.spot_id = s.id AND o.active AND (o.expires_at IS NULL OR o.expires_at > now())
          ORDER BY o.sent_at DESC
         LIMIT 1) AS latest_offer,
    ( SELECT o.id
           FROM offers o
          WHERE o.spot_id = s.id AND o.active AND (o.expires_at IS NULL OR o.expires_at > now())
          ORDER BY o.sent_at DESC
         LIMIT 1) AS latest_offer_id,
    s.website
   FROM spots s
     JOIN towns t ON t.id = s.town_id
     LEFT JOIN stamp_cards sc ON sc.spot_id = s.id AND sc.user_id = auth.uid();

-- PostgREST caches the schema; nudge it so the new column is visible immediately.
notify pgrst, 'reload schema';
