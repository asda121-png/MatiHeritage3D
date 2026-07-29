-- Game play counts tracking
-- Tracks total number of times each game has been played

create table if not exists public.game_play_counts (
  game_id text primary key,
  game_name text not null,
  play_count integer not null default 0 check (play_count >= 0),
  updated_at timestamptz not null default now()
);

create index if not exists game_play_counts_game_id_idx on public.game_play_counts (game_id);
create index if not exists game_play_counts_play_count_idx on public.game_play_counts (play_count desc);

drop trigger if exists game_play_counts_set_updated_at on public.game_play_counts;
create trigger game_play_counts_set_updated_at
before update on public.game_play_counts
for each row execute function public.set_updated_at();

alter table public.game_play_counts enable row level security;

-- Public read for play counts
drop policy if exists "game_play_counts_public_read" on public.game_play_counts;
create policy "game_play_counts_public_read"
on public.game_play_counts for select
using (true);

-- Function to increment play count when a game is played
create or replace function public.increment_game_play_count(
  p_game_id text,
  p_game_name text default null
)
returns public.game_play_counts
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.game_play_counts;
  clean_game_name text;
begin
  clean_game_name := coalesce(p_game_name, p_game_id);
  
  insert into public.game_play_counts (game_id, game_name, play_count)
  values (p_game_id, clean_game_name, 1)
  on conflict (game_id) do update
    set
      play_count = public.game_play_counts.play_count + 1,
      game_name = excluded.game_name,
      updated_at = now()
  returning * into row_out;
  
  return row_out;
end;
$$;

revoke all on function public.increment_game_play_count(text, text) from public;
grant execute on function public.increment_game_play_count(text, text) to anon, authenticated;

-- Initialize with default game entries
insert into public.game_play_counts (game_id, game_name, play_count)
values 
  ('trivia', 'Mati Heritage Trivia Challenge', 0),
  ('memory', 'Memory Matching Pairs', 0),
  ('observation', 'Spot the Difference', 0),
  ('puzzle', 'Slide Puzzle', 0),
  ('sprint', 'True or False Sprint', 0)
on conflict (game_id) do nothing;
