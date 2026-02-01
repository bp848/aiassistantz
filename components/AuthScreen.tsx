
import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { AuthProvider } from '../types';
import { supabase } from '../services/supabaseClient';

interface AuthScreenProps {
  onAuthComplete: (name: string, email: string, provider: AuthProvider, avatar?: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState<AuthProvider | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSocialLogin = async (provider: AuthProvider) => {
    setLoading(provider);

    try {
      if (provider === 'google') {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://assistant.b-p.co.jp/auth/callback'
          }
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('[AuthScreen] Social login error:', error);
      setLoading(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.user) {
          onAuthComplete(data.user.user_metadata?.name || email.split('@')[0], email, 'email');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name
            }
          }
        });

        if (error) throw error;

        if (data.user) {
          onAuthComplete(name, email, 'email');
        }
      }
    } catch (error) {
      console.error('[AuthScreen] Email auth error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyber-cyan/10 blur-[120px] rounded-full animate-pulse-fast"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-900/20 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10 animate-fadeIn">
          <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative">
            <ShieldCheck size={40} className="text-cyber-cyan" />
            <div className="absolute -inset-1 bg-cyber-cyan/20 blur-lg rounded-3xl -z-10 animate-pulse"></div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-white tracking-[0.2em] mb-2 uppercase">クラウド社長室Z</h1>
          <p className="text-cyber-slate text-[10px] tracking-[0.3em] uppercase">AI秘書エージェント・プロトコル</p>
        </div>

        <div className="bg-gray-900/40 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-2xl animate-fadeIn" style={{ animationDelay: '0.1s' }}>

          <div className="flex mb-8 bg-black/40 p-1 rounded-2xl border border-white/5">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${isLogin ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              ログイン
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${!isLogin ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              新規登録
            </button>
          </div>

          {/* Social Logins */}
          <div className="space-y-3 mb-8">
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={!!loading}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
            >
              {loading === 'google' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Googleで{isLogin ? 'ログイン' : '新規登録'}
            </button>

            <button
              onClick={() => handleSocialLogin('line')}
              disabled={!!loading}
              className="w-full bg-[#06C755] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50"
            >
              {loading === 'line' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M24 10.3c0-4.6-4.7-8.3-10.5-8.3S3 5.7 3 10.3c0 4.1 3.7 7.5 8.7 8.2l-1.3 4.2c-.1.2.1.4.3.3l4.9-3.3c.3.1.5.1.8.1 5.8.1 10.6-3.6 10.6-8.2z" />
                </svg>
              )}
              LINEで{isLogin ? 'ログイン' : '新規登録'}
            </button>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[10px] text-gray-600 uppercase font-bold tracking-widest">またはメールアドレスで</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-cyber-slate font-bold uppercase tracking-wider ml-1">お名前</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyber-cyan transition-colors" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 橋本 唱市"
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyber-cyan/50 focus:bg-black/60 transition-all placeholder:text-gray-700"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-cyber-slate font-bold uppercase tracking-wider ml-1">メールアドレス</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyber-cyan transition-colors" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyber-cyan/50 focus:bg-black/60 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-cyber-slate font-bold uppercase tracking-wider ml-1">パスワード</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyber-cyan transition-colors" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-cyber-cyan/50 focus:bg-black/60 transition-all placeholder:text-gray-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!!loading}
              className="w-full bg-gradient-to-r from-cyber-cyan to-blue-600 text-white font-bold py-5 rounded-2xl hover:opacity-90 transition-all active:scale-[0.98] shadow-xl shadow-cyber-cyan/10 flex items-center justify-center gap-2 mt-4"
            >
              {loading === 'email' ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'セッションを開始' : 'アカウントを作成'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {isLogin && (
            <div className="mt-6 text-center">
              <button className="text-[10px] text-cyber-slate hover:text-cyber-cyan transition-colors font-bold uppercase tracking-widest">
                パスワードをお忘れですか？
              </button>
            </div>
          )}
        </div>

        <p className="text-center mt-10 text-[10px] text-gray-600 tracking-widest font-sans uppercase">
          エンタープライズグレード・セキュリティ L5で保護されています
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
