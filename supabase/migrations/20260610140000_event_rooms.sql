-- Digital event rooms (e.g. Pride): opt-in presence and member discovery per room.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.event_rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  city text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_rooms_slug_len check (char_length(slug) between 2 and 80),
  constraint event_rooms_name_len check (char_length(name) between 2 and 120)
);

create unique index if not exists idx_event_rooms_slug
  on public.event_rooms (lower(slug));

create index if not exists idx_event_rooms_active_dates
  on public.event_rooms (is_active, starts_at, ends_at);

create table if not exists public.event_room_members (
  room_id uuid not null references public.event_rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_event_room_members_user
  on public.event_room_members (user_id);

create index if not exists idx_event_room_members_room_seen
  on public.event_room_members (room_id, last_seen_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.event_rooms enable row level security;
alter table public.event_room_members enable row level security;

drop policy if exists "event_rooms_select_active" on public.event_rooms;
create policy "event_rooms_select_active"
  on public.event_rooms for select
  to authenticated
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "event_room_members_select_own" on public.event_room_members;
create policy "event_room_members_select_own"
  on public.event_room_members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- Join/leave/member listing go through SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public._event_room_presence_cutoff()
returns timestamptz
language sql
stable
as $$
  select now() - interval '15 minutes';
$$;

revoke all on function public._event_room_presence_cutoff() from public;
grant execute on function public._event_room_presence_cutoff() to authenticated;

create or replace function public._event_room_is_joinable(p_room_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.event_rooms r
    where r.id = p_room_id
      and r.is_active = true
      and (r.starts_at is null or r.starts_at <= now())
      and (r.ends_at is null or r.ends_at >= now())
  );
$$;

revoke all on function public._event_room_is_joinable(uuid) from public;
grant execute on function public._event_room_is_joinable(uuid) to authenticated;

create or replace function public._user_is_event_room_member(p_room_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.event_room_members m
    where m.room_id = p_room_id
      and m.user_id = p_user_id
      and m.last_seen_at >= public._event_room_presence_cutoff()
  );
$$;

revoke all on function public._user_is_event_room_member(uuid, uuid) from public;
grant execute on function public._user_is_event_room_member(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: list joinable event rooms with present member counts
-- ---------------------------------------------------------------------------

drop function if exists public.list_active_event_rooms() cascade;

create or replace function public.list_active_event_rooms()
returns table (
  id uuid,
  slug text,
  name text,
  description text,
  city text,
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  member_count bigint,
  is_joined boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  presence_cutoff timestamptz := public._event_room_presence_cutoff();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    r.id,
    r.slug,
    r.name,
    r.description,
    r.city,
    r.image_url,
    r.starts_at,
    r.ends_at,
    count(m.user_id) filter (
      where m.last_seen_at >= presence_cutoff
    ) as member_count,
    coalesce(
      bool_or(m.user_id = uid and m.last_seen_at >= presence_cutoff),
      false
    ) as is_joined
  from public.event_rooms r
  left join public.event_room_members m
    on m.room_id = r.id
  where r.is_active = true
    and (r.starts_at is null or r.starts_at <= now())
    and (r.ends_at is null or r.ends_at >= now())
  group by r.id
  order by r.starts_at nulls last, r.name asc;
end;
$$;

revoke all on function public.list_active_event_rooms() from public;
grant execute on function public.list_active_event_rooms() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: join / heartbeat / leave
-- ---------------------------------------------------------------------------

drop function if exists public.join_event_room(uuid) cascade;

create or replace function public.join_event_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public._event_room_is_joinable(p_room_id) then
    raise exception 'Event room is not available';
  end if;

  insert into public.event_room_members (
    room_id,
    user_id,
    joined_at,
    last_seen_at
  )
  values (
    p_room_id,
    uid,
    now(),
    now()
  )
  on conflict (room_id, user_id) do update
  set last_seen_at = now();
end;
$$;

revoke all on function public.join_event_room(uuid) from public;
grant execute on function public.join_event_room(uuid) to authenticated;

drop function if exists public.heartbeat_event_room(uuid) cascade;

create or replace function public.heartbeat_event_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.event_room_members
  set last_seen_at = now()
  where room_id = p_room_id
    and user_id = uid;

  if not found then
    raise exception 'You are not in this event room';
  end if;
end;
$$;

revoke all on function public.heartbeat_event_room(uuid) from public;
grant execute on function public.heartbeat_event_room(uuid) to authenticated;

drop function if exists public.leave_event_room(uuid) cascade;

create or replace function public.leave_event_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.event_room_members
  where room_id = p_room_id
    and user_id = uid;
end;
$$;

revoke all on function public.leave_event_room(uuid) from public;
grant execute on function public.leave_event_room(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: members in a room (present, discoverable, not blocked)
-- ---------------------------------------------------------------------------

drop function if exists public.list_event_room_members(uuid) cascade;

create or replace function public.list_event_room_members(p_room_id uuid)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  profile_picture_url text,
  distance_miles double precision,
  age integer,
  gender_identity text,
  body_type text,
  relationship_status text,
  is_online boolean,
  show_location boolean,
  show_online_status boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  uid uuid := auth.uid();
  presence_cutoff timestamptz := public._event_room_presence_cutoff();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public._user_is_event_room_member(p_room_id, uid) then
    raise exception 'Join this room to see who is here';
  end if;

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.profile_picture_url,
    null::double precision as distance_miles,
    case
      when p.date_of_birth is null then null
      else extract(year from age(current_date, p.date_of_birth))::integer
    end as age,
    p.gender_identity,
    p.body_type,
    p.relationship_status,
    (m.last_seen_at >= presence_cutoff) as is_online,
    coalesce(p.show_location, true) as show_location,
    coalesce(p.show_online_status, true) as show_online_status
  from public.event_room_members m
  join public.user_profiles p
    on p.id = m.user_id
  join public.user_preferences up
    on up.user_id = p.id
  where m.room_id = p_room_id
    and m.last_seen_at >= presence_cutoff
    and up.is_discoverable = true
    and m.user_id <> uid
    and not exists (
      select 1
      from public.user_blocks b
      where (b.blocker_id = uid and b.blocked_id = m.user_id)
         or (b.blocker_id = m.user_id and b.blocked_id = uid)
    )
  order by m.last_seen_at desc, p.display_name asc nulls last, p.username asc nulls last;
end;
$$;

revoke all on function public.list_event_room_members(uuid) from public;
grant execute on function public.list_event_room_members(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (optional live member updates)
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.event_room_members;
exception
  when duplicate_object then null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Seed: sample room (inactive until you set is_active = true)
-- ---------------------------------------------------------------------------

insert into public.event_rooms (
  slug,
  name,
  description,
  city,
  starts_at,
  ends_at,
  is_active
)
select
  'nyc-pride-2026',
  'NYC Pride 2026',
  'Opt in to see who else is at NYC Pride weekend.',
  'New York, NY',
  timestamptz '2026-06-27 00:00:00+00',
  timestamptz '2026-06-29 23:59:59+00',
  false
where not exists (
  select 1
  from public.event_rooms
  where lower(slug) = 'nyc-pride-2026'
);
