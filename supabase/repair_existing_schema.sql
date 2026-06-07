-- Run this once in Supabase SQL Editor if your project already has partial
-- tables/functions and the full support migration fails.
--
-- After this succeeds, rerun:
-- supabase/migrations/20260416175000_app_support_tables_and_discovery.sql

alter table if exists public.user_photos
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists user_id uuid references auth.users (id) on delete cascade,
  add column if not exists url text,
  add column if not exists storage_path text,
  add column if not exists display_order integer not null default 0,
  add column if not exists is_primary boolean not null default false,
  add column if not exists is_private boolean not null default false,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop function if exists public.update_user_location(uuid, double precision, double precision) cascade;
drop function if exists public.nearby_profiles(double precision, double precision, uuid) cascade;

-- Optional: rename intimacy preference columns (also in 20260607130000_rename_intimacy_preference_columns.sql)
-- Run if profile save fails with "column intimacy_role does not exist"
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_preferences' and column_name = 'sexual_role'
  ) then
    alter table public.user_preferences rename column sexual_role to intimacy_role;
  end if;
end $$;
