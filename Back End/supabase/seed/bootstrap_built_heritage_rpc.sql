-- One-time bootstrap: creates a seed function the admin panel can call.
-- Run this once in Supabase Dashboard → SQL Editor (after initial_schema.sql).
-- Then use the "Import built heritage" button on the admin dashboard.

create or replace function public.seed_built_heritage_catalog()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.heritage_sites (
    id,
    name,
    category,
    category_label,
    heritage_category,
    ownership,
    location,
    description,
    lat,
    lng,
    cover,
    model_src,
    is_base,
    is_deleted
  )
  values
  (
    'centennial',
    'Centennial Clock and Pathway of Leaders',
    'built',
    'Built Heritage',
    'Sites/Park',
    'Government Property',
    'Barangay Central',
    'The Centennial Park and Pathway of Leaders, located within the City Hall Compound of Mati on Nazareno Street, Barangay Central, is a significant cultural landmark officially recognized under Resolution No. 61, Series of 2019. Conceptualized by the late Mayor Francisco G. Rabat and completed in 2003, the site serves to commemorate the 110th founding anniversary of the City of Mati while honoring the lineage of leadership that has shaped the community. The architectural centerpiece is a 25-foot clock tower featuring an arched entranceway inscribed with the year "1903" and flanked by full-bodied statues of city founders Hon. Juan Nazareno and Hon. Prudencio Garcia. The Pathway of Leaders is a concrete promenade lined with the bust statues of former elected and appointed mayors, integrated into a landscaped environment that also features a monument to the national hero, Jose Rizal. As a public heritage site, it stands as a testament to the city''s historical journey, preserved in excellent condition for the inspiration and education of its citizens.',
    6.9521319,
    126.2167824,
    'data/Built Heritage/Centennial Clock and Pathway of Leaders/Photographs/New/1000067853.jpg',
    'data/Built Heritage/Centennial Clock and Pathway of Leaders/Pylon.glb',
    true,
    false
  ),
  (
    'city-hall',
    'City Hall',
    'built',
    'Built Heritage',
    'Government Structure',
    'Government Property',
    'Barangay Central',
    'The City Hall of Mati is the seat of the City Government of Mati, located along Nazareno Street in Barangay Central, Davao Oriental. As the municipal administrative center, it houses the offices responsible for local governance, public service, and community development.',
    6.9519495,
    126.2162107,
    'data/Built Heritage/City Hall/Photographs/Old/City Hall.jpg',
    'data/Built Heritage/City Hall/Pylon.glb',
    true,
    false
  ),
  (
    'mfgr',
    'MFGR Park and Baywalk',
    'built',
    'Built Heritage',
    'Sites/Park',
    'Government Property',
    'Barangay Central',
    'The Mayor Francisco G. Rabat Park and Baywalk, officially declared as a significant cultural property of the City of Mati under Resolution No. 61, Series of 2019, serves as a premier 3-hectare landmark of historical and socio-economic importance. Situated on a reclaimed area in Barangay Central that once served as the city''s original shoreline, the park was envisioned in 2003 by Mayor Francisco G. Rabat to provide a dedicated venue for public festivities and community engagement. The site features a concrete seawall bench, the iconic "I Love Mati" signage, and an events stage, all set against the aesthetic backdrop of Pujada Bay. As a center for local heritage, the Baywalk continues to function as a vital space for cultural expression, tourism, and economic activity, symbolizing the city''s growth and its deep-rooted connection to the sea.',
    6.949853,
    126.216161,
    'data/Built Heritage/MFGR Park and Baywalk/Map/map_baywalk.jpg',
    'data/Built Heritage/MFGR Park and Baywalk/Pylon.glb',
    true,
    false
  ),
  (
    'gabaldon',
    'Gabaldon Structure of RRMCES-1',
    'built',
    'Built Heritage',
    'Schools and Educational Complexes',
    'Government Property',
    'Barangay Sainz',
    'Established in 1920, the Gabaldon School Building of Rabat-Rocamora Mati Central Elementary School-I stands as a premier architectural landmark in the City of Mati, Davao Oriental. This two-story public structure is a fine example of American-era educational architecture, uniquely blending elements of the traditional bahay kubo with a symmetrical design featuring distinctive arches and a central porch. Constructed from Philippine hardwood with a concrete foundation, the building is designed for optimal natural ventilation and lighting, characterized by high ceilings and large wooden-framed awning windows. The school lot was donated by the heirs of the Sainz, Rocamora, and Rabat families, and in 2006, the institution was renamed to honor the Rabat and Rocamora legacies. Today, this well-maintained heritage site continues its vital role as an active educational facility, preserving more than a century of history while serving the youth of Barangay Sainz.',
    6.955,
    126.219444,
    'data/Built Heritage/Gabaldon Structure of RRMCES-1/Photographs/Old/Central Gabaldon.jpg',
    'data/Built Heritage/Gabaldon Structure of RRMCES-1/Pylon.glb',
    true,
    false
  ),
  (
    'menzi',
    'Menzi Visitors Information Center',
    'built',
    'Built Heritage',
    'Sites/Park',
    'Private Property',
    'Barangay Dahican',
    'The Menzi Visitors Information Center, also known as Menzi Beach, is a 1.5-hectare cultural property situated along the coastal shores of Mayo Bay in Barangay Dahican, City of Mati, Davao Oriental. Formally recognized as a significant cultural property of the City of Mati under Resolution No. 61, Series of 2019, the site serves as a vital landmark for tourism and heritage preservation. The park features a diverse landscape characterized by white sand beaches, crystal blue waters, and indigenous flora such as Narra and coconut trees, complemented by functional structures including an information center, a two-story function hall, and various recreational cottages. Established through a 2011 partnership between the Menzi Trust Fund, Inc. and the City Government of Mati, the center was designed to foster sustainable tourism development while honoring the historical harmony between nature and the area''s early Kalagan and Christian settlers. Today, the site stands as a testament to the city''s commitment to environmental protection and the promotion of its unique natural and cultural endowments.',
    6.927318,
    126.281047,
    'data/Built Heritage/Menzi Visitors Information Center/Photographs/New/J6000x4000-00293.jpg',
    'data/Built Heritage/Menzi Visitors Information Center/Pylon.glb',
    true,
    false
  ),
  (
    'noventa',
    'Noventa Ancestral House',
    'built',
    'Built Heritage',
    'Ancestral House',
    'Private Property',
    'Barangay Bobon',
    'Built between 1943 and 1946, the Noventa Ancestral House is a two-story residential structure in Barangay Bobon, City of Mati, that stands as a well-preserved example of American Colonial-era architecture. Constructed primarily of Philippine hardwood, specifically Molave, the house features a simple rectangular design with a high-ceilinged receiving area, wide windows for natural ventilation, and thick floor planks. While the ground floor traditionally served as a storage area or bodega, the upper floor remains a habitable living space that continues to be lovingly maintained by the heirs of the original owners, Kiakban Magtacpao Noventa and Alberto Noventa. Beyond its physical form, the property holds deep social and aesthetic significance, serving as a living testament to the family''s cultural heritage and a harmonious blend of indigenous and colonial influences within a lush 636-square-meter landscape.',
    6.866667,
    126.325,
    'data/Built Heritage/Noventa Ancestral House/Photographs/2023-09-12 11-22.jpg',
    'data/Built Heritage/Noventa Ancestral House/Pylon.glb',
    true,
    false
  ),
  (
    'ompo',
    'OMPO sa Tampat sa Baguidan',
    'built',
    'Built Heritage',
    'Graveyard',
    'Private Property',
    'Barangay Bobon',
    'Ompo na Tampat sa Bagidan is an ancestral burial site of profound historical and cultural significance, situated in the mountainous part of Baguidan, Barangay Bobon, City of Mati, Davao Oriental. This site serves as the final resting place of an Ompo (Chieftain), a prominent figure in the pre-Hispanic history of Mati and an ancestor of the Kalagan tribe. According to historical records, the Ompo was one of seven siblings of the Kapituanon tribe who originally ruled "Kalagan Island"—present-day Eastern Mindanao—before the arrival of Spanish expeditions. These siblings founded several of the region''s indigenous groups, including the Manobo, Mamanwa, Mansaka, Mandaya, Taga-kaulo, and Mangguangan tribes, with the Ompo''s lineage specifically linked to the Mandagat defenders of the coast. Currently maintained in a fair condition and preserved in its original, unaltered state by the Kalagan people, the site remains a vital link to the region''s pre-colonial heritage. Its paramount importance to local history and identity was formally recognized through Resolution No. 148, Series of 2023, which officially declared Ompo na Tampat sa Bagidan as a Significant Cultural Property of the City of Mati.',
    6.84,
    126.33,
    'data/Built Heritage/OMPO sa Tampat sa Baguidan/Photographs/Old/J2048x1536-00654.jpg',
    'data/Built Heritage/OMPO sa Tampat sa Baguidan/Pylon.glb',
    true,
    false
  ),
  (
    'capitol',
    'Provincial Capitol of Davao Oriental',
    'built',
    'Built Heritage',
    'Government Structure/Capitol Building',
    'Government Property',
    'Barangay Central',
    'The Provincial Capitol of Davao Oriental, popularly known as the "White House," is a majestic three-story edifice that serves as the official seat of the provincial government. Situated atop Capitol Hills, the building holds an imposing presence in the city skyline. Its architectural design draws inspiration from classical Western landmarks, notably patterned after the U.S. White House, while incorporating neoclassical elements reminiscent of St. Peter''s Basilica in Rome. The construction of the New Capitol was a multi-generational project aimed at unifying the politics and people of Davao Oriental. The project commenced during the tenure of former Governor Elena Palma Gil and was brought to completion under the leadership of Governor Corazon N. Malanyaon. Since its grand opening in 2010, the building has transitioned from a purely administrative facility into a primary tourist attraction, symbolizing a new era of public service for the province.',
    6.9483186,
    126.2271687,
    'data/Built Heritage/Provincial Capitol of Davao Oriental/Photographs/Old/Capitol White House.jpg',
    'data/Built Heritage/Provincial Capitol of Davao Oriental/Pylon.glb',
    true,
    false
  ),
  (
    'old-mansion',
    'Provincial Capitol Old Mansion',
    'built',
    'Built Heritage',
    'Government Structure/Capitol Building',
    'Government Property',
    'Barangay Central',
    'The Provincial Capitol Old Mansion is a significant heritage structure situated atop the scenic Capitol Hills in Barangay Central. Historically recognized as the Old Governor''s Mansion, this site served as the primary administrative and residential seat for provincial leadership prior to the modernization of the capitol complex. For decades, it remained the center of political and social life in Davao Oriental, maintaining its prominence until the inauguration of the new Provincial Capitol building in 2010. Currently, the mansion stands as a resilient landmark of the city''s administrative history. Following the relocation of the provincial seat, the building has been successfully repurposed to house the Professional Regulation Commission (PRC) Office for Region 11, demonstrating an effective adaptive reuse of one of the province''s most notable civil structures.',
    6.9472,
    126.2268,
    'data/Built Heritage/Provincial Capitol Old Mansion/Photographs/Old/Capitol Old Mansion.jpg',
    'data/Built Heritage/Provincial Capitol Old Mansion/Pylon.glb',
    true,
    false
  ),
  (
    'pylon',
    'Pylon Monument',
    'built',
    'Built Heritage',
    'Monument',
    'Government Property',
    'Barangay Central',
    'The Pylon Monument, located at JP Rizal Street, Barangay Central, City of Mati, Davao Oriental, stands as a premier cultural landmark and the "Point Zero" geographic reference for the province. Originally commissioned in 1979 during the administration of Governor Francisco G. Rabat, the structure was designed by the first Filipino National Artist for Architecture, Juan F. Nakpil, as a tribute to Mayor Luisito G. Rabat. The monument features a 30-foot reinforced concrete and brick tower distinguished by a central glass sphere—crafted from recycled San Miguel Beer bottles—and a steel halo with a crowning luminaire. In 2019, the site underwent a comprehensive aesthetic renovation designed by Architect Cesar Gamalong, which introduced culturally themed ornamentation, a koi pond, and integrated landscaping with a waterfall feature. Formally recognized under Resolution No. 61, Series of 2019, the Pylon remains a testament to the city''s historical heritage and serves as a vital public space symbolizing the faith and resilience of the people of Mati.',
    6.952258,
    126.216889,
    'data/Built Heritage/Pylon Monument/Photographs/Old/Pylon.jpg',
    'data/Built Heritage/Pylon Monument/Pylon.glb',
    true,
    false
  ),
  (
    'subangan',
    'Subangan Museum',
    'built',
    'Built Heritage',
    'Museum',
    'Government Property',
    'Barangay Central, Capitol Hills',
    'The Subangan Museum was inaugurated on January 8, 2014. As the flagship project of the provincial government, the museum was designed to centralize and preserve the region''s heritage. The concept originated around 2010 after a sperm whale was discovered in the town of Governor Generoso, sparking the initiative to build a permanent home for its remains and other local treasures. Its name is derived from the Cebuano term "Subangon", meaning ''east'' or ''place of the rising sun,'' symbolizing the province''s geographic position and cultural identity.',
    6.94425,
    126.248333,
    'data/Built Heritage/Provincial Capitol of Davao Oriental/Photographs/New/Capitol White House1.jpg',
    'data/Built Heritage/Subangan Museum/Pylon.glb',
    true,
    false
  )
  on conflict (id) do update set
    name = excluded.name,
    category = excluded.category,
    category_label = excluded.category_label,
    heritage_category = excluded.heritage_category,
    ownership = excluded.ownership,
    location = excluded.location,
    description = excluded.description,
    lat = excluded.lat,
    lng = excluded.lng,
    cover = excluded.cover,
    model_src = excluded.model_src,
    is_base = excluded.is_base,
    is_deleted = excluded.is_deleted,
    updated_at = now();

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.seed_built_heritage_catalog() from public;
grant execute on function public.seed_built_heritage_catalog() to anon, authenticated;
