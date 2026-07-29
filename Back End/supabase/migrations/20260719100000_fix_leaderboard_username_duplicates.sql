with ranked_entries as (
  select 
    username,
    display_name,
    heritage_points,
    avatar_url,
    updated_at,
    row_number() over (partition by lower(username) order by updated_at desc) as rn
  from public.leaderboard_entries
)
delete from public.leaderboard_entries
where username in (
  select username from ranked_entries where rn > 1
);
 
-- Improve the update_player_profile function to handle username changes more robustly
create or replace function public.update_player_profile(
  p_username text,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  user_id uuid := auth.uid();
  old_row public.profiles;
  clean_username text;
  clean_display text;
  new_row public.profiles;
  old_username_lower text;
  new_username_lower text;
begin
  if user_id is null then
    raise exception 'Not authenticated';
  end if;
 
  select * into old_row from public.profiles where id = user_id;
  if not found then
    raise exception 'Profile not found';
  end if;
 
  clean_username := lower(trim(coalesce(p_username, '')));
  clean_display := trim(coalesce(p_display_name, ''));
 
  if clean_display = '' then
    raise exception 'Display name is required';
  end if;
 
  if length(clean_display) > 48 then
    raise exception 'Display name must be 48 characters or fewer';
  end if;
 
  if clean_username = '' or length(clean_username) < 3 or length(clean_username) > 24 then
    raise exception 'Username must be 3–24 characters';
  end if;
 
  if clean_username !~ '^[a-z0-9._-]+$' then
    raise exception 'Username may only use letters, numbers, . _ -';
  end if;
 
  if exists (
    select 1 from public.profiles
    where username = clean_username and id <> user_id
  ) then
    raise exception 'That username is already taken';
  end if;
 
  old_username_lower := lower(old_row.username);
  new_username_lower := clean_username;
 
  -- Update profile
  update public.profiles
  set
    username = clean_username,
    display_name = clean_display
  where id = user_id
  returning * into new_row;
 
  -- Handle leaderboard entries when username changes
  if old_username_lower is distinct from new_username_lower then
    -- First, delete the old username entry to prevent duplicates
    delete from public.leaderboard_entries
    where lower(username) = old_username_lower;
 
    -- Then insert/update the new username entry
    insert into public.leaderboard_entries (
      username,
      display_name,
      heritage_points,
      avatar_url
    )
    values (
      clean_username,
      clean_display,
      old_row.heritage_points,
      old_row.avatar_url
    )
    on conflict (username) do update
      set
        display_name = excluded.display_name,
        heritage_points = greatest(
          public.leaderboard_entries.heritage_points,
          excluded.heritage_points
        ),
        avatar_url = coalesce(
          excluded.avatar_url,
          public.leaderboard_entries.avatar_url
        ),
        updated_at = now();
  else
    -- Just update display name if username hasn't changed
    update public.leaderboard_entries
    set
      display_name = clean_display,
      updated_at = now()
    where username = clean_username;
  end if;
 
  return new_row;
end;
$$;
 
revoke all on function public.update_player_profile(text, text) from public;
grant execute on function public.update_player_profile(text, text) to authenticated;