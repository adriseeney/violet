-- Base profile/preferences persistence for new auth users.
--
-- This keeps public profile data in sync with Supabase Auth even when email
-- confirmation is enabled and the client does not receive an authenticated
-- session immediately after sign up.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  username text,
  display_name text,
  bio text,
  date_of_birth date,
  gender_identity text,
  location_city text,
  location_state text,
  profile_picture_url text,
  height_cm integer,
  weight_kg integer,
  ethnicity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles
  add column if not exists email text,
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists date_of_birth date,
  add column if not exists gender_identity text,
  add column if not exists location_city text,
  add column if not exists location_state text,
  add column if not exists profile_picture_url text,
  add column if not exists height_cm integer,
  add column if not exists weight_kg integer,
  add column if not exists ethnicity text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sexual_preference text,
  relationship_intent text,
  looking_for text,
  min_age_preference integer,
  max_age_preference integer,
  distance_radius_miles integer not null default 25,
  show_me text,
  is_discoverable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences
  add column if not exists sexual_preference text,
  add column if not exists relationship_intent text,
  add column if not exists looking_for text,
  add column if not exists min_age_preference integer,
  add column if not exists max_age_preference integer,
  add column if not exists distance_radius_miles integer not null default 25,
  add column if not exists show_me text,
  add column if not exists is_discoverable boolean not null default true,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_user_profiles_display_name
  on public.user_profiles (display_name);

create index if not exists idx_user_preferences_discoverable
  on public.user_preferences (is_discoverable);

alter table public.user_profiles enable row level security;
alter table public.user_preferences enable row level security;

create or replace function public.is_profile_discoverable(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_preferences up
    where up.user_id = p_user_id
      and up.is_discoverable = true
  );
$$;

revoke all on function public.is_profile_discoverable(uuid) from public;
grant execute on function public.is_profile_discoverable(uuid) to authenticated;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (id = (select auth.uid()));

drop policy if exists "user_profiles_select_discoverable" on public.user_profiles;
create policy "user_profiles_select_discoverable"
  on public.user_profiles for select
  using (public.is_profile_discoverable(id));

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select
  using (user_id = (select auth.uid()));

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  metadata_username text;
  profile_username text;
begin
  metadata_username := nullif(trim(new.raw_user_meta_data ->> 'username'), '');
  profile_username := coalesce(
    metadata_username,
    nullif(split_part(new.email, '@', 1), ''),
    'user_' || replace(left(new.id::text, 8), '-', '')
  );

  insert into public.user_profiles (
    id,
    email,
    username,
    display_name
  )
  values (
    new.id,
    new.email,
    profile_username,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), profile_username)
  )
  on conflict (id) do update
  set
    email = excluded.email,
    username = coalesce(public.user_profiles.username, excluded.username),
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
    updated_at = now();

  insert into public.user_preferences (
    user_id,
    distance_radius_miles,
    is_discoverable
  )
  values (
    new.id,
    25,
    true
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public;

insert into public.user_profiles (
  id,
  email,
  username,
  display_name
)
select
  u.id,
  u.email,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'user_' || replace(left(u.id::text, 8), '-', '')
  ) as username,
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    'user_' || replace(left(u.id::text, 8), '-', '')
  ) as display_name
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  username = coalesce(public.user_profiles.username, excluded.username),
  display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
  updated_at = now();

insert into public.user_preferences (
  user_id,
  distance_radius_miles,
  is_discoverable
)
select
  u.id,
  25,
  true
from auth.users u
on conflict (user_id) do nothing;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
