-- Keep the deployed profiles schema compatible with the signup trigger.
-- Older deployments were created without display_name, causing auth signup
-- to fail when handle_new_user inserts the profile row.

alter table public.profiles
  add column if not exists display_name text;

update public.profiles
set display_name = coalesce(nullif(trim(username), ''), 'Player')
where display_name is null or trim(display_name) = '';

alter table public.profiles
  alter column display_name set not null;

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
    lower(trim(new.email)),
    nullif(trim(new.raw_user_meta_data->>'avatar_url'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
