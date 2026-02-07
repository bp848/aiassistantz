
import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, ArrowRight, Loader2, Link, AlertCircle, HelpCircle } from 'lucide-react';
import { mcp } from '../services/mcpService';

/**
 * 以下の CLIENT_ID を GCP Console で取得した ID に書き換えてください。
 */
const CLIENT_ID = '934575841639-668j6v6v6v6v6v6v6v6v6v6v6v.apps.googleusercontent.com';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
].join(' ');

const IntegrationSetup: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'connecting' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash;
      if (!hash) return;
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('access_token');
      const state = params.get('state');

      if (token && state === 'mcp_auth') {
        setStatus('connecting');
        window.history.replaceState(null, '', window.location.pathname);
        try {
          mcp.setAuth(token);
          await mcp.connect();
          setStatus('completed');
        } catch (e: any) {
          setStatus('error');
          setErrorMsg(e.message);
        }
      }
    };
    handleAuth();
  }, []);

  const startOAuth = () => {
    setStatus('authorizing');
    const redirect = window.location.origin + window.location.pathname;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirect)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&state=mcp_auth&prompt=consent`;
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-cyber-cyan/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyber-cyan/20">
            <Link size={36} className="text-cyber-cyan" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-white mb-2 italic">WORKSPACE SYNC</h2>
          <p className="text-cyber-slate text-sm">Google Workspace 機能を AI 秘書に解放します。</p>
        </div>

        <div className="bg-gray-900/60 p-8 rounded-[2rem] border border-white/5 shadow-2xl">
          {status === 'completed' ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <Check className="text-green-500" size={32} />
              </div>
              <p className="text-green-400 font-bold">実機同期プロトコル 確立完了</p>
              <button onClick={onComplete} className="w-full bg-cyber-cyan text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2">
                開始する <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <button 
                onClick={startOAuth}
                disabled={status !== 'idle'}
                className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-3"
              >
                {status === 'idle' ? "Googleアカウントを連携" : <Loader2 className="animate-spin" />}
              </button>
              {status === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs text-center">
                  {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
