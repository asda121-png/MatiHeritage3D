update public.heritage_sites
set lat = 6.9500,
    lng = 126.2170,
    updated_at = now()
where id = 'mfgr'
  and category = 'built';