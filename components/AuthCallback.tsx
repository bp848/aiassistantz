import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ensureTenant } from '../services/ensureTenant';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });

        if (error) {
          throw error;
        }

        const session = data?.session;

        if (!session?.user) {
          console.error('[AuthCallback] No session user returned');
          navigate('/integration', { replace: true });
          return;
        }

        await ensureTenant(session.user.id, session.user.email!);

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (code && state) {
          const response = await fetch('https://frbdpmqxgtgnjeccpbub.supabase.co/functions/v1/google-oauth-callback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ code, state })
          });

          if (!response.ok) {
            throw new Error('OAuth callback failed');
          }
        }

        navigate('/dashboard', { replace: true });
      } catch (error) {
        console.error('[AuthCallback] Error:', error);
        navigate('/integration', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center">
      <div className="text-white">隱崎ｨｼ蜃ｦ逅・ｸｭ...</div>
    </div>
  );
}
