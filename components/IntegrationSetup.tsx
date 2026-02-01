
import React, { useState } from 'react';
import { Check, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import googleOAuthService from '../services/googleOAuthService';

interface IntegrationSetupProps {
  onComplete: () => void;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onComplete }) => {
  const [connecting, setConnecting] = useState<'none' | 'google' | 'completed'>('none');

  const handleConnectGoogle = async () => {
    setConnecting('google');

    try {
      // 実際のGoogle OAuthフローを開始
      // TODO: tenantIdを実際のテナントIDに置き換える
      const tenantId = 'demo-tenant';
      const authUrl = await googleOAuthService.startOAuth(tenantId);

      // OAuthウィンドウを開く
      const popup = window.open(authUrl, 'google-oauth', 'width=500,height=600');

      // ポップアップが閉じられるまで待機
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setConnecting('completed');
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth開始エラー:', error);
      setConnecting('completed');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100">
      <div className="max-w-2xl w-full animate-fadeIn">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20 shadow-lg">
            <ShieldCheck size={40} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 tracking-widest">システム連携設定</h2>
          <p className="text-cyber-slate text-lg leading-relaxed max-w-2xl mx-auto">
            AI秘書が最高のパフォーマンスを発揮するため、Googleサービスとの連携を設定します。
            セキュリティを重視し、必要な権限のみを取得します。
          </p>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8">
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-6 text-blue-400">連携サービス</h3>

            <div className={`p-6 bg-gray-800/50 border rounded-2xl transition-all duration-500 ${connecting === 'completed' ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-8 h-8">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Google Workspace</h4>
                    <p className="text-sm text-cyber-slate">Calendar • Gmail • Drive</p>
                    <p className="text-xs text-gray-500 mt-1">スケジュール管理、メール処理、文書アクセス</p>
                  </div>
                </div>
                {connecting === 'completed' && <Check className="text-green-500" size={28} />}
              </div>

              {connecting === 'completed' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                  <div className="flex items-center justify-center gap-3 text-yellow-500 font-medium">
                    <ShieldCheck size={20} />
                    <span>連携準備完了（実API接続待ち）</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting === 'google'}
                  className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-[0.98]"
                >
                  {connecting === 'google' ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>接続中...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={20} />
                      <span>Google連携を開始</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 mt-8">
            <div className="bg-gray-500/5 border border-gray-500/20 p-4 rounded-xl mb-6">
              <h4 className="font-bold text-gray-400 mb-2">連携について</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Google Workspaceとの連携を予定</li>
                <li>• 必要な権限のみを取得する予定</li>
                <li>• 通信は暗号化される予定</li>
                <li>• いつでも連携解除可能にする予定</li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="w-full py-4 font-bold text-gray-400 hover:text-white transition-all rounded-xl flex items-center justify-center gap-2 border border-white/10 hover:border-white/30"
            >
              後で設定する
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
