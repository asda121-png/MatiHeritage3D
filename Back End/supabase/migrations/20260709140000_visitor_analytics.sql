-- Visitor analytics: cookie/session tracking with live admin dashboard counts.

create table if not exists public.site_analytics (
  id smallint primary key default 1 check (id = 1),
  total_page_views bigint not null default 0,
  unique_sessions bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_analytics (id) values (1) on conflict (id) do nothing;

create table if not exists public.visitor_sessions (
  session_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  page_views integer not null default 0 check (page_views >= 0),
  last_path text,
  user_agent text
);

create index if not exists visitor_sessions_last_seen_idx
  on public.visitor_sessions (last_seen desc);

drop trigger if exists site_analytics_set_updated_at on public.site_analytics;
create trigger site_analytics_set_updated_at
before update on public.site_analytics
for each row execute function public.set_updated_at();

alter table public.site_analytics enable row level security;
alter table public.visitor_sessions enable row level security;

drop policy if exists "site_analytics_public_read" on public.site_analytics;
create policy "site_analytics_public_read"
on public.site_analytics for select
using (true);

create or replace function public.record_page_visit(
  p_session_id uuid,
  p_page_path text default '/'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existed boolean;
begin
  if p_session_id is null then
    raise exception 'session_id required';
  end if;

  select exists(
    select 1 from public.visitor_sessions where session_id = p_session_id
  ) into existed;

  insert into public.visitor_sessions (session_id, last_path, page_views)
  values (
    p_session_id,
    left(coalesce(nullif(trim(p_page_path), ''), '/'), 500),
    1
  )
  on conflict (session_id) do update set
    last_seen = now(),
    last_path = excluded.last_path,
    page_views = public.visitor_sessions.page_views + 1;

  update public.site_analytics
  set
    total_page_views = total_page_views + 1,
    unique_sessions = unique_sessions + case when existed then 0 else 1 end,
    updated_at = now()
  where id = 1;

  return public.get_visitor_analytics();
end;
$$;

create or replace function public.get_visitor_analytics()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'totalPageViews', coalesce(sa.total_page_views, 0),
    'uniqueSessions', coalesce(sa.unique_sessions, 0),
    'activeSessions', (
      select count(*)::integer
      from public.visitor_sessions
      where last_seen > now() - interval '5 minutes'
    ),
    'pageVisits', coalesce(sa.total_page_views, 0)
  )
  from public.site_analytics sa
  where sa.id = 1;
$$;

revoke all on function public.record_page_visit(uuid, text) from public;
grant execute on function public.record_page_visit(uuid, text) to anon, authenticated;

revoke all on function public.get_visitor_analytics() from public;
grant execute on function public.get_visitor_analytics() to anon, authenticated;

do $$
begin
  begin
    alter publication supabase_realtime add table public.site_analytics;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
