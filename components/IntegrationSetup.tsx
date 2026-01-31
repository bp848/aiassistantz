
import React, { useState } from 'react';
import { Check, ShieldCheck, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

interface IntegrationSetupProps {
  onComplete: () => void;
}

const IntegrationSetup: React.FC<IntegrationSetupProps> = ({ onComplete }) => {
  const [connecting, setConnecting] = useState<'none' | 'google' | 'completed'>('none');

  const handleConnectGoogle = () => {
    setConnecting('google');
    // 【失態】単なる擬似タイマーです
    setTimeout(() => {
      setConnecting('completed');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-yellow-500/20 shadow-lg">
            <AlertTriangle size={32} className="text-yellow-500" />
          </div>
          <h2 className="text-2xl font-serif font-bold mb-3 tracking-widest">初期設定：擬似連携</h2>
          <p className="text-cyber-slate text-sm leading-relaxed">
            ※注意：このステップはデモ用です。実際のGoogleアカウントとの通信や権限取得は行われません。連携した「フリ」をして業務を開始します。
          </p>
        </div>

        <div className="space-y-4">
          <div className={`p-6 bg-gray-900/40 backdrop-blur-md border rounded-3xl transition-all duration-500 ${connecting === 'completed' ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-white/5'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center grayscale">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 opacity-50">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Google (擬似)</h3>
                  <p className="text-xs text-cyber-slate">シミュレーション連携</p>
                </div>
              </div>
              {connecting === 'completed' && <Check className="text-yellow-500" size={24} />}
            </div>

            {connecting === 'completed' ? (
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-2xl flex items-center justify-center gap-2 text-yellow-500 text-xs font-bold">
                連携完了（シミュレーション中）
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
                    シミュレーション中...
                  </>
                ) : (
                  <>Google(擬似)で連携</>
                )}
              </button>
            )}
          </div>

          <div className="p-4 bg-gray-900/20 border border-white/5 rounded-2xl text-center">
             <button 
               onClick={onComplete}
               className="w-full py-4 font-bold text-sm text-gray-500 hover:text-white transition-all rounded-2xl flex items-center justify-center gap-2"
             >
               実連携なしで次へ進む
               <ArrowRight size={16} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSetup;
