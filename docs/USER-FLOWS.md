# Violet — user flows

What a **person using the app** can do today, the **order of steps**, which parts are **real (Supabase / device)** vs **mock**, and known **gaps**. For system structure, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 1. Flow summary

| Flow | Primary screens | Backend / data |
|------|-----------------|----------------|
| Sign up | `(auth)/signup` | **Supabase** auth + `user_profiles` + `user_preferences` |
| Log in | `(auth)/login` | **Supabase** session |
| Session restore | Cold start → `(tabs)` or `(auth)/login` | **Supabase** persisted session + `SessionGate` |
| Browse nearby | `(tabs)/index` | **Device location** + **RPC** `nearby_profiles` |
| Explore by city | `(tabs)/explore` | **Mock** (`useMockCities`) |
| Chats list | `(tabs)/chats` | **Supabase** RPC `list_conversation_summaries` (`useChats`) |
| Chat thread | `chat/[id]` | **Supabase** `messages` + Realtime; `[id]` = **conversation** UUID; image = placeholder text |
| My profile | `(tabs)/profile` | Mixed UI / hooks — verify file for live vs mock |
| View profile | `profile/[id]` | See implementation in screen |
| Preferences | `preferences/*` | Mostly **local UI** state |
| Settings / logout | `(tabs)/settings` | **Supabase** `signOut` |

---

## 2. Sign up (new account)

**Goal:** Create an account and seed profile + preferences so the user can enter the main app.

**Steps**

1. Open app without a session → redirected to **Login**; user navigates to **Sign up**.
2. Enter **email**, **password**, and **username**.
3. Password length validated (minimum 6 characters).
4. App calls `useAuthStore.signUp` → `registerAuthUser` → Supabase `signUp`.
5. On success, app reads new **auth user id**, then:
   - `createUserProfile` → `user_profiles`
   - `createUserPreferences` → `user_preferences` (defaults e.g. discoverable, distance radius)
6. Navigate to **`/(tabs)`** (main tabs).

**Social buttons (Facebook / Google):** simulated in UI (timer + navigate) — not OAuth yet.

**Optional / check in code:** `useMockBotMessages` / `scheduleWelcomeMessage` on signup — confirm in `signup.tsx` if still invoked.

**Requirement met:** end-to-end account + DB rows for profile and preferences.

---

## 3. Log in (returning user)

**Goal:** Restore access with email/password.

**Steps**

1. User enters email + password on **Login**.
2. `useAuthStore.signIn` → `loginAuthUser` → `signInWithPassword`.
3. On success, `router.replace('/(tabs)')`.
4. On next launch, `SessionGate` hydrates `useAuthStore` from the Supabase
   session → user lands in **tabs** if session valid.

**Requirement met:** authenticated access and navigation gate.

---

## 4. Browse people nearby

**Goal:** See other users sorted/filtered by **proximity** (server-defined).

**Steps**

1. User is on **Browse** tab (`(tabs)/index`).
2. `LocationProvider` resolves **foreground permission** and **coordinates** (or error / denied).
3. While resolving: loading UI.
4. If permission not granted: prompt-style UI + retry (`refreshLocation`).
5. If error: error message + retry.
6. If **granted** and coords exist: app calls **`getNearbyProfiles(lat, lng)`** (uses session user id server-side).
7. Results shown as a grid (`UserCard`); **search bar** filters the loaded list **in memory** (name/bio).
8. Pull-to-refresh: `refreshLocation` (re-fetch permission + position, then effect re-runs fetch).

**Requirement met:** location-gated discovery backed by `nearby_profiles`.

**Gap:** **`updateCurrentUserLocation`** is not called from Browse in the current tree. If your product needs the server to store fresh coordinates for matching, add a call when coords change (after success, debounced as needed).

---

## 5. Explore (cities)

**Goal:** Discover activity or people **by city** (product direction).

**Steps**

1. User opens **Explore** tab.
2. Sees **popular cities** and/or searches cities (mock dataset).
3. Tapping a city navigates toward Browse with a **`city` query param** (implementation detail in `explore.tsx`).

**Requirement met (prototype):** city-first exploration UX.

**Gap:** Confirm **Browse** reads `city` and filters or requests server data — otherwise the param is only partially wired.

---

## 6. Chats and messages (Supabase DMs)

**Prerequisite:** Run the SQL migration in `supabase/migrations/20260416180000_direct_messages.sql` on your Supabase project (SQL Editor or CLI). It creates `conversations`, `conversation_participants`, `messages`, RLS policies, RPCs (`get_or_create_dm`, `list_conversation_summaries`, `mark_conversation_read`), and adds `messages` to the `supabase_realtime` publication.

**Goal:** 1:1 direct messages with inbox, thread, read receipts (basic), and live inserts on the open thread.

**Chats list**

1. **Chats** tab refetches when focused (`useChats` → `list_conversation_summaries` RPC).
2. Search filters the loaded list locally (username / last message text).
3. Tap row → `router.push('/chat/{conversationId}')` where `conversationId` is a **conversation UUID**, not the other user’s id.

**Chat thread (`chat/[id]`)**

1. `id` route param = **conversation id**.
2. `useChatMessages` loads header via `fetchConversationMeta` (participants + `user_profiles` for the other person) and loads history via `select` on `messages`.
3. Opening the thread calls **`mark_conversation_read`** (marks incoming messages `read_at`).
4. **Send:** `insert` into `messages` (RLS ensures you are a participant and `sender_id = auth.uid()`).
5. **Realtime:** new rows on `messages` for this `conversation_id` append to the list (other device or same device).
6. **Image:** picker still sends a **placeholder text** line (`[Image sent]`); no Storage upload yet.

**Message from profile**

1. **Message** calls **`get_or_create_dm(other_user_id)`** then navigates to `/chat/{conversationId}`.
2. **Mock profiles** use non-UUID ids — the app shows a clear error until Browse / profiles use real **`auth.users` / `user_profiles` ids**.

**Requirement met:** real persisted chat for authenticated users with matching schema.

---

## 7. Profile (self and others)

**My profile — `(tabs)/profile`**

- Rich editing / display surface; exact persistence depends on code in that file (mix of local state and possible Supabase reads).

**Other user — `profile/[id]`**

- Deep profile view; data wiring is screen-specific (currently often **mock users** for UI).
- **Message** opens a DM via `get_or_create_dm` when `id` is a valid UUID tied to Supabase.

**Requirement (intent):** represent identity, preferences, and safety-related fields where the UI exposes them.

---

## 8. Preferences sub-screens

Routes under `app/preferences/` (e.g. filtering, interests, sexual).

**Typical pattern:** user adjusts controls → saves or backs out. Much of this is **local component state** unless you have added Supabase sync.

**Requirement (intent):** let users tune who they see and what they disclose.

---

## 9. Settings

**Goal:** Account-adjacent controls and exit.

**Steps**

- Theme: **light/dark** via `ThemeContext`.
- Toggles (notifications, online status, location visibility, etc.): mostly **local** `useState` unless wired to backend.
- **Logout:** confirmation → `useAuthStore.signOut` → `logoutAuthUser` →
  clear auth state → `router.replace('/(auth)/login')`.
- **Delete account:** confirmation → currently **`signOut` only** in the destructive path shown in settings — **does not** delete auth user or rows unless you add server logic.

**Requirement met:** logout and settings shell.

**Gap:** true account deletion is a separate product + backend task.

---

## 10. Unauthenticated access

- Any deep link or state without session → **`SessionGate`** sends user to **Login** (unless already in `(auth)`).

---

## 11. Mock vs real (quick matrix)

| Capability | Real | Mock / partial |
|------------|------|----------------|
| Email/password auth | ✓ Supabase | — |
| Profile + prefs rows on signup | ✓ | — |
| Nearby grid | ✓ RPC + location | — |
| City explore | — | ✓ |
| Chats / messages | ✓ Supabase tables + RPCs + Realtime | Mock hooks kept in repo but unused by tabs |
| `services/api.ts` nearby | — | Stub only |

---

## 12. Maintaining this doc

Update when: onboarding steps change, OAuth goes live, chats back Supabase, Browse consumes `city`, or delete-account becomes a real API flow.
