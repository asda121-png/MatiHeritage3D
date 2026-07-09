-- Enable Realtime for heritage catalog so admin, visitors, and players stay in sync.

do $$
begin
  begin
    alter publication supabase_realtime add table public.heritage_sites;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.heritage_media;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.leaderboard_entries;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
