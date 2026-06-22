-- ============================================================
-- Homespot Database Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────
-- Extends Supabase auth.users with role + town
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null default 'consumer' check (role in ('consumer', 'owner')),
  full_name   text,
  avatar      text default '🧑',
  town_id     uuid,
  created_at  timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'consumer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Towns ─────────────────────────────────────────────────
create table public.towns (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  state       text not null,
  emoji       text default '📍',
  population  text,
  active      boolean default true,
  created_at  timestamptz default now()
);

-- Seed towns
insert into public.towns (name, state, emoji, population, active) values
  ('Maplewood',  'NJ', '🍁', '24k', true),
  ('Millburn',   'NJ', '🌿', '20k', true),
  ('Summit',     'NJ', '⛰️',  '22k', true),
  ('Montclair',  'NJ', '🎨', '38k', true),
  ('Chatham',    'NJ', '🏡', '11k', true),
  ('Westfield',  'NJ', '🌸', '30k', true),
  ('Glen Ridge', 'NJ', '🌳', '7k',  false),
  ('Nutley',     'NJ', '🏘️', '28k', false);

-- Add town FK to profiles
alter table public.profiles
  add constraint profiles_town_id_fkey
  foreign key (town_id) references public.towns(id);

-- ── Spots (businesses) ────────────────────────────────────
create table public.spots (
  id               uuid default uuid_generate_v4() primary key,
  owner_id         uuid references public.profiles(id) on delete cascade not null,
  town_id          uuid references public.towns(id) not null,
  name             text not null,
  emoji            text default '🏪',
  category         text not null,
  tagline          text,
  phone            text,
  address          text,
  stamps_required  int not null default 8 check (stamps_required between 1 and 20),
  perk             text not null,
  active           boolean default true,
  color            text default '#F5A623',
  created_at       timestamptz default now()
);

-- ── Stamp cards ───────────────────────────────────────────
-- One card per user per spot
create table public.stamp_cards (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  stamps      int not null default 0,
  lifetime    int not null default 0,  -- never resets, for VIP tracking
  created_at  timestamptz default now(),
  unique (user_id, spot_id)
);

-- ── Visits ────────────────────────────────────────────────
-- Each QR scan creates a visit row
create table public.visits (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  created_at  timestamptz default now(),
  visit_date  date generated always as ( (created_at at time zone 'utc')::date ) stored
);

-- One scan per user per spot per day — DB-level enforcement
create unique index visits_one_per_day
  on public.visits (user_id, spot_id, visit_date);

-- ── Offers ────────────────────────────────────────────────
create table public.offers (
  id          uuid default uuid_generate_v4() primary key,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  message     text not null,
  target      text not null default 'all' check (target in ('all','regular','lapsed','vip')),
  sent_at     timestamptz default now()
);

-- ── Feedback ──────────────────────────────────────────────
create table public.feedback (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  spot_id     uuid references public.spots(id) on delete cascade not null,
  mood        int not null check (mood between 1 and 4),
  note        text,
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────

alter table public.profiles    enable row level security;
alter table public.towns       enable row level security;
alter table public.spots       enable row level security;
alter table public.stamp_cards enable row level security;
alter table public.visits      enable row level security;
alter table public.offers      enable row level security;
alter table public.feedback    enable row level security;

-- Profiles: users see/edit only their own
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id);

-- Towns: anyone can read
create policy "towns: public read" on public.towns
  for select using (true);

-- Spots: public read; owners manage their own
create policy "spots: public read" on public.spots
  for select using (active = true);

create policy "spots: owner insert" on public.spots
  for insert with check (auth.uid() = owner_id);

create policy "spots: owner update" on public.spots
  for update using (auth.uid() = owner_id);

create policy "spots: owner delete" on public.spots
  for delete using (auth.uid() = owner_id);

-- Stamp cards: users manage their own
create policy "stamp_cards: own rows" on public.stamp_cards
  for all using (auth.uid() = user_id);

-- Owners can read stamp cards for their spots
create policy "stamp_cards: owner read" on public.stamp_cards
  for select using (
    spot_id in (select id from public.spots where owner_id = auth.uid())
  );

-- Visits: users insert their own; owners read theirs
create policy "visits: own insert" on public.visits
  for insert with check (auth.uid() = user_id);

create policy "visits: own read" on public.visits
  for select using (auth.uid() = user_id);

create policy "visits: owner read" on public.visits
  for select using (
    spot_id in (select id from public.spots where owner_id = auth.uid())
  );

-- Offers: owners manage; consumers read
create policy "offers: owner manage" on public.offers
  for all using (
    spot_id in (select id from public.spots where owner_id = auth.uid())
  );

create policy "offers: consumer read" on public.offers
  for select using (true);

-- Feedback: users insert/read own; owners read their spot's feedback
create policy "feedback: own manage" on public.feedback
  for all using (auth.uid() = user_id);

create policy "feedback: owner read" on public.feedback
  for select using (
    spot_id in (select id from public.spots where owner_id = auth.uid())
  );

create policy "feedback: owner update read flag" on public.feedback
  for update using (
    spot_id in (select id from public.spots where owner_id = auth.uid())
  );

-- ── Helpful views ─────────────────────────────────────────

-- Owner dashboard: visit count per customer per spot
create view public.spot_customer_stats as
  select
    v.spot_id,
    v.user_id,
    p.full_name,
    p.avatar,
    count(*) as visit_count,
    max(v.created_at) as last_visit,
    sc.stamps as current_stamps,
    sc.lifetime as lifetime_visits
  from public.visits v
  join public.profiles p on p.id = v.user_id
  left join public.stamp_cards sc on sc.user_id = v.user_id and sc.spot_id = v.spot_id
  group by v.spot_id, v.user_id, p.full_name, p.avatar, sc.stamps, sc.lifetime;

-- Consumer: all spots with user's stamp count
create view public.spots_with_stamps as
  select
    s.*,
    t.name as town_name,
    t.state as town_state,
    coalesce(sc.stamps, 0) as my_stamps,
    coalesce(sc.lifetime, 0) as my_lifetime,
    (select message from public.offers o where o.spot_id = s.id order by o.sent_at desc limit 1) as latest_offer
  from public.spots s
  join public.towns t on t.id = s.town_id
  left join public.stamp_cards sc on sc.spot_id = s.id and sc.user_id = auth.uid();

-- Enable realtime on visits (for live owner ticker)
alter publication supabase_realtime add table public.visits;
alter publication supabase_realtime add table public.offers;
