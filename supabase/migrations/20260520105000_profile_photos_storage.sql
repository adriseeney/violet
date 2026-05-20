-- Storage support for persistent profile photos.
--
-- The app stores the selected avatar in public.user_profiles.profile_picture_url.
-- Local ImagePicker file:// URIs are not durable, so they must be uploaded to a
-- Supabase Storage bucket first.

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
