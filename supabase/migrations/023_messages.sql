-- 023_messages.sql
-- Two-way messaging between a business owner and the admin.
--
-- A thread is keyed by spot, not by user. An owner with two businesses gets
-- two conversations, which is what they'd expect — a question about the deli
-- has nothing to do with the pizzeria. It also means a thread survives the
-- listing changing hands.

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  spot_id       uuid not null references public.spots(id)    on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  sender_role   text not null check (sender_role in ('owner','admin')),
  body          text not null check (length(btrim(body)) > 0 and length(body) <= 4000),
  created_at    timestamptz not null default now(),
  read_by_admin boolean not null default false,
  read_by_owner boolean not null default false
);

create index if not exists messages_spot_created_idx
  on public.messages (spot_id, created_at);

-- Partial index: the unread badge queries this constantly and almost every
-- row is already read, so there's no point indexing the ones that aren't.
create index if not exists messages_unread_admin_idx
  on public.messages (spot_id) where not read_by_admin;

alter table public.messages enable row level security;

-- SECURITY DEFINER so the policies below can check the caller's role without
-- re-entering RLS on profiles, which would recurse.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.is_admin()
    or spot_id in (select id from public.spots where owner_id = auth.uid())
  );

-- sender_id is pinned to auth.uid() and sender_role is checked against actual
-- privileges, so nobody can post as someone else or impersonate the admin.
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (sender_role = 'admin' and public.is_admin())
      or (sender_role = 'owner'
          and spot_id in (select id from public.spots where owner_id = auth.uid()))
    )
  );

-- No update or delete policy on purpose. Marking a message read goes through
-- the RPC below; without it, a broad update policy would also let either side
-- silently rewrite what the other one said.
create or replace function public.mark_thread_read(p_spot_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    update public.messages
       set read_by_admin = true
     where spot_id = p_spot_id and sender_role = 'owner' and not read_by_admin;
  elsif exists (select 1 from public.spots
                 where id = p_spot_id and owner_id = auth.uid()) then
    update public.messages
       set read_by_owner = true
     where spot_id = p_spot_id and sender_role = 'admin' and not read_by_owner;
  end if;
end;
$$;

-- The admin inbox: one row per spot that has any messages, newest first,
-- with a preview and an unread count.
create or replace function public.admin_threads()
returns table (
  spot_id    uuid,
  spot_name  text,
  spot_emoji text,
  last_body  text,
  last_at    timestamptz,
  last_role  text,
  unread     integer
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.name, s.emoji,
         m.body, m.created_at, m.sender_role,
         (select count(*)::integer from public.messages x
           where x.spot_id = s.id
             and x.sender_role = 'owner'
             and not x.read_by_admin)
  from public.spots s
  join lateral (
    select body, created_at, sender_role
    from public.messages
    where spot_id = s.id
    order by created_at desc
    limit 1
  ) m on true
  where public.is_admin()
  order by m.created_at desc
$$;

grant execute on function public.is_admin()             to authenticated;
grant execute on function public.mark_thread_read(uuid) to authenticated;
grant execute on function public.admin_threads()        to authenticated;
