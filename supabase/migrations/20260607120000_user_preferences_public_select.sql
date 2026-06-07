-- Allow viewing another user's preferences when they opt in to public display.

drop policy if exists "user_preferences_select_public" on public.user_preferences;

create policy "user_preferences_select_public"
  on public.user_preferences
  for select
  using (
    auth.uid() = user_id
    or show_preferences_publicly = true
  );
