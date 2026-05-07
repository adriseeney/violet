-- Violet app support tables and discovery RPCs.
--
-- Run after 20260416170000_profiles_preferences_auth_trigger.sql and before
-- direct-message migrations on a fresh project.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Extend profile/preferences tables to match app surfaces
-- ---------------------------------------------------------------------------

alter table public.user_profiles
  add column if not exists location_country text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists body_type text,
  add column if not exists relationship_status text,
  add column if not exists show_location boolean not null default true,
  add column if not exists show_online_status boolean not null default true,
  add column if not exists last_active_at timestamptz;

alter table public.user_preferences
  add column if not exists sexual_role text,
  add column if not exists sexual_position text,
  add column if not exists intimacy_preferences text[] not null default '{}',
  add column if not exists sex_style text,
  add column if not exists hiv_status text,
  add column if not exists safety_practices text,
  add column if not exists show_preferences_publicly boolean not null default false,
  add column if not exists height_min_cm integer,
  add column if not exists height_max_cm integer,
  add column if not exists body_types text[] not null default '{}',
  add column if not exists relationship_status_filter text[] not null default '{}',
  add column if not exists show_online_only boolean not null default false;

create index if not exists idx_user_profiles_coordinates
  on public.user_profiles (latitude, longitude);

create index if not exists idx_user_profiles_last_active
  on public.user_profiles (last_active_at desc);

-- ---------------------------------------------------------------------------
-- Profile photos
-- ---------------------------------------------------------------------------

create table if not exists public.user_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  storage_path text,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  is_private boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_photos
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists url text,
  add column if not exists storage_path text,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_primary boolean not null default false,
  add column if not exists is_private boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_photos_user_order
  on public.user_photos (user_id, display_order);

create unique index if not exists idx_user_photos_one_primary
  on public.user_photos (user_id)
  where is_primary;

alter table public.user_photos enable row level security;

drop policy if exists "user_photos_select_visible" on public.user_photos;
create policy "user_photos_select_visible"
  on public.user_photos for select
  using (
    user_id = (select auth.uid())
    or (
      is_private = false
      and public.is_profile_discoverable(user_id)
    )
  );

drop policy if exists "user_photos_insert_own" on public.user_photos;
create policy "user_photos_insert_own"
  on public.user_photos for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "user_photos_update_own" on public.user_photos;
create policy "user_photos_update_own"
  on public.user_photos for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "user_photos_delete_own" on public.user_photos;
create policy "user_photos_delete_own"
  on public.user_photos for delete
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- User settings
-- ---------------------------------------------------------------------------

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notifications_enabled boolean not null default true,
  show_location boolean not null default false,
  show_online boolean not null default true,
  theme_preference text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_settings
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists show_location boolean not null default false,
  add column if not exists show_online boolean not null default true,
  add column if not exists theme_preference text not null default 'system',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
  on public.user_settings for select
  using (user_id = (select auth.uid()));

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
  on public.user_settings for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Favorites, blocks, reports, and hidden album requests
-- ---------------------------------------------------------------------------

create table if not exists public.user_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  favorite_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, favorite_user_id),
  constraint user_favorites_not_self check (user_id <> favorite_user_id)
);

alter table public.user_favorites
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists favorite_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_user_favorites_favorite_user
  on public.user_favorites (favorite_user_id);

alter table public.user_favorites enable row level security;

drop policy if exists "user_favorites_select_own" on public.user_favorites;
create policy "user_favorites_select_own"
  on public.user_favorites for select
  using (user_id = (select auth.uid()));

drop policy if exists "user_favorites_insert_own" on public.user_favorites;
create policy "user_favorites_insert_own"
  on public.user_favorites for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "user_favorites_delete_own" on public.user_favorites;
create policy "user_favorites_delete_own"
  on public.user_favorites for delete
  using (user_id = (select auth.uid()));

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks
  add column if not exists blocker_id uuid references auth.users (id) on delete cascade,
  add column if not exists blocked_id uuid references auth.users (id) on delete cascade,
  add column if not exists reason text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_user_blocks_blocked
  on public.user_blocks (blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_select_own" on public.user_blocks;
create policy "user_blocks_select_own"
  on public.user_blocks for select
  using (blocker_id = (select auth.uid()));

drop policy if exists "user_blocks_insert_own" on public.user_blocks;
create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (blocker_id = (select auth.uid()));

drop policy if exists "user_blocks_delete_own" on public.user_blocks;
create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (blocker_id = (select auth.uid()));

create table if not exists public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_reports_not_self check (reporter_id <> reported_user_id)
);

alter table public.user_reports
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists reporter_id uuid references auth.users (id) on delete cascade,
  add column if not exists reported_user_id uuid references auth.users (id) on delete cascade,
  add column if not exists reason text,
  add column if not exists details text,
  add column if not exists status text not null default 'open',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_reports_reporter
  on public.user_reports (reporter_id, created_at desc);

create index if not exists idx_user_reports_reported
  on public.user_reports (reported_user_id, created_at desc);

alter table public.user_reports enable row level security;

drop policy if exists "user_reports_select_own" on public.user_reports;
create policy "user_reports_select_own"
  on public.user_reports for select
  using (reporter_id = (select auth.uid()));

drop policy if exists "user_reports_insert_own" on public.user_reports;
create policy "user_reports_insert_own"
  on public.user_reports for insert
  with check (reporter_id = (select auth.uid()));

create table if not exists public.hidden_album_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint hidden_album_requests_not_self check (requester_id <> owner_id)
);

alter table public.hidden_album_requests
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists requester_id uuid references auth.users (id) on delete cascade,
  add column if not exists owner_id uuid references auth.users (id) on delete cascade,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists responded_at timestamptz;

create unique index if not exists idx_hidden_album_requests_open
  on public.hidden_album_requests (requester_id, owner_id)
  where status = 'pending';

alter table public.hidden_album_requests enable row level security;

drop policy if exists "hidden_album_requests_select_participant" on public.hidden_album_requests;
create policy "hidden_album_requests_select_participant"
  on public.hidden_album_requests for select
  using (
    requester_id = (select auth.uid())
    or owner_id = (select auth.uid())
  );

drop policy if exists "hidden_album_requests_insert_requester" on public.hidden_album_requests;
create policy "hidden_album_requests_insert_requester"
  on public.hidden_album_requests for insert
  with check (requester_id = (select auth.uid()));

drop policy if exists "hidden_album_requests_update_owner" on public.hidden_album_requests;
create policy "hidden_album_requests_update_owner"
  on public.hidden_album_requests for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- City explore support
-- ---------------------------------------------------------------------------

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  state text,
  country text not null,
  latitude double precision,
  longitude double precision,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cities
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists name text,
  add column if not exists state text,
  add column if not exists country text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists image_url text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_cities_name_region
  on public.cities ((lower(name)), (coalesce(lower(state), '')), (lower(country)));

alter table public.cities enable row level security;

drop policy if exists "cities_select_authenticated" on public.cities;
create policy "cities_select_authenticated"
  on public.cities for select
  to authenticated
  using (true);

create table if not exists public.city_activity_stats (
  city_id uuid primary key references public.cities (id) on delete cascade,
  active_users integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.city_activity_stats
  add column if not exists city_id uuid references public.cities (id) on delete cascade,
  add column if not exists active_users integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

alter table public.city_activity_stats enable row level security;

drop policy if exists "city_activity_stats_select_authenticated" on public.city_activity_stats;
create policy "city_activity_stats_select_authenticated"
  on public.city_activity_stats for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Discovery RPCs
-- ---------------------------------------------------------------------------

create or replace function public.update_user_location(
  current_user_id uuid,
  user_lat double precision,
  user_lng double precision
)
returns public.user_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_profile public.user_profiles;
begin
  if current_user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  update public.user_profiles
  set
    latitude = user_lat,
    longitude = user_lng,
    updated_at = now()
  where id = current_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_user_location(uuid, double precision, double precision) from public;
grant execute on function public.update_user_location(uuid, double precision, double precision) to authenticated;

create or replace function public._distance_miles(
  lat_a double precision,
  lng_a double precision,
  lat_b double precision,
  lng_b double precision
)
returns double precision
language sql
immutable
as $$
  select 3958.7613 * acos(
    least(
      1,
      greatest(
        -1,
        sin(radians(lat_a)) * sin(radians(lat_b))
          + cos(radians(lat_a)) * cos(radians(lat_b)) * cos(radians(lng_b - lng_a))
      )
    )
  );
$$;

create or replace function public.nearby_profiles(
  user_lat double precision,
  user_lng double precision,
  current_user_id uuid
)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  profile_picture_url text,
  distance_miles double precision
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if current_user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  return query
  with viewer_preferences as (
    select coalesce(
      (
        select up.distance_radius_miles
        from public.user_preferences up
        where up.user_id = current_user_id
      ),
      25
    ) as radius_miles
  ),
  candidates as (
    select
      p.id,
      p.username,
      p.display_name,
      p.bio,
      p.profile_picture_url,
      public._distance_miles(user_lat, user_lng, p.latitude, p.longitude) as distance_miles
    from public.user_profiles p
    join public.user_preferences up
      on up.user_id = p.id
    where p.id <> current_user_id
      and up.is_discoverable = true
      and p.latitude is not null
      and p.longitude is not null
      and not exists (
        select 1
        from public.user_blocks b
        where (b.blocker_id = current_user_id and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = current_user_id)
      )
  )
  select
    c.id,
    c.username,
    c.display_name,
    c.bio,
    c.profile_picture_url,
    c.distance_miles
  from candidates c
  cross join viewer_preferences vp
  where c.distance_miles <= vp.radius_miles
  order by c.distance_miles asc;
end;
$$;

revoke all on function public.nearby_profiles(double precision, double precision, uuid) from public;
grant execute on function public.nearby_profiles(double precision, double precision, uuid) to authenticated;
