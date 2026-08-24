-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — admin draft list for the field
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- The app can't read the draft_spots_admin view directly — RLS on spots would
-- hide unclaimed rows, and claim codes must never be readable by anyone else.
-- A definer function with an explicit admin check is the safe way to expose it.
create or replace function public.admin_draft_spots()
returns table (
  id uuid, name text, category text, emoji text, address text,
  claim_code text, photo_url text, spot_type text, perk text,
  town_name text, is_claimed boolean, claimed_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Admins only.';
  end if;

  return query
    select s.id, s.name, s.category, s.emoji, s.address,
           s.claim_code, s.photo_url, s.spot_type, s.perk,
           t.name, (s.owner_id is not null), s.claimed_at, s.created_at
    from public.spots s
    left join public.towns t on t.id = s.town_id
    -- claimed_at is what marks a row as having come from the draft flow. Once
    -- claimed the code is wiped, so filtering on claim_code alone would make
    -- your wins vanish from the list the moment you got them.
    where s.claim_code is not null or s.claimed_at is not null
    order by (s.owner_id is not null), s.name;
end $$;

revoke all on function public.admin_draft_spots() from public, anon;
grant execute on function public.admin_draft_spots() to authenticated;
