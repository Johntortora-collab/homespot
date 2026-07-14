-- ============================================================
-- Migration: let an owner wipe customer activity for their spot
--
-- Done as a SECURITY DEFINER function rather than client-side deletes,
-- for two reasons:
--   1. Owners have no DELETE policy on visits/stamp_cards/feedback, so
--      client deletes would silently affect 0 rows and *look* successful.
--   2. All four tables must clear together. A function runs them in one
--      transaction, so a partial failure can't leave a customer with
--      stamps but no visit history.
-- ============================================================

create or replace function public.reset_spot_customer_data(p_spot_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_owner  boolean;
  v_visits    int;
  v_cards     int;
  v_redeems   int;
  v_feedback  int;
begin
  -- SECURITY DEFINER bypasses RLS, so ownership MUST be checked by hand.
  -- Without this, any signed-in user could wipe any business's data.
  select exists (
    select 1 from public.spots
    where id = p_spot_id and owner_id = auth.uid()
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'Not authorised to reset this spot';
  end if;

  delete from public.visits      where spot_id = p_spot_id;
  get diagnostics v_visits = row_count;

  delete from public.stamp_cards where spot_id = p_spot_id;
  get diagnostics v_cards = row_count;

  delete from public.redemptions where spot_id = p_spot_id;
  get diagnostics v_redeems = row_count;

  delete from public.feedback    where spot_id = p_spot_id;
  get diagnostics v_feedback = row_count;

  return json_build_object(
    'visits',      v_visits,
    'stamp_cards', v_cards,
    'redemptions', v_redeems,
    'feedback',    v_feedback
  );
end;
$$;

grant execute on function public.reset_spot_customer_data(uuid) to authenticated;
