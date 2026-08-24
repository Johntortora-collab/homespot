-- ═══════════════════════════════════════════════════════════════════════════
-- Homespot — create drafts from the admin UI
-- Run in the Supabase SQL editor. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Postgres won't let CREATE OR REPLACE change a function's parameter list, so
-- the old signature has to go first. Both are named explicitly because an
-- ambiguous drop would fail once two overloads exist.
drop function if exists public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text);
drop function if exists public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text,text,text);

create or replace function public.create_draft_spot(
  p_town_id         uuid,
  p_name            text,
  p_category        text,
  p_emoji           text default '🏪',
  p_tagline         text default null,
  p_perk            text default 'Free item on us',
  p_stamps_required int  default 8,
  p_spot_type       text default null,
  p_phone           text default null,
  p_address         text default null,
  p_photo_url       text default null,
  p_hours           text default null,
  p_website         text default null
)
returns table (id uuid, name text, claim_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id   uuid;
begin
  -- Two callers: the SQL editor (no JWT, so auth.uid() is null — getting there
  -- already requires dashboard access) and a signed-in user, who must be an
  -- admin. Only the second case needs checking.
  if auth.uid() is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Only an admin can create draft listings.';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'A business name is required.';
  end if;

  -- No 0/O/1/I — this gets read aloud across a counter.
  v_code := (
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
                             floor(random()*32)::int + 1, 1), '')
    from generate_series(1,6)
  );

  insert into public.spots (
    town_id, name, category, emoji, tagline, perk, stamps_required,
    spot_type, phone, address, photo_url, hours, website, color,
    owner_id, active, claim_code
  ) values (
    p_town_id, btrim(p_name), p_category, p_emoji, p_tagline, p_perk, p_stamps_required,
    p_spot_type, p_phone, p_address, p_photo_url, p_hours, p_website, '#F5A623',
    null, false, v_code
  )
  returning spots.id into v_id;

  return query select v_id, btrim(p_name), v_code;
end $$;

revoke all on function public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text,text,text) from public, anon;
grant execute on function public.create_draft_spot(uuid,text,text,text,text,text,int,text,text,text,text,text,text) to authenticated;
