-- 022_spot_photo_aspect.sql
--
-- Per-business photo shape. A pizzeria whose only usable image is a square
-- logo shouldn't have it letterboxed into a 16:9 banner, and a storefront
-- shouldn't be squeezed into a square. The owner picks; the crop editor and
-- every surface that renders the photo follow.
--
-- Three shapes only. A free-form ratio would be a decision nobody wants to
-- make, and it would let an owner produce a listing that breaks the feed.
--
--   wide   16/9   storefronts, counters, interiors
--   square 1/1    logos, a single dish
--   tall   4/5    menu boards, vertical signage
--
-- Existing spots default to 'wide', which is what PHOTO_ASPECT already was,
-- so Deli King and Pompeii keep exactly the framing they have today.

begin;

-- ── Column ───────────────────────────────────────────────────────────────────

alter table public.spots
  add column if not exists photo_aspect text not null default 'wide';

alter table public.spots
  drop constraint if exists spots_photo_aspect_check;

alter table public.spots
  add constraint spots_photo_aspect_check
  check (photo_aspect in ('wide', 'square', 'tall'));

-- ── View ─────────────────────────────────────────────────────────────────────
-- Reproduced verbatim from the live definition with photo_aspect appended.
-- Postgres only allows create-or-replace to add columns at the end, so the
-- existing order is load-bearing — do not tidy it.

create or replace view public.spots_with_stamps as
 SELECT b.id,
    b.owner_id,
    b.town_id,
    b.name,
    b.emoji,
    b.category,
    b.tagline,
    b.phone,
    b.address,
    b.stamps_required,
    b.perk,
    b.active,
    b.color,
    b.created_at,
    b.town_name,
    b.town_state,
    b.my_stamps,
    b.my_lifetime,
    b.latest_offer,
    b.latest_offer_id,
    b.website,
    s.photo_url,
    s.spot_type,
    s.hours,
    s.lat,
    s.lng,
    s.photo_aspect
   FROM spots_with_stamps_base b
     LEFT JOIN spots s ON s.id = b.id;

-- ── get_draft_spot ───────────────────────────────────────────────────────────
-- Feeds the preview page an owner sees after scanning the flyer QR. Its return
-- columns change, and Postgres won't replace a function's output signature in
-- place, so this one gets dropped first.

drop function if exists public.get_draft_spot(uuid);

create function public.get_draft_spot(p_spot_id uuid)
returns table (
  id uuid, name text, emoji text, category text, tagline text, perk text,
  stamps_required integer, photo_url text, spot_type text, phone text,
  address text, color text, hours text, website text,
  town_name text, town_state text, is_claimed boolean, photo_aspect text
)
language sql
security definer
set search_path to 'public'
as $function$
  select s.id, s.name, s.emoji, s.category, s.tagline,
         s.perk, s.stamps_required, s.photo_url, s.spot_type,
         s.phone, s.address, s.color, s.hours, s.website,
         t.name, t.state,
         (s.owner_id is not null) as is_claimed,
         s.photo_aspect
  from public.spots s
  left join public.towns t on t.id = s.town_id
  where s.id = p_spot_id
    and s.claim_code is not null
$function$;

-- ── admin_draft_spots ────────────────────────────────────────────────────────
-- Same reason: the shape has to come back with the row, or the picker in the
-- admin panel would reset to "Wide" on every reload while the stored photo
-- stayed square.

drop function if exists public.admin_draft_spots();

create function public.admin_draft_spots()
returns table (
  id uuid, name text, category text, emoji text, address text, claim_code text,
  photo_url text, spot_type text, perk text, lat double precision,
  lng double precision, town_name text, is_claimed boolean,
  claimed_at timestamp with time zone, created_at timestamp with time zone,
  photo_aspect text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Admins only.';
  end if;

  return query
    select s.id, s.name, s.category, s.emoji, s.address,
           s.claim_code, s.photo_url, s.spot_type, s.perk,
           s.lat, s.lng,
           t.name, (s.owner_id is not null), s.claimed_at, s.created_at,
           s.photo_aspect
    from public.spots s
    left join public.towns t on t.id = s.town_id
    where s.claim_code is not null or s.claimed_at is not null
    order by (s.owner_id is not null), s.name;
end $function$;

-- ── admin_set_spot_photo ─────────────────────────────────────────────────────
-- Gains the shape, and also the original URL. Until now the admin pages threw
-- the uncropped original away, so a photo you added for an owner could never be
-- re-framed by them — they'd hit "replace it to enable adjusting". Both admin
-- surfaces were losing it; this is where the fix belongs.
--
-- Nulls mean "leave alone" rather than "clear", so an older caller passing only
-- a URL keeps working. The one exception is clearing the photo outright, which
-- drops the original with it — keeping an orphan there would be worse.

drop function if exists public.admin_set_spot_photo(uuid, text);

create function public.admin_set_spot_photo(
  p_spot_id      uuid,
  p_photo_url    text,
  p_photo_aspect text default null,
  p_original_url text default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return json_build_object('ok', false, 'error', 'Admins only.');
  end if;

  -- Null clears the photo; anything else must be a plain http(s) URL. Same
  -- reasoning as the column constraint — this string ends up in a src
  -- attribute on a page customers load.
  if p_photo_url is not null and p_photo_url !~* '^https?://' then
    return json_build_object('ok', false, 'error', 'Photo URL must start with http:// or https://');
  end if;

  if p_original_url is not null and p_original_url !~* '^https?://' then
    return json_build_object('ok', false, 'error', 'Original photo URL must start with http:// or https://');
  end if;

  if p_photo_aspect is not null and p_photo_aspect not in ('wide', 'square', 'tall') then
    return json_build_object('ok', false, 'error', 'Photo shape must be wide, square, or tall.');
  end if;

  update public.spots
     set photo_url          = p_photo_url,
         photo_aspect       = coalesce(p_photo_aspect, photo_aspect),
         photo_original_url = case
                                when p_photo_url is null then null
                                else coalesce(p_original_url, photo_original_url)
                              end,
         -- The admin pages don't track saved framing, so anything stored here
         -- belongs to a previous photo or a previous shape. Clearing it means
         -- the owner's Adjust dialog opens centred instead of on framing that
         -- no longer matches the image.
         photo_crop         = null
   where id = p_spot_id;

  if not found then
    return json_build_object('ok', false, 'error', 'That business no longer exists.');
  end if;

  return json_build_object('ok', true);
end $function$;

commit;
