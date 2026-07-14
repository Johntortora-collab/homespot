-- ============================================================
-- Migration: redemptions — track earned perks until they're claimed
--
-- Fixes three real gaps:
--  1. A completed stamp card announced a perk, then forgot it existed.
--  2. Offers had no per-user link, so the same offer could be claimed
--     over and over by the same person.
--  3. The "Perks redeemed" stat was a proxy that undercounted badly.
-- ============================================================

create table if not exists public.redemptions (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id)    on delete cascade not null,

  -- 'stamp_card' = completed a Spot Card. 'offer' = claimed a promo.
  type        text not null check (type in ('stamp_card','offer')),
  offer_id    uuid references public.offers(id) on delete cascade,

  -- Snapshot of what they earned, captured at the moment they earned it.
  -- If the owner later changes their perk from "Free pastry" to "10% off",
  -- anyone who already earned the pastry still gets the pastry.
  reward_text text not null,

  -- Short human-readable code the staff can eyeball (e.g. "K7F2")
  code        text not null,

  earned_at   timestamptz default now() not null,
  redeemed_at timestamptz            -- null = still owed to the customer
);

-- A given offer can only ever be claimed once per person.
-- This is the constraint that stops someone claiming "Free coffee today!"
-- five times in one afternoon.
create unique index if not exists redemptions_one_claim_per_offer
  on public.redemptions (user_id, offer_id)
  where offer_id is not null;

create index if not exists redemptions_user_pending_idx
  on public.redemptions (user_id, redeemed_at);
create index if not exists redemptions_spot_pending_idx
  on public.redemptions (spot_id, redeemed_at);

alter table public.redemptions enable row level security;

-- Customers see and create their own
create policy "redemptions: own read" on public.redemptions
  for select using (auth.uid() = user_id);

create policy "redemptions: own insert" on public.redemptions
  for insert with check (auth.uid() = user_id);

-- Customers can mark their own as redeemed (they tap "Redeem" at the counter)
create policy "redemptions: own update" on public.redemptions
  for update using (auth.uid() = user_id);

-- Owners see and can mark redeemed anything belonging to their spot
create policy "redemptions: owner read" on public.redemptions
  for select using (
    exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
  );

create policy "redemptions: owner update" on public.redemptions
  for update using (
    exists (select 1 from public.spots s where s.id = spot_id and s.owner_id = auth.uid())
  );

-- ── Real "perks redeemed" count, replacing the broken proxy ──
-- The old stat counted stamp_cards sitting at exactly stamps=0 with lifetime>0,
-- which undercounted: someone who completed a card and then earned one more
-- stamp (stamps=1) stopped being counted entirely.
create or replace function public.spot_redemption_counts(p_spot_id uuid)
returns table (pending bigint, redeemed bigint)
language sql
stable
as $$
  select
    count(*) filter (where redeemed_at is null) as pending,
    count(*) filter (where redeemed_at is not null) as redeemed
  from public.redemptions
  where spot_id = p_spot_id;
$$;

grant execute on function public.spot_redemption_counts(uuid) to authenticated;
