-- Align existing Supabase projects with the profile payload written by the app.
--
-- Some deployed databases had user_profiles without username/height_cm/weight_kg
-- while the auth trigger and client upsert wrote those columns. That causes
-- signup to fail with "Database error saving new user" and profile saves to fail
-- with Postgres code 42703.

alter table public.user_profiles
  add column if not exists username text,
  add column if not exists height_cm integer,
  add column if not exists weight_kg integer;

update public.user_profiles
set username = coalesce(
  nullif(trim(username), ''),
  nullif(trim(display_name), ''),
  nullif(split_part(email, '@', 1), ''),
  'user_' || replace(left(id::text, 8), '-', '')
)
where username is null or trim(username) = '';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'height_in'
  ) then
    execute '
      update public.user_profiles
      set height_cm = round(height_in * 2.54)::integer
      where height_cm is null and height_in is not null
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'weight_lbs'
  ) then
    execute '
      update public.user_profiles
      set weight_kg = round(weight_lbs * 0.453592)::integer
      where weight_kg is null and weight_lbs is not null
    ';
  end if;
end $$;

alter table public.user_profiles enable row level security;

drop policy if exists "user_profiles_select_own" on public.user_profiles;
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (id = (select auth.uid()));

drop policy if exists "user_profiles_insert_own" on public.user_profiles;
create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (id = (select auth.uid()));

drop policy if exists "user_profiles_update_own" on public.user_profiles;
create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

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

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
