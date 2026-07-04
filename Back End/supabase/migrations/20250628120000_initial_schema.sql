-- Mati Heritage 3D — initial Supabase schema
-- Run in Supabase SQL Editor or: cd "Back End" && npm run supabase:push

create extension if not exists "pgcrypto";

-- ── Profiles (linked to Supabase Auth) ─────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  email text not null unique,
  avatar_url text,
  heritage_points integer not null default 0 check (heritage_points >= 0),
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_points_idx on public.profiles (heritage_points desc);

-- ── Heritage sites ─────────────────────────────────────────────────────────
create table if not exists public.heritage_sites (
  id text primary key,
  name text not null,
  category text not null check (category in ('built', 'natural', 'intangible')),
  category_label text,
  heritage_category text,
  ownership text,
  location text,
  description text,
  lat double precision,
  lng double precision,
  cover text,
  model_src text,
  is_base boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists heritage_sites_category_idx on public.heritage_sites (category);
create index if not exists heritage_sites_deleted_idx on public.heritage_sites (is_deleted);

-- ── Heritage media ─────────────────────────────────────────────────────────
create table if not exists public.heritage_media (
  id text primary key,
  site_id text not null references public.heritage_sites (id) on delete cascade,
  type text not null check (type in ('photo', 'video', 'audio', 'link', 'model3d', 'map')),
  title text not null,
  src text not null,
  caption text,
  credit text,
  year text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists heritage_media_site_idx on public.heritage_media (site_id);

-- ── updated_at trigger ─────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists heritage_sites_set_updated_at on public.heritage_sites;
create trigger heritage_sites_set_updated_at
before update on public.heritage_sites
for each row execute function public.set_updated_at();

drop trigger if exists heritage_media_set_updated_at on public.heritage_media;
create trigger heritage_media_set_updated_at
before update on public.heritage_media
for each row execute function public.set_updated_at();

-- ── Auto-create profile on signup ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_username text;
  clean_username text;
begin
  raw_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  clean_username := lower(regexp_replace(raw_username, '[^a-z0-9._-]', '', 'g'));

  if clean_username = '' or length(clean_username) < 3 then
    clean_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  insert into public.profiles (id, username, display_name, email)
  values (
    new.id,
    clean_username,
    coalesce(new.raw_user_meta_data->>'display_name', clean_username),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ── Helpers ────────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.heritage_sites enable row level security;
alter table public.heritage_media enable row level security;

-- Profiles: public read (leaderboard), users update own row
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
on public.profiles for select
using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Sites: public read active, admin write
drop policy if exists "heritage_sites_public_read" on public.heritage_sites;
create policy "heritage_sites_public_read"
on public.heritage_sites for select
using (is_deleted = false);

drop policy if exists "heritage_sites_admin_insert" on public.heritage_sites;
create policy "heritage_sites_admin_insert"
on public.heritage_sites for insert
with check (public.is_admin());

drop policy if exists "heritage_sites_admin_update" on public.heritage_sites;
create policy "heritage_sites_admin_update"
on public.heritage_sites for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "heritage_sites_admin_delete" on public.heritage_sites;
create policy "heritage_sites_admin_delete"
on public.heritage_sites for delete
using (public.is_admin());

-- Media: public read active, admin write
drop policy if exists "heritage_media_public_read" on public.heritage_media;
create policy "heritage_media_public_read"
on public.heritage_media for select
using (is_deleted = false);

drop policy if exists "heritage_media_admin_insert" on public.heritage_media;
create policy "heritage_media_admin_insert"
on public.heritage_media for insert
with check (public.is_admin());

drop policy if exists "heritage_media_admin_update" on public.heritage_media;
create policy "heritage_media_admin_update"
on public.heritage_media for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "heritage_media_admin_delete" on public.heritage_media;
create policy "heritage_media_admin_delete"
on public.heritage_media for delete
using (public.is_admin());

-- ── Storage buckets (run once in dashboard if SQL storage API unavailable) ───
insert into storage.buckets (id, name, public)
values
  ('heritage-photos', 'heritage-photos', true),
  ('heritage-maps', 'heritage-maps', true),
  ('heritage-models', 'heritage-models', true),
  ('heritage-videos', 'heritage-videos', true),
  ('heritage-audio', 'heritage-audio', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "heritage_assets_public_read" on storage.objects;
create policy "heritage_assets_public_read"
on storage.objects for select
using (bucket_id in ('heritage-photos', 'heritage-maps', 'heritage-models', 'heritage-videos', 'heritage-audio', 'avatars'));

drop policy if exists "heritage_assets_admin_write" on storage.objects;
create policy "heritage_assets_admin_write"
on storage.objects for insert
with check (bucket_id in ('heritage-photos', 'heritage-maps', 'heritage-models', 'heritage-videos', 'heritage-audio', 'avatars') and public.is_admin());

drop policy if exists "heritage_assets_admin_update" on storage.objects;
create policy "heritage_assets_admin_update"
on storage.objects for update
using (bucket_id in ('heritage-photos', 'heritage-maps', 'heritage-models', 'heritage-videos', 'heritage-audio', 'avatars') and public.is_admin());

drop policy if exists "heritage_assets_admin_delete" on storage.objects;
create policy "heritage_assets_admin_delete"
on storage.objects for delete
using (bucket_id in ('heritage-photos', 'heritage-maps', 'heritage-models', 'heritage-videos', 'heritage-audio', 'avatars') and public.is_admin());
