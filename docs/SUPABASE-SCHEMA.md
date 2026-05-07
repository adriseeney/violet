# Violet — Supabase schema and function map

This document maps Violet app functionality to the Supabase tables, RPC
functions, policies, and storage buckets the app expects or will need soon.

It is based on the current Expo codebase:

- `services/auth.ts`
- `services/users.ts`
- `services/chat.ts`
- `src/store/useAuthStore.ts`
- routes under `app/`
- migrations under `supabase/migrations/`

---

## 1. Current Supabase contract at a glance

| App feature | Client entry points | Supabase objects |
|-------------|---------------------|------------------|
| Email/password signup | `app/(auth)/signup.tsx`, `useAuthStore.signUp`, `services/auth.ts` | Supabase Auth `auth.users`, `user_profiles`, `user_preferences` |
| Login/session restore/logout | `app/(auth)/login.tsx`, `app/_layout.tsx`, `app/(tabs)/settings.tsx`, `useAuthStore` | Supabase Auth session APIs |
| Browse nearby profiles | `app/(tabs)/index.tsx`, `services/users.ts` | `nearby_profiles(...)` RPC, `user_profiles`, `user_preferences` |
| Current user's profile | `app/(tabs)/profile.tsx`, `services/users.ts` | `user_profiles`; recommended: `user_photos`, `user_preferences` |
| Public profile detail | `app/profile/[id].tsx`, `services/users.ts` | `user_profiles`, `user_photos`, `get_or_create_dm(...)` |
| Preferences screens | `app/preferences/*.tsx` | Recommended: `user_preferences` fields; current screens are mostly local UI state |
| Chat inbox | `app/(tabs)/chats.tsx`, `services/chat.ts` | `list_conversation_summaries()` RPC, `conversations`, `conversation_participants`, `messages`, `user_profiles` |
| Chat thread | `app/chat/[id].tsx`, `hooks/useChatMessages.ts`, `services/chat.ts` | `messages`, Realtime on `messages`, `mark_conversation_read(...)` RPC |
| Explore cities | `app/(tabs)/explore.tsx` | Currently mock; recommended future `cities` / `city_activity_stats` |
| Favorites/block buttons | `components/UserCard.tsx` | Currently local alerts; recommended future `user_favorites`, `user_blocks`, `user_reports` |
| Delete account | `app/(tabs)/settings.tsx` | Currently signs out only; recommended future Edge Function using service role |

---

## 2. Tables the app should have now

### 2.1 `auth.users`

Supabase Auth owns this table. The app should not write it directly.

Purpose in app:

- Auth user id is the canonical `user_id`.
- `user_profiles.id` should equal `auth.users.id`.
- `conversation_participants.user_id` and `messages.sender_id` reference it.

---

### 2.2 `public.user_profiles`

One row per authenticated user. This backs signup profile creation, Browse,
Profile, public profile detail, chat headers, and nearby discovery.

Recommended columns:

| Column | Type | Required | Used by |
|--------|------|----------|---------|
| `id` | `uuid primary key references auth.users(id) on delete cascade` | Yes | All profile lookups |
| `email` | `text` | Yes | Signup seed, account/admin lookup |
| `username` | `text unique` | Yes | Browse/profile/chat display fallback |
| `display_name` | `text` | No | Browse/profile/chat display |
| `bio` | `text` | No | Browse search/profile |
| `date_of_birth` | `date` | No | Age calculation |
| `gender_identity` | `text` | No | Profile display/filtering |
| `location_city` | `text` | No | Profile display |
| `location_state` | `text` | No | Profile display |
| `location_country` | `text` | No | Future city/explore support |
| `latitude` | `double precision` | No | Nearby RPC, if not using PostGIS |
| `longitude` | `double precision` | No | Nearby RPC, if not using PostGIS |
| `location` | `geography(Point, 4326)` | No | Nearby RPC, if using PostGIS |
| `profile_picture_url` | `text` | No | Browse/profile/chat avatar |
| `height_cm` | `integer` | No | Profile edit/filtering |
| `weight_kg` | `integer` | No | Profile edit/display |
| `ethnicity` | `text` | No | Profile edit/display |
| `body_type` | `text` | No | Filtering |
| `relationship_status` | `text` | No | Filtering/profile |
| `show_location` | `boolean default true` | No | Settings/privacy |
| `show_online_status` | `boolean default true` | No | Settings/profile |
| `last_active_at` | `timestamptz` | No | Online/last seen |
| `created_at` | `timestamptz default now()` | Yes | Auditing |
| `updated_at` | `timestamptz default now()` | Yes | Auditing |

Current client calls:

- `createUserProfile(...)` inserts `id`, `email`, `display_name`, `bio`,
  `date_of_birth`, `gender_identity`, `location_city`, `location_state`,
  `profile_picture_url`.
- `getCurrentUserProfile()` selects `*` where `id = auth user id`.
- `getProfileById(profileId)` selects `*` where `id = profileId`.
- `nearby_profiles(...)` should return selected profile fields from this table.

Important implementation note:

- `IUserProfilePayload` includes `username`, but `createUserProfile` currently
  does not insert `username`. Either add `username` to that insert or make
  `display_name` the unique user-facing handle. The table design above assumes
  `username` exists because the app maps it as a fallback in multiple places.

Recommended indexes:

- `unique index on user_profiles(lower(username))`
- `index on user_profiles(location_city, location_state)`
- `index on user_profiles(last_active_at desc)`
- If using PostGIS: `gist index on user_profiles using gist(location)`

---

### 2.3 `public.user_preferences`

One row per user for discovery filters, relationship intent, intimacy fields,
and disclosure controls.

Recommended columns:

| Column | Type | Required | Used by |
|--------|------|----------|---------|
| `user_id` | `uuid primary key references auth.users(id) on delete cascade` | Yes | Owner profile/preferences |
| `sexual_preference` | `text` | No | Signup/preferences |
| `relationship_intent` | `text` | No | Signup/preferences |
| `looking_for` | `text` or `text[]` | No | Signup/preferences |
| `show_me` | `text` or `text[]` | No | "I'm interested in" |
| `min_age_preference` | `integer` | No | Filtering |
| `max_age_preference` | `integer` | No | Filtering |
| `distance_radius_miles` | `integer default 25` | No | Nearby RPC |
| `is_discoverable` | `boolean default true` | No | Nearby RPC |
| `sexual_role` | `text` | No | Intimacy preferences |
| `sexual_position` | `text` | No | Intimacy preferences |
| `intimacy_preferences` | `text[] default '{}'` | No | Intimacy preferences |
| `sex_style` | `text` | No | Intimacy preferences |
| `hiv_status` | `text` | No | Intimacy preferences |
| `safety_practices` | `text` | No | Intimacy preferences |
| `show_preferences_publicly` | `boolean default false` | No | Public profile disclosure |
| `height_min_cm` | `integer` | No | Filtering |
| `height_max_cm` | `integer` | No | Filtering |
| `body_types` | `text[] default '{}'` | No | Filtering |
| `relationship_status_filter` | `text[] default '{}'` | No | Filtering |
| `show_online_only` | `boolean default false` | No | Filtering |
| `created_at` | `timestamptz default now()` | Yes | Auditing |
| `updated_at` | `timestamptz default now()` | Yes | Auditing |

Current client calls:

- `createUserPreferences(...)` inserts signup defaults.
- Preference screens currently keep most values in local component state and
  should be wired to upsert this table when those screens become persistent.
- `nearby_profiles(...)` should use `distance_radius_miles`,
  `is_discoverable`, and later age/gender/relationship filters.

---

### 2.4 `public.user_photos`

The public profile route already queries this table:

```ts
supabaseConfig.from('user_photos').select('*').eq('user_id', profileId)
```

Recommended columns:

| Column | Type | Required | Used by |
|--------|------|----------|---------|
| `id` | `uuid primary key default gen_random_uuid()` | Yes | Photo row identity |
| `user_id` | `uuid references auth.users(id) on delete cascade` | Yes | Photo owner |
| `url` | `text` | Yes | Current app display |
| `storage_path` | `text` | No | Supabase Storage management |
| `display_order` | `integer default 0` | No | Gallery order |
| `is_primary` | `boolean default false` | No | Profile avatar sync |
| `is_private` | `boolean default false` | No | Hidden album / private photos |
| `created_at` | `timestamptz default now()` | Yes | Auditing |
| `updated_at` | `timestamptz default now()` | Yes | Auditing |

Recommended constraints/indexes:

- `index on user_photos(user_id, display_order)`
- Optional: partial unique index so each user has one primary photo:
  `unique(user_id) where is_primary`

Storage relationship:

- Use a Supabase Storage bucket such as `profile-photos`.
- Store public avatar paths in `profile_picture_url`.
- Store gallery paths in `user_photos.storage_path` and public or signed URLs in
  `url`, depending on privacy needs.

---

### 2.5 Direct message tables

These already exist in `supabase/migrations/20260416180000_direct_messages.sql`.

| Table | Purpose |
|-------|---------|
| `conversations` | One row per DM conversation |
| `conversation_participants` | Join table between conversations and users |
| `messages` | Persisted messages with `body`, `sender_id`, `read_at` |

Current client calls:

- `listConversationSummaries()` calls `list_conversation_summaries()`.
- `getOrCreateDm(otherUserId)` calls `get_or_create_dm(other_user_id)`.
- `fetchMessages(conversationId)` selects rows from `messages`.
- `sendChatMessage(conversationId, body)` inserts into `messages`.
- `markConversationRead(conversationId)` calls `mark_conversation_read(...)`.
- `hooks/useChatMessages.ts` subscribes to Realtime inserts on `messages`.

Keep the migration's RLS helpers:

- `user_is_conversation_member(p_conversation_id)`
- `users_share_a_dm_chat(p_a, p_b)`

---

## 3. RPC functions the app should have

### 3.1 `public.update_user_location(...)`

Current client signature:

```ts
supabaseConfig.rpc("update_user_location", {
  current_user_id: session.user.id,
  user_lat: latitude,
  user_lng: longitude,
});
```

Recommended behavior:

- Require `current_user_id = auth.uid()`.
- Update the current user's profile coordinates.
- If using PostGIS, also update `location = st_point(user_lng, user_lat)::geography`.
- Update `updated_at`.
- Return the updated profile id or `void`.

Recommended arguments:

| Argument | Type |
|----------|------|
| `current_user_id` | `uuid` |
| `user_lat` | `double precision` |
| `user_lng` | `double precision` |

Status:

- The service exists, but Browse currently does not call it. Browse passes device
  coordinates directly to `nearby_profiles(...)`.

---

### 3.2 `public.nearby_profiles(...)`

Current client signature:

```ts
supabaseConfig.rpc("nearby_profiles", {
  user_lat: latitude,
  user_lng: longitude,
  current_user_id: session.user.id,
});
```

Required return columns:

| Return column | Type | Maps to |
|---------------|------|---------|
| `id` | `uuid` or `text` | `User.id` |
| `username` | `text` | Browse card fallback |
| `display_name` | `text` | Browse card display |
| `bio` | `text` | Browse search/display |
| `profile_picture_url` | `text` | Browse card image |
| `distance_miles` | `numeric` / `double precision` | Browse distance |

Recommended behavior:

- Require `current_user_id = auth.uid()`.
- Exclude the current user.
- Only return rows where `user_preferences.is_discoverable = true`.
- Exclude users blocked by or blocking the current user when `user_blocks` is added.
- Calculate distance from `user_lat`, `user_lng`.
- Respect the current user's `distance_radius_miles` if present.
- Later, apply age/gender/relationship filters from `user_preferences`.
- Sort by distance ascending.

---

### 3.3 Direct message RPCs

Already defined by the DM migration.

| Function | Called by | Purpose |
|----------|-----------|---------|
| `get_or_create_dm(other_user_id uuid)` | `services/chat.ts` | Creates or returns a 1:1 conversation UUID |
| `list_conversation_summaries()` | `services/chat.ts` | Inbox rows with last message and unread count |
| `mark_conversation_read(p_conversation_id uuid)` | `services/chat.ts` | Sets `read_at` on incoming unread messages |
| `user_is_conversation_member(p_conversation_id uuid)` | RLS helper | Checks if `auth.uid()` is in a conversation |
| `users_share_a_dm_chat(p_a uuid, p_b uuid)` | RLS helper | Lets chat partners read each other's profile row |

---

## 4. Recommended future tables from existing UI

These are not required for the currently wired Supabase paths, but the UI already
has placeholders that map cleanly to these tables.

### 4.1 `public.user_favorites`

For the `Favorite` action in `UserCard`.

| Column | Type |
|--------|------|
| `user_id` | `uuid references auth.users(id) on delete cascade` |
| `favorite_user_id` | `uuid references auth.users(id) on delete cascade` |
| `created_at` | `timestamptz default now()` |

Primary key: `(user_id, favorite_user_id)`.

### 4.2 `public.user_blocks`

For the `Block` action in `UserCard` and discovery/chat exclusion.

| Column | Type |
|--------|------|
| `blocker_id` | `uuid references auth.users(id) on delete cascade` |
| `blocked_id` | `uuid references auth.users(id) on delete cascade` |
| `reason` | `text` |
| `created_at` | `timestamptz default now()` |

Primary key: `(blocker_id, blocked_id)`.

Use this table in:

- `nearby_profiles(...)` to hide blocked users both directions.
- `get_or_create_dm(...)` to prevent DMs when either user blocked the other.

### 4.3 `public.user_reports`

For future safety/reporting flows.

| Column | Type |
|--------|------|
| `id` | `uuid primary key default gen_random_uuid()` |
| `reporter_id` | `uuid references auth.users(id) on delete cascade` |
| `reported_user_id` | `uuid references auth.users(id) on delete cascade` |
| `reason` | `text not null` |
| `details` | `text` |
| `status` | `text default 'open'` |
| `created_at` | `timestamptz default now()` |

### 4.4 `public.hidden_album_requests`

For the "Request Hidden Album" UI in public profiles.

| Column | Type |
|--------|------|
| `id` | `uuid primary key default gen_random_uuid()` |
| `requester_id` | `uuid references auth.users(id) on delete cascade` |
| `owner_id` | `uuid references auth.users(id) on delete cascade` |
| `status` | `text default 'pending'` |
| `created_at` | `timestamptz default now()` |
| `responded_at` | `timestamptz` |

### 4.5 `public.user_settings`

For settings toggles that are currently local state.

| Column | Type |
|--------|------|
| `user_id` | `uuid primary key references auth.users(id) on delete cascade` |
| `notifications_enabled` | `boolean default true` |
| `show_location` | `boolean default false` |
| `show_online` | `boolean default true` |
| `theme_preference` | `text default 'system'` |
| `created_at` | `timestamptz default now()` |
| `updated_at` | `timestamptz default now()` |

Some fields could also live on `user_profiles` or `user_preferences`; keep this
table only if you want settings separate from profile/discovery data.

### 4.6 `public.cities` and `public.city_activity_stats`

For replacing `useMockCities` in Explore.

`cities`:

| Column | Type |
|--------|------|
| `id` | `uuid primary key default gen_random_uuid()` |
| `name` | `text not null` |
| `state` | `text` |
| `country` | `text not null` |
| `latitude` | `double precision` |
| `longitude` | `double precision` |
| `image_url` | `text` |

`city_activity_stats`:

| Column | Type |
|--------|------|
| `city_id` | `uuid references cities(id) on delete cascade` |
| `active_users` | `integer default 0` |
| `updated_at` | `timestamptz default now()` |

---

## 5. Recommended Edge Functions

Use Edge Functions for operations that need elevated privileges or external
services. Do not put service-role keys in the mobile app.

| Function | Needed for | Why Edge Function instead of client write |
|----------|------------|-------------------------------------------|
| `delete-account` | Real account deletion from Settings | Deleting `auth.users` requires service-role authority |
| `moderate-report` | Admin/report workflows | Users should not update report status directly |
| `create-signed-photo-url` | Private/hidden album access | Server decides whether requester has access |
| `send-push-notification` | Chat/message notifications | Requires push credentials and rate limiting |

Current Settings "Delete Account" should be treated as sign-out only until
`delete-account` exists.

---

## 6. RLS policy expectations

| Object | Select policy | Insert policy | Update/delete policy |
|--------|---------------|---------------|----------------------|
| `user_profiles` | Own row; discoverable public rows; chat partner rows | `id = auth.uid()` | Own row only |
| `user_preferences` | Own row only, except public preference subset can be exposed through a view/RPC | `user_id = auth.uid()` | Own row only |
| `user_photos` | Own photos; public photos for visible profiles; private photos only by owner/approved requesters | Owner only | Owner only |
| `conversations` | Participants only | Prefer RPC only | Participants via controlled RPC if needed |
| `conversation_participants` | Participants in same conversation | Prefer RPC only | Prefer RPC/admin only |
| `messages` | Conversation participants | Participant and `sender_id = auth.uid()` | Recipients can set `read_at`; sender edits only if product supports it |
| `user_favorites` | Owner only | `user_id = auth.uid()` | Owner only |
| `user_blocks` | Owner only | `blocker_id = auth.uid()` | Owner only |
| `user_reports` | Reporter can read own reports; admin role can read all | `reporter_id = auth.uid()` | Admin only |

For profile privacy, prefer RPCs/views that return only the fields another user
is allowed to see. Avoid exposing private preference or health fields through a
broad `select("*")` policy.

---

## 7. Storage buckets

| Bucket | Access | App use |
|--------|--------|---------|
| `profile-photos` | Public or signed URL, depending on privacy model | Avatars and profile gallery |
| `chat-attachments` | Private/authenticated | Future image/file messages |

Current chat image sending is a placeholder text message (`[Image sent]`), so
`chat-attachments` is future work.

---

## 8. Suggested migration order

1. Base profile/preferences schema:
   - `user_profiles`
   - `user_preferences`
   - RLS policies for both
2. Photos:
   - `user_photos`
   - `profile-photos` storage bucket and policies
3. Discovery:
   - `update_user_location(...)`
   - `nearby_profiles(...)`
   - optional PostGIS setup
4. Direct messages:
   - already represented by `supabase/migrations/20260416180000_direct_messages.sql`
   - then apply `20260416190000_fix_conversation_participants_rls_recursion.sql`
5. Safety/social:
   - `user_blocks`
   - `user_reports`
   - `user_favorites`
6. Account operations:
   - `delete-account` Edge Function

---

## 9. Known app/schema gaps to close

| Gap | Why it matters | Recommended fix |
|-----|----------------|-----------------|
| `createUserProfile` payload includes `username`, but insert omits it | Username may be missing even though UI collects it | Insert `username` into `user_profiles` or remove the field from the UI/API contract |
| Preference sub-screens are local only | User choices do not persist | Add `getUserPreferences` / `upsertUserPreferences` service methods |
| Profile edit save is simulated | User profile edits/photos do not persist | Add update profile/photo upload services |
| Browse does not call `updateCurrentUserLocation` | Stored coordinates may go stale | Call it when location changes, or keep `nearby_profiles` purely coordinate-based |
| `UserCard` message button routes to `/chat/{user.id}` | Chat route expects conversation id | Call `get_or_create_dm(user.id)` before navigating |
| Delete account only signs out | User and data remain in Supabase | Add `delete-account` Edge Function |
| Explore cities are mock | City search/activity is not backed by Supabase | Add `cities` and city activity queries |

---

## 10. Keep this document updated

Update this file when:

- a route starts reading/writing a new table,
- an RPC signature changes,
- a preference/profile field is added to the UI,
- a mock hook is replaced with Supabase,
- RLS/privacy behavior changes.
