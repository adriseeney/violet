git merge feature/backend-data-layer-- Storage support for persistent profile photos.
--
-- The app stores the selected avatar in public.user_profiles.profile_picture_url.
-- Local ImagePicker file:// URIs are not durable, so they must be uploaded to a
-- Supabase Storage bucket first.

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
      coalesce((to_jsonb(user_photos) ->> 'is_private')::boolean, false) = false
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

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update
set public = true;

drop policy if exists "profile_photos_select_public" on storage.objects;
create policy "profile_photos_select_public"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_insert_own" on storage.objects;
create policy "profile_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "profile_photos_update_own" on storage.objects;
create policy "profile_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "profile_photos_delete_own" on storage.objects;
create policy "profile_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
