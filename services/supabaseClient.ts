
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 環境変数のみ使用（キー・シークレットはリポジトリに含めない）
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient | null = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
