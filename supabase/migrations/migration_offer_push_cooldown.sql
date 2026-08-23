-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — one notification per business per day
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Records when an offer actually triggered notifications, which is not the
-- same as when it was created. An owner can still post as many offers as they
-- like — those show in the app. This caps the INTERRUPTION, not the content.
alter table public.offers
  add column if not exists pushed_at timestamptz;

create index if not exists offers_spot_pushed_idx
  on public.offers(spot_id, pushed_at desc)
  where pushed_at is not null;

-- When is this spot next allowed to notify? Returns null when it can send now.
--
-- Rolling 24 hours rather than a calendar day on purpose: the database runs in
-- UTC, so "resets at midnight" would mean 8pm in New Jersey — an owner sending
-- an evening offer would be baffled to find their allowance gone. A rolling
-- window behaves the same no matter what time zone anyone is in.
create or replace function public.offer_push_available_at(p_spot_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select max(pushed_at) + interval '24 hours'
  from public.offers
  where spot_id = p_spot_id
    and pushed_at is not null
    and pushed_at > now() - interval '24 hours'
$$;

revoke all on function public.offer_push_available_at(uuid) from public, anon;
grant execute on function public.offer_push_available_at(uuid) to authenticated, service_role;
