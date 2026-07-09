/**
 * Copy this file to `supabase-config.js` and paste your project keys.
 * Dashboard: https://supabase.com/dashboard → Project Settings → API
 */
window.MATI_SUPABASE_CONFIG = {
  enabled: true,
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_ANON_KEY",
  /** Set true after migrating player login from localStorage to Supabase Auth */
  useSupabaseAuth: false,
  /** Set true after enabling Google provider in Supabase Auth */
  googleSignInEnabled: false,
  /**
   * Optional full URL for password-reset emails.
   * If omitted, Supabase uses the current site + reset-password.html
   */
  passwordResetRedirect: null,
};
