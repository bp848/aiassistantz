import { useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { ensureTenant } from '../services/ensureTenant';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase Authセッション取得
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          console.error('[AuthCallback] No user found');
          window.location.href = '/#/integration';
          return;
        }

        // ユーザーに紐づくtenantを確保
        await ensureTenant(user.id, user.email!);

        // OAuthコールバック処理（もしcodeがある場合）
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state) {
          // Google Workspace連携の場合
          const response = await fetch('https://frbdpmqxgtgnjeccpbub.supabase.co/functions/v1/google-oauth-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ code, state })
          });

          if (!response.ok) {
            throw new Error('OAuth callback failed');
          }
        }

        window.location.href = '/#/dashboard';
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        window.location.href = '/#/integration';
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
