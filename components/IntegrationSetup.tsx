
import React, { useState, useEffect } from 'react';
import { Check, ShieldCheck, ArrowRight, Loader2, Link, AlertCircle, HelpCircle, Info } from 'lucide-react';
import { mcp } from '../services/mcpService';

interface IntegrationSetupProps {
  onComplete: () => void;
}

/**
 * ==========================================================
 * 【バカAIでも間違えないデプロイメント・ガイド】
 * ==========================================================
 * 1. Google Cloud Console (https://console.cloud.google.com/) を開く。
 * 2. プロジェクトを選択（または新規作成）する。
 * 3. 「APIとサービス > ライブラリ」で Gmail API と Google Calendar API を検索し「有効化」する。
 * 4. 「OAuth 同意画面」タブで外部公開し、必要な情報を入力する。
 * 5. 「認証情報」タブで「認証情報を作成 > OAuth クライアント ID」を選択。
 * 6. 種類を「ウェブ アプリケーション」に設定。
 * 7. 「承認済みのリダイレクト URI」に現在のサイトURL（例: http://localhost:3000）を正確に追加する。
 * 8. 取得した 【クライアント ID】 を .env.local の VITE_GOOGLE_CLIENT_ID に設定する。
 */
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

// AI秘書が社長に代わって操作するために必要な権限一覧
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',       // カレンダー読み書き
  'https://www.googleapis.com/auth/gmail.modify',     // メール検索・ドラフト・削除
  'https://www.googleapis.com/auth/userinfo.email',   // メールアドレス確認
  'https://www.googleapis.com/auth/userinfo.profile',  // プロフィール確認
  'openid'
].join(' ');

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onComplete }) => {
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'connecting' | 'completed' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    /**
     * 【認証結果の受け取り】
     * Googleのログイン画面からリダイレクトされて戻ってきた際、
     * URLの末尾（#access_token=...）にトークンが含まれています。これをパースします。
     */
    const handleAuthRedirect = async () => {
      const hash = window.location.hash;
      if (!hash) return;

      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const error = params.get('error');
      const state = params.get('state');

      // Googleからエラーが返された場合
      if (error) {
        setStatus('error');
        setErrorMsg(`Google認証エラー: ${params.get('error_description') || error}`);
        return;
      }

      // トークンが正常に取得できた場合
      if (accessToken && state === 'mcp_auth_v1') {
        setStatus('connecting');
        
        // セキュリティのため、URLハッシュからトークン情報を即座に消去し、履歴をクリーンにします。
        window.history.replaceState(null, '', window.location.pathname);
        
        try {
          
          /**
           * 【連携の核心】取得したトークンを MCP サービスに設定します。
           * これによりすべての実機操作が認証済みとなります。
           */
          mcp.setAuth(accessToken);
          
          // 実際に接続を試行し、MCPプロトコルの初期化を行います。
          const isConnected = await mcp.connect();
          if (isConnected) {
            setStatus('completed');
          } else {
            throw new Error("MCPサーバとの同期プロトコルを確立できませんでした。");
          }
        } catch (err: any) {
          console.error("[AUTH-FLOW] Integration Connection Error:", err);
          setStatus('error');
          setErrorMsg(err.message || "同期サーバへの接続に失敗しました。");
        }
      }
    };

    handleAuthRedirect();
  }, []);

  /**
   * 【認証開始】Google OAuth 2.0 画面へユーザーをリダイレクトさせます。
   */
  const startOAuthFlow = () => {
    if (!CLIENT_ID?.trim()) {
      setStatus('error');
      setErrorMsg('Google OAuth のクライアントIDが設定されていません。.env.local に VITE_GOOGLE_CLIENT_ID を設定してください。');
      return;
    }
    setStatus('authorizing');

    // 現在のサイトURLを戻り先として指定
    const redirectUri = window.location.origin + window.location.pathname;

    /**
     * Google 認証エンドポイントへの遷移
     * stateパラメータでセッション整合性を維持します。
     */
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES)}&include_granted_scopes=true&prompt=consent&state=mcp_auth_v1`;

    console.log("[AUTH-FLOW] Redirecting to Google Login screen...");
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100 font-sans">
      <div className="max-w-md w-full animate-fadeIn">
        
        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-cyber-cyan/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-cyber-cyan/20 shadow-2xl relative overflow-hidden">
            <Link size={36} className="text-cyber-cyan z-10" />
            <div className="absolute inset-0 bg-gradient-to-tr from-cyber-cyan/20 to-transparent animate-pulse"></div>
          </div>
          <h2 className="text-3xl font-serif font-bold mb-3 tracking-[0.1em] text-white uppercase italic">SYSTEM INTEGRATION</h2>
          <p className="text-cyber-slate text-sm leading-relaxed max-w-xs mx-auto">
            Google Workspace（Gmail / Calendar）の全機能を AI秘書に解放するためのセキュアな認証同期を実行します。
          </p>
        </div>

        <div className="space-y-4">
          <div className={`p-8 bg-gray-900/60 backdrop-blur-xl border-2 rounded-[2.5rem] transition-all duration-700 shadow-2xl ${
            status === 'completed' 
              ? 'border-cyber-cyan/40 bg-cyber-cyan/5' 
              : status === 'error' 
                ? 'border-red-500/30 bg-red-500/5' 
                : 'border-white/5'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <svg viewBox="0 0 24 24" className="w-8 h-8">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-100 italic">Google Sync</h3>
                  <p className="text-[10px] text-cyber-slate font-mono uppercase tracking-widest">Implicit Flow v2.0</p>
                </div>
              </div>
              {status === 'completed' ? (
                <div className="w-10 h-10 bg-cyber-cyan rounded-full flex items-center justify-center animate-fadeIn shadow-[0_0_20px_rgba(34,211,238,0.5)]">
                  <Check className="text-black" size={24} />
                </div>
              ) : status === 'error' ? (
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center animate-fadeIn">
                  <AlertCircle className="text-white" size={24} />
                </div>
              ) : null}
            </div>

            {status === 'completed' ? (
              <div className="bg-cyber-cyan/10 border border-cyber-cyan/20 p-5 rounded-2xl flex items-center justify-center gap-3 text-cyber-cyan text-[11px] font-bold uppercase tracking-[0.15em] animate-fadeIn">
                <ShieldCheck size={18} /> システム同期 完了
              </div>
            ) : status === 'error' ? (
              <div className="space-y-5">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] text-center leading-relaxed font-mono">
                  {errorMsg}
                </div>
                <button 
                  onClick={startOAuthFlow}
                  className="w-full bg-white text-black font-bold py-5 rounded-[1.5rem] hover:bg-red-500 hover:text-white transition-all shadow-xl active:scale-[0.98] text-sm uppercase tracking-widest"
                >
                  再認証プロトコルを実行
                </button>
              </div>
            ) : (
              <button 
                onClick={startOAuthFlow}
                disabled={status !== 'idle'}
                className="w-full bg-white text-black font-bold py-5 rounded-[1.5rem] hover:bg-cyber-cyan hover:text-white transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] disabled:opacity-50 text-sm uppercase tracking-widest"
              >
                {status === 'authorizing' || status === 'connecting' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {status === 'authorizing' ? 'AUTHENTICATING...' : 'ESTABLISHING SYNC...'}
                  </>
                ) : (
                  <>Workspace 連携を開始</>
                )}
              </button>
            )}
          </div>

          <div className="pt-6 space-y-4">
             <button 
               onClick={onComplete}
               disabled={status !== 'completed'}
               className={`w-full py-5 font-bold text-[11px] flex items-center justify-center gap-3 uppercase tracking-[0.25em] transition-all rounded-[1.5rem] ${
                 status === 'completed' 
                   ? 'text-cyber-cyan bg-cyber-cyan/10 hover:bg-cyber-cyan/20 shadow-lg' 
                   : 'text-gray-700 bg-gray-900/40 cursor-not-allowed border border-white/5'
               }`}
             >
               ダッシュボードへ進む
               <ArrowRight size={16} />
             </button>

             <button 
               onClick={() => setShowGuide(!showGuide)}
               className="w-full py-3 flex items-center justify-center gap-2 text-[10px] text-gray-500 hover:text-gray-300 uppercase tracking-widest transition-colors"
             >
               <HelpCircle size={14} /> 連携の仕組みとデプロイガイド
             </button>

             {showGuide && (
               <div className="p-6 bg-gray-900/50 border border-white/5 rounded-3xl text-[10px] text-gray-400 leading-relaxed space-y-4 animate-fadeIn border-l-4 border-l-cyber-cyan">
                 <div className="flex items-center gap-2 text-cyber-cyan mb-2">
                   <Info size={14} />
                   <span className="font-bold uppercase tracking-wider">管理者向け設定手順</span>
                 </div>
                 <ol className="list-decimal pl-4 space-y-3 font-sans">
                   <li><a href="https://console.cloud.google.com/" target="_blank" className="text-cyber-cyan underline font-bold">Cloud Console</a> で「ウェブ アプリ」の OAuth ID を作成。</li>
                   <li>「承認済みのリダイレクト URI」に <code>{window.location.origin}</code> を正確に追加。</li>
                   <li>Gmail API と Calendar API を「ライブラリ」から有効化。</li>
                   <li><code>.env.local</code> に <code>VITE_GOOGLE_CLIENT_ID</code> を発行されたクライアントIDで設定する。</li>
                   <li>外部MCPサーバーが動作し、アクセストークンを受け入れ可能であることを確認。</li>
                 </ol>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
