-- ============================================================
-- Migration: admin create/edit businesses + respond to feedback
-- ============================================================

-- ── Feedback responses ───────────────────────────────────────
alter table public.feedback
  add column if not exists response       text,
  add column if not exists responded_at   timestamptz,
  add column if not exists responded_by   uuid references public.profiles(id);

-- Admin: create a business on behalf of an owner (or ownerless).
-- owner_id is optional — pass null for a business with no owner account yet.
create or replace function public.admin_create_spot(
  p_owner_id uuid,
  p_town_id uuid,
  p_name text,
  p_emoji text,
  p_category text,
  p_tagline text,
  p_perk text,
  p_stamps_required int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  resolved_owner uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  -- owner_id is NOT NULL on spots; if none given, attribute to the admin so the
  -- row is valid. The admin can reassign later from the Users/Businesses tabs.
  resolved_owner := coalesce(p_owner_id, auth.uid());

  insert into public.spots (owner_id, town_id, name, emoji, category, tagline, perk, stamps_required)
  values (resolved_owner, p_town_id, p_name, coalesce(p_emoji,'🏪'), p_category, p_tagline, p_perk, coalesce(p_stamps_required, 8))
  returning id into new_id;

  return new_id;
end;
$$;

-- Admin: edit any business.
create or replace function public.admin_update_spot(
  p_spot_id uuid,
  p_name text,
  p_emoji text,
  p_category text,
  p_tagline text,
  p_perk text,
  p_stamps_required int,
  p_town_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  update public.spots set
    name = p_name,
    emoji = coalesce(p_emoji, emoji),
    category = p_category,
    tagline = p_tagline,
    perk = p_perk,
    stamps_required = coalesce(p_stamps_required, stamps_required),
    town_id = coalesce(p_town_id, town_id)
  where id = p_spot_id;
end;
$$;

-- Admin: respond to a piece of feedback.
create or replace function public.admin_respond_feedback(p_feedback_id uuid, p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  update public.feedback set
    response = p_response,
    responded_at = now(),
    responded_by = auth.uid(),
    read = true
  where id = p_feedback_id;
end;
$$;

grant execute on function public.admin_create_spot(uuid,uuid,text,text,text,text,text,int) to authenticated;
grant execute on function public.admin_update_spot(uuid,text,text,text,text,text,int,uuid)   to authenticated;
grant execute on function public.admin_respond_feedback(uuid,text)                           to authenticated;

-- admin_feedback() needs to return the response too — rebuild it.
create or replace function public.admin_feedback()
returns table (
  id uuid, mood int, note text, spot_name text, created_at timestamptz,
  response text, responded_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  return query
  select f.id, f.mood, f.note, s.name as spot_name, f.created_at,
         f.response, f.responded_at
  from public.feedback f
  join public.spots s on s.id = f.spot_id
  order by f.created_at desc
  limit 200;
end;
$$;

grant execute on function public.admin_feedback() to authenticated;

-- admin_spots list needs owner_id + town_id so the edit form can prefill.
-- (admin_offers/admin_users unchanged.)
