-- Direct messages (1:1). Run via Supabase CLI or paste into SQL Editor.
-- Requires public.user_profiles(id) aligned with auth.users(id).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create index if not exists idx_conversation_participants_user
  on public.conversation_participants (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_body_len check (char_length(body) > 0 and char_length(body) <= 8000)
);

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc);

-- Membership helpers: RLS on conversation_participants must NOT subquery the same table
-- (that causes infinite recursion). SECURITY DEFINER reads bypass RLS.

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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select
  using (public.user_is_conversation_member(id));

drop policy if exists "participants_select_member" on public.conversation_participants;
create policy "participants_select_member"
  on public.conversation_participants for select
  using (public.user_is_conversation_member(conversation_id));

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

-- Let users read profile rows for people they share a DM with (for inbox names/avatars).
drop policy if exists "user_profiles_select_chat_partners" on public.user_profiles;
create policy "user_profiles_select_chat_partners"
  on public.user_profiles for select
  using (public.users_share_a_dm_chat((select auth.uid()), user_profiles.id));

-- ---------------------------------------------------------------------------
-- Bump conversation.updated_at when a message is inserted
-- ---------------------------------------------------------------------------

create or replace function public._bump_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_messages_bump_conversation on public.messages;
create trigger trg_messages_bump_conversation
  after insert on public.messages
  for each row
  execute function public._bump_conversation_on_message();

-- ---------------------------------------------------------------------------
-- RPC: get or create 1:1 conversation (SECURITY DEFINER inserts)
-- ---------------------------------------------------------------------------

create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv_id uuid;
  participant_count int;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if other_user_id = me then
    raise exception 'Cannot chat with yourself';
  end if;

  select c.id into conv_id
  from public.conversations c
  where exists (
    select 1 from public.conversation_participants p1
    where p1.conversation_id = c.id and p1.user_id = me
  )
  and exists (
    select 1 from public.conversation_participants p2
    where p2.conversation_id = c.id and p2.user_id = other_user_id
  );

  if conv_id is not null then
    select count(*)::int into participant_count
    from public.conversation_participants p
    where p.conversation_id = conv_id;
    if participant_count = 2 then
      return conv_id;
    end if;
  end if;

  insert into public.conversations default values
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id) values
    (conv_id, me),
    (conv_id, other_user_id);

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_dm(uuid) from public;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: inbox rows for current user
-- ---------------------------------------------------------------------------

create or replace function public.list_conversation_summaries()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  display_name text,
  username text,
  profile_picture_url text,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint
)
language plpgsql
security invoker
set search_path = public
stable
as $$
begin
  return query
  select
    c.id as conversation_id,
    ou.user_id as other_user_id,
    coalesce(p.display_name, p.username, '')::text as display_name,
    p.username::text,
    p.profile_picture_url::text,
    coalesce(lm.body, '')::text as last_message,
    lm.created_at as last_message_at,
    coalesce((
      select count(*)::bigint
      from public.messages m2
      where m2.conversation_id = c.id
        and m2.sender_id <> auth.uid()
        and m2.read_at is null
    ), 0) as unread_count
  from public.conversations c
  join public.conversation_participants me
    on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_participants ou
    on ou.conversation_id = c.id and ou.user_id <> auth.uid()
  join public.user_profiles p on p.id = ou.user_id
  left join lateral (
    select m.body, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  order by coalesce(lm.created_at, c.updated_at) desc nulls last;
end;
$$;

revoke all on function public.list_conversation_summaries() from public;
grant execute on function public.list_conversation_summaries() to authenticated;

-- ---------------------------------------------------------------------------
-- RPC: mark incoming messages read in a conversation
-- ---------------------------------------------------------------------------

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (new messages in open threads)
-- ---------------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
