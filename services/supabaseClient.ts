
import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise fallback to the provided keys
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://frbdpmqxgtgnjeccpbub.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyYmRwbXF4Z3RnbmplY2NwYnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTU3MTksImV4cCI6MjA4MDI5MTcxOX0.jgNGsuA397o8AGvv-BL3cDXHKsLKCmGO_KrEcrdzv1k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// テナントコンテキスト管理
export const setTenantContext = (tenantDomain: string) => {
    // Supabaseクライアントのヘッダーにテナント情報を設定
    supabase.auth.setSession({
        access_token: '',
        refresh_token: ''
    });
};

// 現在のテナントを取得
export const getCurrentTenant = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('tenant_users')
        .select(`
      tenant_id,
      tenants!inner(domain, name, plan, settings)
    `)
        .eq('email', user.email!)
        .single();

    return data;
};
