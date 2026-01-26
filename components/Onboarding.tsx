import React, { useState } from 'react';
import { UserProfile, SecretaryProfile } from '../types';
import { generateSecretaryImage } from '../services/geminiService';
import { User, Sparkles, ChevronRight, Check, Loader2 } from 'lucide-react';

interface OnboardingProps {
  onComplete: (user: UserProfile, secretary: SecretaryProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [userName, setUserName] = useState('');
  
  const [secType, setSecType] = useState('20代 清楚で知的');
  const [secStyle, setSecStyle] = useState('ダークネイビーのスーツ');
  const [secHair, setSecHair] = useState('黒髪のロングヘア');
  const [secImage, setSecImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    const prompt = `${secType}, ${secStyle}, ${secHair}`;
    const imageUrl = await generateSecretaryImage(prompt);
    setSecImage(imageUrl);
    setLoading(false);
  };

  const handleFinish = () => {
    onComplete(
      { name: userName || '社長' },
      { name: '秘書', tone: '丁寧' }
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-6 text-gray-100 font-sans">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 relative overflow-hidden">
        
        {/* Progress */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
          <div className="h-full bg-presidential-gold transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-serif text-presidential-gold tracking-widest mb-2">初期設定</h1>
          <p className="text-xs text-gray-500">あなただけの専属秘書を用意します</p>
        </div>

        {step === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-medium mb-6 text-center">社長、お名前を教えてください</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">お名前</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-500" size={18} />
                  <input 
                    type="text" 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="例: 田中 太郎"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 focus:border-presidential-gold focus:outline-none text-white placeholder-gray-600"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={() => setStep(2)}
              disabled={!userName}
              className="mt-8 w-full bg-presidential-gold text-black font-bold py-3 rounded-lg hover:bg-presidential-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              次へ <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="text-lg font-medium mb-6 text-center">どんな秘書がお好みですか？</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">年齢・雰囲気</label>
                <select 
                  value={secType} 
                  onChange={(e) => setSecType(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-presidential-gold outline-none"
                >
                  <option value="20代 清楚で知的">20代 清楚で知的</option>
                  <option value="30代 敏腕でクール">30代 敏腕でクール</option>
                  <option value="50代 ベテランの安心感">50代 ベテランの安心感</option>
                  <option value="70代 大御所・執事風">70代 大御所・執事風</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">服装</label>
                <select 
                  value={secStyle} 
                  onChange={(e) => setSecStyle(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-presidential-gold outline-none"
                >
                  <option value="ダークネイビーのスーツ">ダークネイビーのスーツ</option>
                  <option value="エレガントなオフィスカジュアル">オフィスカジュアル</option>
                  <option value="和服（着物）">和服（着物）</option>
                  <option value="燕尾服">燕尾服</option>
                </select>
              </div>

               <div>
                <label className="block text-xs text-gray-500 mb-1">髪型</label>
                <select 
                  value={secHair} 
                  onChange={(e) => setSecHair(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-presidential-gold outline-none"
                >
                  <option value="黒髪のロングヘア">黒髪のロングヘア</option>
                  <option value="茶髪のショートボブ">茶髪のショートボブ</option>
                  <option value="シルバーヘアのオールバック">白髪のオールバック</option>
                </select>
              </div>
            </div>

            <button 
              onClick={() => { handleGenerate(); setStep(3); }}
              className="mt-8 w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles size={16} /> この設定で面接する（生成）
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn text-center">
            <h2 className="text-lg font-medium mb-6">秘書が到着しました</h2>
            
            <div className="flex justify-center mb-6">
              {loading ? (
                <div className="w-48 h-48 bg-gray-800 rounded-full flex flex-col items-center justify-center animate-pulse border-2 border-presidential-gold/30">
                  <Loader2 size={32} className="text-presidential-gold animate-spin mb-2" />
                  <span className="text-xs text-gray-400">社員証を作成中...</span>
                </div>
              ) : (
                <div className="relative">
                   <img 
                     src={secImage || ''} 
                     alt="Secretary" 
                     className="w-48 h-48 object-cover rounded-full border-4 border-presidential-gold shadow-[0_0_20px_rgba(197,160,89,0.4)]" 
                   />
                   <div className="absolute bottom-2 right-2 bg-presidential-navy border border-presidential-gold rounded-full p-2">
                     <Check size={16} className="text-presidential-gold" />
                   </div>
                </div>
              )}
            </div>

            <p className="text-sm text-gray-400 mb-8">
              {loading ? "準備をしています..." : `${userName}社長、本日より担当いたします。`}
            </p>

            <button 
              onClick={handleFinish}
              disabled={loading}
              className="w-full bg-presidential-gold text-black font-bold py-3 rounded-lg hover:bg-presidential-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              業務を開始する
            </button>
            
            {!loading && (
              <button onClick={() => setStep(2)} className="mt-4 text-xs text-gray-500 hover:text-white underline">
                写真を作り直す
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default Onboarding;