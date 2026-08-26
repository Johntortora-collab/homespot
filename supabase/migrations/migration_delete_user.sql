-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — delete a user from the admin panel
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Deleting from auth.users needs privileges the browser will never have, so
-- this runs as a definer function with an explicit admin check. Removing the
-- auth row cascades to the profile, stamp cards, visits and redemptions.

-- What would go with them. Worth showing BEFORE the confirm — "delete this
-- user" reads very differently once you know it takes 47 visits with it.
create or replace function public.admin_user_delete_preview(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_visits int;
  v_cards  int;
  v_spots  int;
  v_email  text;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return json_build_object('ok', false, 'error', 'Admins only.');
  end if;

  select count(*) into v_visits from public.visits      where user_id = p_user_id;
  select count(*) into v_cards  from public.stamp_cards where user_id = p_user_id;
  select count(*) into v_spots  from public.spots       where owner_id = p_user_id;
  select email    into v_email  from auth.users         where id = p_user_id;

  return json_build_object(
    'ok', true, 'email', v_email,
    'visits', v_visits, 'cards', v_cards, 'spots', v_spots
  );
end $$;

revoke all on function public.admin_user_delete_preview(uuid) from public, anon;
grant execute on function public.admin_user_delete_preview(uuid) to authenticated;


create or replace function public.admin_delete_user(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_spots    int;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return json_build_object('ok', false, 'error', 'Admins only.');
  end if;

  -- Deleting yourself locks you out of the panel you're standing in.
  if p_user_id = auth.uid() then
    return json_build_object('ok', false, 'error', 'You cannot delete your own account here.');
  end if;

  select is_admin into v_is_admin from public.profiles where id = p_user_id;
  if not found then
    return json_build_object('ok', false, 'error', 'That user no longer exists.');
  end if;

  -- Two admins can't delete each other on a whim. Remove the admin flag first
  -- if it's genuinely intended — that's a separate, deliberate step.
  if v_is_admin then
    return json_build_object('ok', false, 'error',
      'That account is an admin. Remove admin access first if you really mean to delete it.');
  end if;

  -- The dangerous one. A business owner's account is load-bearing: their spot,
  -- its stamp cards, its visit history and every customer's progress hang off
  -- it. Depending on the foreign keys, deleting them either cascades all of
  -- that away or fails halfway. Refuse and make the admin deal with the
  -- business explicitly.
  select count(*) into v_spots from public.spots where owner_id = p_user_id;
  if v_spots > 0 then
    return json_build_object('ok', false, 'error',
      format('This account owns %s business listing(s). Reassign or delete the business first, then delete the account.', v_spots));
  end if;

  delete from auth.users where id = p_user_id;

  return json_build_object('ok', true);
end $$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- To release a business before deleting its owner (turns it back into an
-- unclaimed draft rather than destroying the listing):
--
--   update public.spots
--      set owner_id = null, active = false, claimed_at = null,
--          claim_code = upper(substr(md5(random()::text), 1, 6))
--    where id = '<spot-uuid>';
-- ═══════════════════════════════════════════════════════════════════════════
