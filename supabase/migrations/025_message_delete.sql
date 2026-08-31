-- 025_message_delete.sql
-- Run after 023 and 024.
--
-- Deletion is admin-only and goes through RPCs rather than a delete policy on
-- the table. A policy broad enough for an admin to delete anything would have
-- to be written against the same table owners read from, and it's easier to
-- reason about "only these two functions ever remove a row."

create or replace function public.delete_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  delete from public.messages where id = p_id;
end;
$$;

create or replace function public.delete_thread(p_spot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  delete from public.messages where spot_id = p_spot_id;
end;
$$;

grant execute on function public.delete_message(uuid) to authenticated;
grant execute on function public.delete_thread(uuid)  to authenticated;

-- ── Diagnostic for the stuck unread badge ────────────────────────────────
-- Run this on its own and send the result. It shows what the badge counts.
--
-- select m.id, s.name, m.sender_role, m.read_by_admin, m.read_by_owner,
--        left(m.body, 40) as preview, m.created_at
-- from public.messages m
-- join public.spots s on s.id = m.spot_id
-- order by m.created_at desc;
