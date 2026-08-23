-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — push notifications
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Subscriptions ──────────────────────────────────────────────────────────
-- One row per browser/device. The same person on a phone and a laptop has two.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,   -- unique: re-subscribing the same device updates, never duplicates
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- People manage only their own devices. The edge function reads with the
-- service role key, which bypasses RLS — that's how the sender sees everyone.
drop policy if exists "own subscriptions readable" on public.push_subscriptions;
create policy "own subscriptions readable"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "own subscriptions insertable" on public.push_subscriptions;
create policy "own subscriptions insertable"
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "own subscriptions updatable" on public.push_subscriptions;
create policy "own subscriptions updatable"
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid());

drop policy if exists "own subscriptions deletable" on public.push_subscriptions;
create policy "own subscriptions deletable"
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- 2. Who gets a given offer ─────────────────────────────────────────────────
-- The dashboard has offered these four audiences since day one but nothing
-- ever acted on the choice. This is where it finally means something.
--
-- Recipients are always drawn from people who already have a stamp card at
-- that spot — never the whole town. An offer is a message to your customers,
-- not a broadcast, and treating it otherwise is how an app earns a mute.
create or replace function public.offer_recipients(p_spot_id uuid, p_target text)
returns table (user_id uuid)
language sql
security definer
set search_path = public
as $$
  select sc.user_id
  from public.stamp_cards sc
  where sc.spot_id = p_spot_id
    and case coalesce(p_target, 'all')
      when 'regular' then sc.lifetime >= 5
      when 'vip'     then sc.lifetime >= 20
      when 'lapsed'  then not exists (
        select 1 from public.visits v
        where v.user_id = sc.user_id
          and v.spot_id = p_spot_id
          and v.created_at > now() - interval '14 days'
      )
      else true
    end
$$;

revoke all on function public.offer_recipients(uuid, text) from public, anon;
grant execute on function public.offer_recipients(uuid, text) to authenticated, service_role;

-- 3. Sanity check ───────────────────────────────────────────────────────────
-- Swap in a real spot id to see who a "regulars" offer would actually reach:
--   select count(*) from public.offer_recipients('<spot-uuid>', 'regular');
