-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — delete a draft listing
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.admin_delete_draft(p_spot_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot public.spots%rowtype;
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return json_build_object('ok', false, 'error', 'Admins only.');
  end if;

  select * into v_spot from public.spots where id = p_spot_id;
  if not found then
    return json_build_object('ok', false, 'error', 'That listing no longer exists.');
  end if;

  -- Hard stop on anything a real business owns. A claimed spot has customers,
  -- stamp cards and visit history hanging off it, and this button is going to
  -- get tapped on a phone with one thumb — it must be impossible to nuke a
  -- live business from here even by accident.
  if v_spot.owner_id is not null then
    return json_build_object('ok', false, 'error',
      'This business is live and claimed by its owner. Deactivate it from the Businesses tab instead.');
  end if;

  if v_spot.claim_code is null then
    return json_build_object('ok', false, 'error',
      'That is not a draft listing.');
  end if;

  delete from public.spots where id = p_spot_id;

  return json_build_object('ok', true);
end $$;

revoke all on function public.admin_delete_draft(uuid) from public, anon;
grant execute on function public.admin_delete_draft(uuid) to authenticated;
