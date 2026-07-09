-- Deployment write access for heritage catalog.
-- Public read stays as-is. Writes are allowed while app_settings.allow_heritage_writes = 'true'
-- (capstone admin panel uses the anon key; flip to 'false' later when Supabase Auth admins are ready).

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('allow_heritage_writes', 'true')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_public_read" on public.app_settings;
create policy "app_settings_public_read"
on public.app_settings for select
using (true);

create or replace function public.mati_heritage_write_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.app_settings
      where key = 'allow_heritage_writes'
        and lower(value) in ('true', '1', 'on', 'yes')
    );
$$;

-- Sites
drop policy if exists "heritage_sites_admin_insert" on public.heritage_sites;
create policy "heritage_sites_admin_insert"
on public.heritage_sites for insert
with check (public.mati_heritage_write_allowed());

drop policy if exists "heritage_sites_admin_update" on public.heritage_sites;
create policy "heritage_sites_admin_update"
on public.heritage_sites for update
using (public.mati_heritage_write_allowed())
with check (public.mati_heritage_write_allowed());

drop policy if exists "heritage_sites_admin_delete" on public.heritage_sites;
create policy "heritage_sites_admin_delete"
on public.heritage_sites for delete
using (public.mati_heritage_write_allowed());

-- Media
drop policy if exists "heritage_media_admin_insert" on public.heritage_media;
create policy "heritage_media_admin_insert"
on public.heritage_media for insert
with check (public.mati_heritage_write_allowed());

drop policy if exists "heritage_media_admin_update" on public.heritage_media;
create policy "heritage_media_admin_update"
on public.heritage_media for update
using (public.mati_heritage_write_allowed())
with check (public.mati_heritage_write_allowed());

drop policy if exists "heritage_media_admin_delete" on public.heritage_media;
create policy "heritage_media_admin_delete"
on public.heritage_media for delete
using (public.mati_heritage_write_allowed());

-- Storage
drop policy if exists "heritage_assets_admin_write" on storage.objects;
create policy "heritage_assets_admin_write"
on storage.objects for insert
with check (
  bucket_id in (
    'heritage-photos',
    'heritage-maps',
    'heritage-models',
    'heritage-videos',
    'heritage-audio',
    'avatars'
  )
  and public.mati_heritage_write_allowed()
);

drop policy if exists "heritage_assets_admin_update" on storage.objects;
create policy "heritage_assets_admin_update"
on storage.objects for update
using (
  bucket_id in (
    'heritage-photos',
    'heritage-maps',
    'heritage-models',
    'heritage-videos',
    'heritage-audio',
    'avatars'
  )
  and public.mati_heritage_write_allowed()
);

drop policy if exists "heritage_assets_admin_delete" on storage.objects;
create policy "heritage_assets_admin_delete"
on storage.objects for delete
using (
  bucket_id in (
    'heritage-photos',
    'heritage-maps',
    'heritage-models',
    'heritage-videos',
    'heritage-audio',
    'avatars'
  )
  and public.mati_heritage_write_allowed()
);
