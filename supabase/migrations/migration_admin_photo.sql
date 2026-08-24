-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — admins can set a photo on any business
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- The owner-facing update path is scoped with .eq('owner_id', auth.uid()), and
-- a draft has no owner at all — so neither route lets you set a photo on the
-- listings you're about to pitch. This is the admin door, with an explicit
-- admin check rather than relying on RLS.
create or replace function public.admin_set_spot_photo(
  p_spot_id   uuid,
  p_photo_url text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
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

  update public.spots set photo_url = p_photo_url where id = p_spot_id;

  if not found then
    return json_build_object('ok', false, 'error', 'That business no longer exists.');
  end if;

  return json_build_object('ok', true);
end $$;

revoke all on function public.admin_set_spot_photo(uuid, text) from public, anon;
grant execute on function public.admin_set_spot_photo(uuid, text) to authenticated;
