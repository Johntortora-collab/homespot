-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — stamps must be earned at the business
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The problem: /scan/{id} is a fixed URL. Bookmark it, text it to a friend,
-- and you can collect a stamp from your sofa. The once-a-day limit slows that
-- down; it doesn't stop it.
--
-- The bigger problem underneath: stamping happens entirely in the browser.
-- Anyone with the anon key (it ships in the JavaScript, by design) can INSERT
-- a visit row directly and skip the app altogether. Fixing the URL without
-- fixing that would just be theatre.
--
-- So: all stamping moves server-side, and the client loses permission to write
-- visits at all.

-- 1. Where the scan happened ────────────────────────────────────────────────
alter table public.visits add column if not exists lat double precision;
alter table public.visits add column if not exists lng double precision;

-- 2. Per-business switch ────────────────────────────────────────────────────
-- On by default, but an owner can turn it off. Some businesses genuinely want
-- it off — a food truck that moves, a market stall, somewhere with concrete
-- walls and no GPS. Forcing it everywhere would break those.
alter table public.spots
  add column if not exists require_presence boolean not null default true;

-- How far from the pin still counts. 200m is deliberately loose: phone GPS
-- indoors is routinely off by 50-100m, and a false "you're not here" while
-- someone stands at the counter is far worse than a rare false accept.
alter table public.spots
  add column if not exists presence_radius_m integer not null default 200;

-- 3. Distance in metres ─────────────────────────────────────────────────────
create or replace function public.meters_between(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

-- 4. The one way to earn a stamp ────────────────────────────────────────────
create or replace function public.claim_stamp(
  p_spot_id uuid,
  p_lat     double precision default null,
  p_lng     double precision default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot        public.spots%rowtype;
  v_card        public.stamp_cards%rowtype;
  v_uid         uuid := auth.uid();
  v_distance    double precision;
  v_new_stamps  int;
  v_perk_earned boolean := false;
  v_code        text;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select * into v_spot from public.spots where id = p_spot_id and active = true;
  if not found then
    return json_build_object('ok', false, 'reason', 'no_such_spot');
  end if;

  -- An owner stamping their own card is the other obvious hole.
  if v_spot.owner_id = v_uid then
    return json_build_object('ok', false, 'reason', 'own_spot');
  end if;

  -- ── Presence check ──────────────────────────────────────────────────────
  -- Only enforced when the business is actually placed on the map. A spot with
  -- no coordinates can't be checked against anything, and silently rejecting
  -- every scan there would look like a broken app rather than a missing pin.
  if v_spot.require_presence
     and v_spot.lat is not null and v_spot.lng is not null then

    if p_lat is null or p_lng is null then
      return json_build_object('ok', false, 'reason', 'need_location');
    end if;

    v_distance := public.meters_between(v_spot.lat, v_spot.lng, p_lat, p_lng);

    if v_distance > v_spot.presence_radius_m then
      return json_build_object(
        'ok', false, 'reason', 'too_far',
        'distance_m', round(v_distance)::int
      );
    end if;
  end if;

  -- ── One a day ───────────────────────────────────────────────────────────
  -- A rolling 24h window rather than a calendar day: the database runs in UTC,
  -- so "midnight" would fall at 8pm in New Jersey and a regular's evening visit
  -- would mysteriously not count.
  if exists (
    select 1 from public.visits
    where user_id = v_uid and spot_id = p_spot_id
      and created_at > now() - interval '20 hours'
  ) then
    return json_build_object('ok', false, 'reason', 'already_today');
  end if;

  insert into public.visits (user_id, spot_id, lat, lng)
  values (v_uid, p_spot_id, p_lat, p_lng);

  -- ── Stamp the card ──────────────────────────────────────────────────────
  select * into v_card from public.stamp_cards
   where user_id = v_uid and spot_id = p_spot_id;

  if found then
    v_perk_earned := (v_card.stamps + 1) >= v_spot.stamps_required;
    v_new_stamps  := case when v_perk_earned then 0 else v_card.stamps + 1 end;

    update public.stamp_cards
       set stamps = v_new_stamps, lifetime = v_card.lifetime + 1
     where id = v_card.id;
  else
    v_perk_earned := 1 >= v_spot.stamps_required;
    v_new_stamps  := case when v_perk_earned then 0 else 1 end;

    insert into public.stamp_cards (user_id, spot_id, stamps, lifetime)
    values (v_uid, p_spot_id, v_new_stamps, 1);
  end if;

  -- reward_text is snapshotted on purpose: if the owner changes their perk
  -- later, whoever already earned the old one still gets the old one.
  if v_perk_earned then
    v_code := upper(substr(md5(random()::text), 1, 6));
    insert into public.redemptions (user_id, spot_id, type, reward_text, code)
    values (v_uid, p_spot_id, 'stamp_card', coalesce(v_spot.perk, 'Your reward'), v_code);
  end if;

  return json_build_object(
    'ok', true,
    'perk_earned', v_perk_earned,
    'stamps', v_new_stamps,
    'stamps_required', v_spot.stamps_required
  );
end $$;

grant execute on function public.claim_stamp(uuid, double precision, double precision) to authenticated;

-- 5. Close the back door ────────────────────────────────────────────────────
-- Without this the function is decorative: the browser could keep inserting
-- visit rows directly and skip every check above. Revoking the table privilege
-- works regardless of what the RLS policies are named.
--
-- Reads are untouched — the app still needs them for stats and history.
revoke insert, update, delete on public.visits from authenticated, anon;

-- The definer function runs as the function owner, so it is unaffected.

-- ═══════════════════════════════════════════════════════════════════════════
-- Turning the check off for one business (a food truck, say):
--   update public.spots set require_presence = false where name = '...';
--
-- Loosening the radius for somewhere with bad signal:
--   update public.spots set presence_radius_m = 400 where name = '...';
--
-- IMPORTANT: presence only applies to businesses placed on the map. Place them
-- from /admin/drafts, or the check silently does nothing:
--   select name from public.spots where active and lat is null;
-- ═══════════════════════════════════════════════════════════════════════════
