-- Clear placeholder / missing .glb model paths.
-- Only Pylon Monument currently has a real model file.

update public.heritage_sites
set
  model_src = null,
  updated_at = now()
where
  coalesce(model_src, '') <> ''
  and id <> 'pylon';

-- Ensure Pylon keeps the real file path.
update public.heritage_sites
set
  model_src = 'https://cicrbvjykbsyptivlvzi.supabase.co/storage/v1/object/public/heritage-models/pylon/Pylon.glb',
  updated_at = now()
where id = 'pylon';
