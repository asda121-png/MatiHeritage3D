-- Live game leaderboard (works with or without Supabase Auth).
-- Games call sync_heritage_points; admin + visitor boards read ranked rows.

create table if not exists public.leaderboard_entries (
  username text primary key,
  display_name text not null,
  heritage_points integer not null default 0 check (heritage_points >= 0),
  avatar_url text,
  updated_at timestamptz not null default now()
);

create index if not exists leaderboard_entries_points_idx
  on public.leaderboard_entries (heritage_points desc);

drop trigger if exists leaderboard_entries_set_updated_at on public.leaderboard_entries;
create trigger leaderboard_entries_set_updated_at
before update on public.leaderboard_entries
for each row execute function public.set_updated_at();

alter table public.leaderboard_entries enable row level security;

drop policy if exists "leaderboard_entries_public_read" on public.leaderboard_entries;
create policy "leaderboard_entries_public_read"
on public.leaderboard_entries for select
using (true);

-- Writes go through security-definer RPC (games stay anon-key safe).
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

-- Realtime for live admin / visitor ranking boards.
do $$
begin
  begin
    alter publication supabase_realtime add table public.leaderboard_entries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
