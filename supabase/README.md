# Supabase SQL scripts

Run the SQL files in `supabase/migrations/` in filename order. They are written
to be idempotent, so they are safe to paste into the Supabase SQL Editor during
development if you need to verify or repair your project schema.

## Order

1. `20260416170000_profiles_preferences_auth_trigger.sql`
   - Creates/backfills `user_profiles` and `user_preferences`.
   - Adds the `auth.users` trigger that creates profile/preference rows for new
     signups.
2. `20260416175000_app_support_tables_and_discovery.sql`
   - Adds profile support columns, `user_photos`, settings/social/safety/city
     tables, and discovery RPCs (`update_user_location`, `nearby_profiles`).
3. `20260416180000_direct_messages.sql`
   - Creates DM tables, policies, Realtime publication, and chat RPCs.
4. `20260416190000_fix_conversation_participants_rls_recursion.sql`
   - Re-applies safer DM RLS helper functions/policies.

## Current app-critical objects

The app directly uses these Supabase objects today:

- Auth: Supabase Auth `auth.users`
- Tables: `user_profiles`, `user_preferences`, `user_photos`,
  `conversations`, `conversation_participants`, `messages`
- RPCs: `nearby_profiles`, `update_user_location`, `get_or_create_dm`,
  `list_conversation_summaries`, `mark_conversation_read`

The support script also creates tables for UI flows that are currently local or
partially mocked, so the backend is ready when those screens are connected.
