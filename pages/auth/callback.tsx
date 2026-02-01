// OAuth callback - 保存してdashboardに飛ばすだけ
import { useEffect } from 'react';
import googleOAuthService from '../../services/googleOAuthService';

export default function OAuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');

      if (!code || !state) {
        window.location.href = '/integration';
        return;
      }

      try {
        // state = tenant_id 前提
        const tenantId = state;

        // token交換と保存
        await googleOAuthService.handleCallback(code, state);

        // 何も考えずdashboardへ
        window.location.href = '/dashboard';

      } catch (error) {
        console.error('[OAuth Callback] Error:', error);
        window.location.href = '/integration';
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
      <div className="text-white">認証処理中...</div>
    </div>
  );
}
