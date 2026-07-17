-- ============================================================
-- Migration: full admin control center — stats, users, moderation
-- All functions are SECURITY DEFINER and check is_admin by hand,
-- so only admins can call them (they bypass RLS deliberately).
-- ============================================================

-- Guard used by every function below.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ── Pilot overview: one row of headline numbers ──────────────
create or replace function public.admin_overview()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;

  return json_build_object(
    'total_users',      (select count(*) from public.profiles),
    'consumers',        (select count(*) from public.profiles where role = 'consumer'),
    'owners',           (select count(*) from public.profiles where role = 'owner'),
    'towns_active',     (select count(*) from public.towns where active),
    'businesses',       (select count(*) from public.spots),
    'businesses_live',  (select count(*) from public.spots where active),
    'scans_total',      (select count(*) from public.visits),
    'scans_7d',         (select count(*) from public.visits where created_at > now() - interval '7 days'),
    'perks_earned',     (select count(*) from public.redemptions),
    'perks_redeemed',   (select count(*) from public.redemptions where redeemed_at is not null),
    'offers_live',      (select count(*) from public.offers where active and (expires_at is null or expires_at > now())),
    'town_requests',    (select count(*) from public.town_requests where status = 'pending')
  );
end;
$$;

-- ── All users, newest first ──────────────────────────────────
create or replace function public.admin_users()
returns table (
  id uuid, full_name text, email text, role text,
  is_admin boolean, town_name text, created_at timestamptz,
  visit_count bigint
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
  select p.id, p.full_name, p.email, p.role, p.is_admin,
         t.name as town_name, p.created_at,
         (select count(*) from public.visits v where v.user_id = p.id) as visit_count
  from public.profiles p
  left join public.towns t on t.id = p.town_id
  order by p.created_at desc;
end;
$$;

-- ── Change a user's role (consumer <-> owner) ────────────────
create or replace function public.admin_set_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;
  if new_role not in ('consumer','owner') then
    raise exception 'Invalid role';
  end if;

  update public.profiles set role = new_role where id = target_id;
end;
$$;

-- ── All offers across every business (for moderation) ────────
create or replace function public.admin_offers()
returns table (
  id uuid, message text, spot_name text, town_name text,
  active boolean, expires_at timestamptz, sent_at timestamptz
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
  select o.id, o.message, s.name as spot_name, t.name as town_name,
         o.active, o.expires_at, o.sent_at
  from public.offers o
  join public.spots s on s.id = o.spot_id
  left join public.towns t on t.id = s.town_id
  order by o.sent_at desc
  limit 200;
end;
$$;

-- ── End any offer ────────────────────────────────────────────
create or replace function public.admin_end_offer(offer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised';
  end if;
  update public.offers set active = false where id = offer_id;
end;
$$;

-- ── All feedback across every business ───────────────────────
create or replace function public.admin_feedback()
returns table (
  id uuid, mood int, note text, spot_name text, created_at timestamptz
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
  select f.id, f.mood, f.note, s.name as spot_name, f.created_at
  from public.feedback f
  join public.spots s on s.id = f.spot_id
  order by f.created_at desc
  limit 200;
end;
$$;

grant execute on function public.is_admin()               to authenticated;
grant execute on function public.admin_overview()         to authenticated;
grant execute on function public.admin_users()            to authenticated;
grant execute on function public.admin_set_role(uuid,text) to authenticated;
grant execute on function public.admin_offers()           to authenticated;
grant execute on function public.admin_end_offer(uuid)    to authenticated;
grant execute on function public.admin_feedback()         to authenticated;
