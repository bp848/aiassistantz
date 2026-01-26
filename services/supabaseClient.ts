
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the provided keys
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://frbdpmqxgtgnjeccpbub.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYmRwbXF4Z3RnbmplY2NwYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTU3MTksImV4cCI6MjA4MDI5MTcxOX0.jgNGsuA397o8AGvv-BL3cDXHKsLKCmGO_KrEcrdzv1k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
