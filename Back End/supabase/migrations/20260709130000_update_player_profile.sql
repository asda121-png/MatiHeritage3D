-- Let players customize username and display name (including after Google Sign-In).

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

  update public.profiles
  set
    username = clean_username,
    display_name = clean_display
  where id = user_id
  returning * into new_row;

  if old_row.username is distinct from clean_username then
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

    delete from public.leaderboard_entries
    where username = old_row.username;
  else
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

-- Prefer Google full name when auto-creating profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  clean_username text;
  raw_display text;
begin
  raw_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );
  clean_username := lower(regexp_replace(raw_username, '[^a-z0-9._-]', '', 'g'));

  if clean_username = '' or length(clean_username) < 3 then
    clean_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  raw_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    clean_username
  );

  insert into public.profiles (id, username, display_name, email, avatar_url)
  values (
    new.id,
    clean_username,
    raw_display,
    new.email,
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
