-- Fix: "infinite recursion detected in policy for relation conversation_participants"
-- Policies must not SELECT from conversation_participants inside conversation_participants RLS.
-- Use SECURITY DEFINER helpers that bypass RLS for membership checks.

create or replace function public.user_is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = auth.uid()
  );
$$;

revoke all on function public.user_is_conversation_member(uuid) from public;
grant execute on function public.user_is_conversation_member(uuid) to authenticated;

create or replace function public.users_share_a_dm_chat(p_a uuid, p_b uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.conversation_participants cp1
    join public.conversation_participants cp2
      on cp1.conversation_id = cp2.conversation_id
    where cp1.user_id = p_a
      and cp2.user_id = p_b
  );
$$;

revoke all on function public.users_share_a_dm_chat(uuid, uuid) from public;
grant execute on function public.users_share_a_dm_chat(uuid, uuid) to authenticated;

-- conversations
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select
  using (public.user_is_conversation_member(id));

-- conversation_participants (no self-subquery)
drop policy if exists "participants_select_member" on public.conversation_participants;
create policy "participants_select_member"
  on public.conversation_participants for select
  using (public.user_is_conversation_member(conversation_id));

-- messages
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (public.user_is_conversation_member(conversation_id));

drop policy if exists "messages_insert_self_participant" on public.messages;
create policy "messages_insert_self_participant"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and public.user_is_conversation_member(conversation_id)
  );

drop policy if exists "messages_update_read_by_recipient" on public.messages;
create policy "messages_update_read_by_recipient"
  on public.messages for update
  using (
    sender_id <> (select auth.uid())
    and public.user_is_conversation_member(conversation_id)
  )
  with check (
    sender_id <> (select auth.uid())
    and public.user_is_conversation_member(conversation_id)
  );

-- user_profiles (avoid join on conversation_participants inside policy)
drop policy if exists "user_profiles_select_chat_partners" on public.user_profiles;
create policy "user_profiles_select_chat_partners"
  on public.user_profiles for select
  using (public.users_share_a_dm_chat((select auth.uid()), user_profiles.id));
