// Bootstrapサービス - Supabase + MCP連携
import { supabase } from './supabaseClient';
import mcpService from './mcpService';

export interface BootstrapResult {
  status: 'connected' | 'reconnect_required';
  executiveName?: string;
  email?: string;
  todayEvents?: any[];
}

class BootstrapService {
  private static instance: BootstrapService;

  static getInstance(): BootstrapService {
    if (!BootstrapService.instance) {
      BootstrapService.instance = new BootstrapService();
    }
    return BootstrapService.instance;
  }

  async bootstrap(): Promise<BootstrapResult> {
    try {
      // 1. 認証チェック
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { status: 'reconnect_required' };
      }

      // 2. テナント取得
      const { data: tenantUser, error: tenantError } = await supabase
        .from('tenant_users')
        .select('tenant_id, tenants!inner(domain, plan, settings)')
        .eq('email', user.email!)
        .single();

      if (tenantError || !tenantUser) {
        return { status: 'reconnect_required' };
      }

      const tenantId = tenantUser.tenant_id;

      // 3. Google認証チェック
      const { data: authData, error: googleError } = await supabase
        .from('google_auth')
        .select('access_token, token_expires_at')
        .eq('tenant_id', tenantId)
        .single();

      if (googleError || !authData) {
        return { status: 'reconnect_required' };
      }

      // 4. MCP経由でデータ取得
      const [profileResult, eventsResult] = await Promise.all([
        mcpService.callTool('get_user_profile', { tenant_id: tenantId }),
        mcpService.callTool('list_events', { 
          tenant_id: tenantId, 
          date: new Date().toISOString().split('T')[0] 
        })
      ]);

      if (!profileResult?.result || !eventsResult?.result) {
        return { status: 'reconnect_required' };
      }

      // 5. 成功レスポンス
      return {
        status: 'connected',
        executiveName: profileResult.result.name || '社長',
        email: profileResult.result.email,
        todayEvents: eventsResult.result.events || []
      };

    } catch (error) {
      console.error('[bootstrap] Error:', error);
      return { status: 'reconnect_required' };
    }
  }
}

export default BootstrapService.getInstance();
