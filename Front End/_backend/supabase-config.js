/**
 * Supabase browser config — paste keys from Dashboard → Project Settings → API
 * The anon key is safe to use in the browser (RLS protects your data).
 */
window.MATI_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://cicrbvjykbsyptivlvzi.supabase.co",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpY3Jidmp5a2JzeXB0aXZsdnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4OTg3NTIsImV4cCI6MjA5ODQ3NDc1Mn0.LGNTVLZjVz3pps7HVEoToAnoCQ3-fF53XGkGN92GWts",
  useSupabaseAuth: true,
  /** Set true after enabling Google provider in Supabase Auth */
  googleSignInEnabled: true,
  /** Public URL after Pylon.glb is in Storage → heritage-models → pylon/Pylon.glb */
  pylonModelUrl:
    "https://cicrbvjykbsyptivlvzi.supabase.co/storage/v1/object/public/heritage-models/pylon/Pylon.glb",
};
