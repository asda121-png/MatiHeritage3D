-- Pylon 3D model is hosted in Supabase Storage (heritage-models/pylon/Pylon.glb).
-- Local Front End/data/.../Pylon.glb is not deployed to GitHub (~390 MB).

update public.heritage_sites
set
  model_src = 'https://cicrbvjykbsyptivlvzi.supabase.co/storage/v1/object/public/heritage-models/pylon/Pylon.glb',
  updated_at = now()
where id = 'pylon';
