create or replace function public.sync_heritage_points(
  p_username text,
  p_points integer,
  p_display_name text default null
)
returns public.leaderboard_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_username text;
  clean_display text;
  next_points integer;
  row_out public.leaderboard_entries;
  profile_username text;
begin
  clean_username := lower(regexp_replace(coalesce(p_username, ''), '[^a-z0-9._-]', '', 'g'));
  if clean_username = '' or length(clean_username) < 2 then
    raise exception 'invalid username';
  end if;
 
  next_points := greatest(0, coalesce(p_points, 0));
  clean_display := nullif(trim(coalesce(p_display_name, '')), '');
  if clean_display is null then
    clean_display := clean_username;
  end if;
 
  -- Check if there's a profile with this username and use its current username
  -- This prevents recreating old usernames when the user has changed their name
  select username into profile_username
  from public.profiles
  where lower(username) = clean_username
  limit 1;
 
  if profile_username is not null then
    clean_username := profile_username;
  end if;
 
  insert into public.leaderboard_entries (username, display_name, heritage_points)
  values (clean_username, clean_display, next_points)
  on conflict (username) do update
    set
      display_name = excluded.display_name,
      heritage_points = greatest(
        public.leaderboard_entries.heritage_points,
        excluded.heritage_points
      ),
      updated_at = now()
  returning * into row_out;
 
  -- Keep Auth profiles in sync when the player has a matching username.
  update public.profiles
  set heritage_points = greatest(heritage_points, next_points)
  where lower(username) = clean_username;
 
  return row_out;
end;
$$;
 
revoke all on function public.sync_heritage_points(text, integer, text) from public;
grant execute on function public.sync_heritage_points(text, integer, text) to anon, authenticated;
 