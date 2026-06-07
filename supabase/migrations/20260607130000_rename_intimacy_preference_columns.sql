-- Rename legacy preference columns to intimacy terminology.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_preferences'
      and column_name = 'sexual_role'
  ) then
    alter table public.user_preferences
      rename column sexual_role to intimacy_role;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_preferences'
      and column_name = 'sexual_preference'
  ) then
    alter table public.user_preferences
      rename column sexual_preference to show_preference;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_preferences'
      and column_name = 'sexual_position'
  ) then
    alter table public.user_preferences
      rename column sexual_position to intimacy_position;
  end if;
end $$;
