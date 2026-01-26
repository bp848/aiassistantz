
import React, { useState } from 'react';
import { Calendar, Mail, Check, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

interface IntegrationSetupProps {
  onComplete: () => void;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onComplete }) => {
  const [connecting, setConnecting] = useState<'none' | 'google' | 'completed'>('none');

  const handleConnectGoogle = () => {
    setConnecting('google');
    setTimeout(() => {
      setConnecting('completed');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-cyber-cyan/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-cyber-cyan/20 shadow-lg shadow-cyber-cyan/5">
            <ShieldCheck size={32} className="text-cyber-cyan" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-3 tracking-widest">初期設定：データ連携</h2>
          <p className="text-cyber-slate text-sm leading-relaxed">
            AI秘書が社長の業務を代行するため、Google Workspaceとの連携を推奨します。カレンダーの調整やメールの作成が可能になります。
          </p>
        </div>

        <div className="space-y-4">
          <div className={`p-6 bg-gray-900/40 backdrop-blur-md border rounded-3xl transition-all duration-500 ${connecting === 'completed' ? 'border-green-500/50 bg-green-500/5' : 'border-white/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" className="w-7 h-7">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Google Workspace</h3>
                  <p className="text-xs text-cyber-slate">Gmail & カレンダー連携</p>
                </div>
              </div>
              {connecting === 'completed' && <Check className="text-green-500" size={24} />}
            </div>

            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              メールの検索・要約・下書き、およびカレンダーの予定取得・登録の権限をAI秘書に付与します。
            </p>

            {connecting === 'completed' ? (
              <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-2xl flex items-center justify-center gap-2 text-green-500 text-xs font-bold">
                <Check size={14} /> 連携済み：hashimoto@b-p.co.jp
              </div>
            ) : (
              <button 
                onClick={handleConnectGoogle}
                disabled={connecting === 'google'}
                className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
              >
                {connecting === 'google' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    認証中...
                  </>
                ) : (
                  <>Googleで連携する</>
                )}
              </button>
            )}
          </div>

          <div className="p-4 bg-gray-900/20 border border-white/5 rounded-2xl text-center">
             <button 
               onClick={onComplete}
               disabled={connecting === 'google'}
               className={`w-full py-4 font-bold text-sm transition-all rounded-2xl flex items-center justify-center gap-2 ${connecting === 'completed' ? 'bg-cyber-cyan text-white shadow-cyber-cyan/20 shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}
             >
               {connecting === 'completed' ? '次へ進む' : '後で設定する'}
               <ArrowRight size={16} />
             </button>
          </div>
        </div>

        <div className="mt-12 text-center opacity-40">
           <p className="text-[10px] uppercase tracking-[0.3em]">プライバシー＆暗号化プロトコル 実行中</p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
