-- Remove all dahican shoreline media entries since no photographs exist
-- Run in Supabase Dashboard → SQL Editor

-- First, check current media entries for dahican shoreline
select * from public.heritage_media where site_id = 'dahican-shoreline';

-- Delete all media entries for dahican shoreline
delete from public.heritage_media
where site_id = 'dahican-shoreline';

-- Verify deletion
select * from public.heritage_media where site_id = 'dahican-shoreline';

-- Verify dahican shoreline site still exists
select * from public.heritage_sites where id = 'dahican-shoreline';
