import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
}) : null;

// Register onAuthStateChange immediately after createClient to capture provider tokens
// This MUST be done at module load time, not in a React component
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[supabaseClient] Auth state change:', event, 'provider_token:', session?.provider_token ? 'present' : 'missing');
    
    if (session?.provider_token) {
      localStorage.setItem('google_access_token', session.provider_token);
      console.log('[supabaseClient] Saved google_access_token to localStorage');
    }
    if (session?.provider_refresh_token) {
      localStorage.setItem('google_refresh_token', session.provider_refresh_token);
      console.log('[supabaseClient] Saved google_refresh_token to localStorage');
    }
    if (event === 'SIGNED_OUT') {
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_refresh_token');
      console.log('[supabaseClient] Cleared Google tokens from localStorage');
    }
  });
}
