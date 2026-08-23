-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — draft listings you can demo, and an owner can claim on the spot
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- A draft is a real spots row with active = false and owner_id = null. It's
-- invisible on Main Street (useSpots filters on active), so you can build ten
-- of them for Clark businesses without any customer seeing a listing for a
-- shop that never agreed to be there.

alter table public.spots add column if not exists claim_code text;
alter table public.spots add column if not exists claimed_at timestamptz;

create unique index if not exists spots_claim_code_key
  on public.spots(claim_code) where claim_code is not null;

-- 1. Create a draft ─────────────────────────────────────────────────────────
-- Admin-only. Returns the id and the claim code — the code is what you read
-- out to the owner when they say yes.
create or replace function public.create_draft_spot(
  p_town_id         uuid,
  p_name            text,
  p_category        text,
  p_emoji           text default '🏪',
  p_tagline         text default null,
  p_perk            text default 'Free item on us',
  p_stamps_required int  default 8,
  p_spot_type       text default null,
  p_phone           text default null,
  p_address         text default null,
  p_photo_url       text default null
)
returns table (id uuid, name text, claim_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id   uuid;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Only an admin can create draft listings.';
  end if;

  -- No 0/O/1/I — this gets read aloud across a counter.
  v_code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                             floor(random()*32)::int + 1, 1), '')
    from generate_series(1,6)
  );

  insert into public.spots (
    town_id, name, category, emoji, tagline, perk, stamps_required,
    spot_type, phone, address, photo_url, color,
    owner_id, active, claim_code
  ) values (
    p_town_id, p_name, p_category, p_emoji, p_tagline, p_perk, p_stamps_required,
    p_spot_type, p_phone, p_address, p_photo_url, '#F5A623',
    null, false, v_code
  )
  returning spots.id into v_id;

  return query select v_id, p_name, v_code;
end $$;

revoke all on function public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text) from public, anon;
grant execute on function public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text) to authenticated;

-- 2. Read a draft for the preview page ──────────────────────────────────────
-- Runs as definer so the preview works for someone with no account at all —
-- which is the whole point, since you're showing this to a stranger.
-- Deliberately does NOT return claim_code: the URL alone must not be enough
-- to take over a listing.
create or replace function public.get_draft_spot(p_spot_id uuid)
returns table (
  id uuid, name text, emoji text, category text, tagline text,
  perk text, stamps_required int, photo_url text, spot_type text,
  phone text, address text, color text,
  town_name text, town_state text,
  is_claimed boolean
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.emoji, s.category, s.tagline,
         s.perk, s.stamps_required, s.photo_url, s.spot_type,
         s.phone, s.address, s.color,
         t.name, t.state,
         (s.owner_id is not null) as is_claimed
  from public.spots s
  left join public.towns t on t.id = s.town_id
  where s.id = p_spot_id
    and s.claim_code is not null
$$;

grant execute on function public.get_draft_spot(uuid) to anon, authenticated;

-- 3. Claim it ───────────────────────────────────────────────────────────────
-- The code is the authorization. Without it, anyone who saw the preview link
-- over the owner's shoulder could take the listing.
create or replace function public.claim_spot(p_spot_id uuid, p_code text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot public.spots%rowtype;
begin
  if auth.uid() is null then
    return json_build_object('ok', false, 'error', 'You need to be signed in to claim this listing.');
  end if;

  select * into v_spot from public.spots where id = p_spot_id;

  if not found then
    return json_build_object('ok', false, 'error', 'That listing no longer exists.');
  end if;

  if v_spot.owner_id is not null then
    return json_build_object('ok', false, 'error', 'This listing has already been claimed.');
  end if;

  -- Case-insensitive: the code gets read aloud and typed back, and rejecting
  -- "abc123" for "ABC123" is a bad moment to have while standing at a counter.
  if v_spot.claim_code is null or upper(trim(p_code)) <> upper(v_spot.claim_code) then
    return json_build_object('ok', false, 'error', 'That code does not match. Check with whoever set this up.');
  end if;

  update public.spots
     set owner_id   = auth.uid(),
         active     = true,
         claimed_at = now(),
         claim_code = null      -- single use
   where id = p_spot_id;

  -- They own a business now. Without this the app routes them to the consumer
  -- side and they never see their dashboard.
  update public.profiles set role = 'owner' where id = auth.uid();

  return json_build_object('ok', true, 'spot_id', p_spot_id);
end $$;

grant execute on function public.claim_spot(uuid, text) to authenticated;

-- 4. Your field list ────────────────────────────────────────────────────────
-- Every unclaimed draft with its code and preview path. Pull this up on your
-- phone before you walk in.
create or replace view public.draft_spots_admin as
  select s.id, s.name, s.category, s.claim_code,
         '/preview/' || s.id as preview_path,
         t.name as town, s.created_at
  from public.spots s
  left join public.towns t on t.id = s.town_id
  where s.claim_code is not null and s.owner_id is null
  order by s.created_at desc;

-- ═══════════════════════════════════════════════════════════════════════════
-- Creating a draft — edit and run:
--
--   select * from public.create_draft_spot(
--     p_town_id  => (select id from public.towns where name = 'Clark' limit 1),
--     p_name     => 'Rosa''s Bakery',
--     p_category => 'Bakery',
--     p_emoji    => '🥐',
--     p_tagline  => 'Family-owned since 1987',
--     p_perk     => 'Free coffee',
--     p_spot_type=> 'eat',
--     p_address  => '123 Westfield Ave'
--   );
--
-- Note the doubled apostrophe in 'Rosa''s' — that's how you escape a quote
-- inside a SQL string.
--
-- Then see everything you've built:
--   select * from public.draft_spots_admin;
-- ═══════════════════════════════════════════════════════════════════════════
