-- Fix nearby_profiles: do not COALESCE text columns with text[] (e.g. identity_tags).

drop function if exists public.nearby_profiles(double precision, double precision, uuid) cascade;

create or replace function public.nearby_profiles(
  user_lat double precision,
  user_lng double precision,
  current_user_id uuid
)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  profile_picture_url text,
  distance_miles double precision,
  age integer,
  gender_identity text,
  body_type text,
  relationship_status text,
  is_online boolean,
  show_location boolean,
  show_online_status boolean
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if current_user_id is distinct from auth.uid() then
    raise exception 'Not authorized';
  end if;

  return query
  with viewer_preferences as (
    select
      coalesce(up.distance_radius_miles, 25) as radius_miles,
      up.min_age_preference,
      up.max_age_preference,
      up.height_min_cm,
      up.height_max_cm,
      coalesce(up.show_me, up.show_preference, '') as show_me_text,
      coalesce(up.body_types, '{}'::text[]) as body_types,
      coalesce(up.relationship_status_filter, '{}'::text[]) as relationship_status_filter,
      coalesce(up.intimacy_roles_filter, '{}'::text[]) as intimacy_roles_filter,
      coalesce(up.identity_tags_filter, '{}'::text[]) as identity_tags_filter,
      coalesce(up.relationship_intent_filter, '{}'::text[]) as relationship_intent_filter,
      coalesce(up.looking_for_filter, '{}'::text[]) as looking_for_filter,
      coalesce(up.show_online_only, false) as show_online_only
    from public.user_preferences up
    where up.user_id = current_user_id
    limit 1
  ),
  candidates as (
    select
      p.id,
      p.username,
      p.display_name,
      p.bio,
      p.profile_picture_url,
      public._distance_miles(user_lat, user_lng, p.latitude, p.longitude) as distance_miles,
      case
        when p.date_of_birth is null then null
        else extract(
          year from age(current_date, p.date_of_birth)
        )::integer
      end as age,
      p.gender_identity,
      p.body_type,
      p.relationship_status,
      p.height_cm,
      p.last_active_at,
      coalesce(p.show_location, true) as show_location,
      coalesce(p.show_online_status, true) as show_online_status,
      up.intimacy_role,
      coalesce(up.intimacy_preferences, '{}'::text[]) as intimacy_preferences,
      up.relationship_intent,
      up.looking_for
    from public.user_profiles p
    join public.user_preferences up
      on up.user_id = p.id
    where p.id <> current_user_id
      and up.is_discoverable = true
      and p.latitude is not null
      and p.longitude is not null
      and not exists (
        select 1
        from public.user_blocks b
        where (b.blocker_id = current_user_id and b.blocked_id = p.id)
           or (b.blocker_id = p.id and b.blocked_id = current_user_id)
      )
  )
  select
    c.id,
    c.username,
    c.display_name,
    c.bio,
    c.profile_picture_url,
    case when c.show_location then c.distance_miles else null end as distance_miles,
    c.age,
    c.gender_identity,
    c.body_type,
    c.relationship_status,
    case
      when not c.show_online_status then false
      when c.last_active_at is not null
        and c.last_active_at >= now() - interval '15 minutes' then true
      else false
    end as is_online,
    c.show_location,
    c.show_online_status
  from candidates c
  cross join viewer_preferences vp
  where c.distance_miles <= vp.radius_miles
    and (vp.min_age_preference is null or c.age is null or c.age >= vp.min_age_preference)
    and (vp.max_age_preference is null or c.age is null or c.age <= vp.max_age_preference)
    and (vp.height_min_cm is null or c.height_cm is null or c.height_cm >= vp.height_min_cm)
    and (vp.height_max_cm is null or c.height_cm is null or c.height_cm <= vp.height_max_cm)
    and (
      vp.show_me_text = ''
      or vp.show_me_text ilike '%Everyone%'
      or c.gender_identity is null
      or vp.show_me_text ilike ('%' || c.gender_identity || '%')
    )
    and (
      cardinality(vp.body_types) = 0
      or c.body_type is null
      or c.body_type = any (vp.body_types)
    )
    and (
      cardinality(vp.relationship_status_filter) = 0
      or c.relationship_status is null
      or c.relationship_status = any (vp.relationship_status_filter)
    )
    and (
      cardinality(vp.intimacy_roles_filter) = 0
      or c.intimacy_role is null
      or c.intimacy_role = any (vp.intimacy_roles_filter)
    )
    and (
      cardinality(vp.identity_tags_filter) = 0
      or c.intimacy_preferences && vp.identity_tags_filter
    )
    and (
      cardinality(vp.relationship_intent_filter) = 0
      or c.relationship_intent is null
      or c.relationship_intent = any (vp.relationship_intent_filter)
    )
    and (
      cardinality(vp.looking_for_filter) = 0
      or c.looking_for is null
      or c.looking_for = any (vp.looking_for_filter)
    )
    and (
      not vp.show_online_only
      or (
        c.last_active_at is not null
        and c.last_active_at >= now() - interval '15 minutes'
      )
    )
  order by c.distance_miles asc;
end;
$$;

revoke all on function public.nearby_profiles(double precision, double precision, uuid) from public;
grant execute on function public.nearby_profiles(double precision, double precision, uuid) to authenticated;
