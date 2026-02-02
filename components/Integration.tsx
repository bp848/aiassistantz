import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Integration() {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = '/#/';
          return;
        }

        // tenantを取得
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('*')
          .eq('owner_user_id', user.id)
          .single();

        if (tenantData) {
          // Google連携チェック
          const { data: authData } = await supabase
            .from('google_auth')
            .select('id')
            .eq('tenant_id', tenantData.id)
            .single();

          if (authData) {
            window.location.href = '/dashboard';
            return;
          }
          setTenant(tenantData);
        }
      } catch (error) {
        console.error('[Integration] Check error:', error);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  const handleReconnect = async () => {
    if (!tenant) return;

    try {
      const response = await fetch('https://frbdpmqxgtgnjeccpbub.supabase.co/functions/v1/google-oauth-start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ tenantId: tenant.id })
      });

      if (!response.ok) {
        throw new Error('OAuth start failed');
      }

      const { authUrl } = await response.json();
      window.open(authUrl, 'google-oauth', 'width=500,height=600');
    } catch (error) {
      console.error('[Integration] Reconnect error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
        <div className="text-white">確認中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100">
      <div className="max-w-md w-full">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-serif font-bold mb-4 tracking-widest text-red-400">
            Google連携が切れています
          </h1>
          <p className="text-cyber-slate text-lg leading-relaxed">
            サービスを利用するために、再度Google連携を行ってください。
          </p>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8">
          <div className="mb-6">
            <h3 className="text-xl font-bold mb-4 text-red-400">再連携が必要です</h3>
            <p className="text-sm text-gray-300 mb-6">
              数分で完了します。連携後は自動的にダッシュボードに戻ります。
            </p>
          </div>

          <button
            onClick={handleReconnect}
            className="block w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all text-center shadow-lg active:scale-[0.98]"
          >
            Google連携を再開する
          </button>
        </div>
      </div>
    </div>
  );
}
