import React, { useState, useEffect } from 'react';
import { Building2, Users, Mail, CreditCard, Settings, Check, Loader2 } from 'lucide-react';
import tenantService, { Tenant, User } from '../services/tenantService';

interface TenantSetupProps {
  onComplete: () => void;
}

const TenantSetup: React.FC<TenantSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'company' | 'plan' | 'users' | 'completed'>('company');
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState<Partial<Tenant>>({
    name: '',
    domain: '',
    plan: 'basic',
    settings: {
      aiModel: 'gemini-2.0-flash',
      maxUsers: 5,
      maxGoogleAccounts: 1,
      features: {
        calendar: true,
        gmail: true,
        documents: false,
        api: false
      },
      branding: {
        primaryColor: '#22d3ee',
        companyName: ''
      }
    }
  });
  const [users, setUsers] = useState<Partial<User>[]>([
    { email: '', role: 'admin' }
  ]);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: '¥5,000/月',
      description: '小規模チーム向け',
      features: [
        'AI秘書基本機能',
        'Google Calendar連携',
        'Gmail連携（1アカウント）',
        '基本データ管理',
        'メールサポート'
      ],
      limits: {
        maxUsers: 5,
        maxGoogleAccounts: 1
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '¥15,000/月',
      description: '中規模チーム向け',
      features: [
        'Basicプラン全機能',
        '複数Googleアカウント連携',
        '高度なAI機能',
        'カスタマイズ可能',
        'チャットサポート'
      ],
      limits: {
        maxUsers: 20,
        maxGoogleAccounts: 5
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '¥50,000/月〜',
      description: '大企業向け',
      features: [
        'Proプラン全機能',
        '無制限ユーザー数',
        '専用サーバー',
        'APIアクセス',
        '優先サポート',
        'カスタム開発'
      ],
      limits: {
        maxUsers: -1,
        maxGoogleAccounts: -1
      }
    }
  ];

  const handleCompanySubmit = () => {
    if (!tenant.name || !tenant.domain) return;
    setStep('plan');
  };

  const handleUserChange = (index: number, field: keyof User, value: string) => {
    const updatedUsers = [...users];
    updatedUsers[index] = {
      ...updatedUsers[index],
      [field]: field === 'role' ? value as 'admin' | 'user' : value
    };
    setUsers(updatedUsers);
  };

  const handlePlanSelect = (planId: 'basic' | 'pro' | 'enterprise') => {
    const selectedPlan = plans.find(p => p.id === planId);
    if (!selectedPlan) return;

    setTenant({
      ...tenant,
      plan: planId,
      settings: {
        ...tenant.settings!,
        maxUsers: selectedPlan.limits.maxUsers,
        maxGoogleAccounts: selectedPlan.limits.maxGoogleAccounts
      }
    });
    setStep('users');
  };

  const handleUserAdd = () => {
    setUsers([...users, { email: '', role: 'user' }]);
  };

  const handleUserRemove = (index: number) => {
    setUsers(users.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // テナントを作成
      const newTenant = await tenantService.createTenant({
        name: tenant.name!,
        domain: tenant.domain!,
        plan: tenant.plan!,
        settings: tenant.settings!
      });

      // 管理者ユーザーを作成
      await tenantService.inviteUser(
        newTenant.id,
        users[0].email!,
        'admin'
      );

      // 他のユーザーを招待
      for (let i = 1; i < users.length; i++) {
        if (users[i].email) {
          await tenantService.inviteUser(
            newTenant.id,
            users[i].email!,
            users[i].role as 'admin' | 'user'
          );
        }
      }

      setStep('completed');
    } catch (error) {
      console.error('テナント作成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] flex items-center justify-center p-6 text-gray-100">
      <div className="max-w-4xl w-full animate-fadeIn">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-blue-500/20 shadow-lg">
            <Building2 size={40} className="text-blue-500" />
          </div>
          <h2 className="text-3xl font-serif font-bold mb-4 tracking-widest">企業セットアップ</h2>
          <p className="text-cyber-slate text-lg leading-relaxed max-w-2xl mx-auto">
            AI秘書SaaSを導入するための企業情報を設定します。
            チーム規模に合わせて最適なプランをお選びください。
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center justify-center mb-8">
          {['company', 'plan', 'users', 'completed'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === s ? 'bg-blue-500' :
                ['company', 'plan', 'users'].includes(step) && index < ['company', 'plan', 'users'].indexOf(step) ? 'bg-green-500' : 'bg-gray-700'
                }`}>
                {step === s ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Check size={20} />
                )}
              </div>
              {index < 3 && <div className="w-16 h-1 bg-gray-700 mx-2" />}
            </div>
          ))}
        </div>

        {/* 企業情報 */}
        {step === 'company' && (
          <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
              <Building2 size={24} />
              企業情報
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">企業名</label>
                <input
                  type="text"
                  value={tenant.name}
                  onChange={(e) => setTenant({ ...tenant, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="例：株式会社〇〇"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">ドメイン</label>
                <input
                  type="text"
                  value={tenant.domain}
                  onChange={(e) => setTenant({ ...tenant, domain: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="example.com"
                />
              </div>
              <button
                onClick={handleCompanySubmit}
                disabled={!tenant.name || !tenant.domain}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          </div>
        )}

        {/* プラン選択 */}
        {step === 'plan' && (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-gray-900/40 backdrop-blur-md border rounded-3xl p-6 cursor-pointer transition-all ${tenant.plan === plan.id ? 'border-blue-500 bg-blue-500/5' : 'border-white/10 hover:border-white/30'
                  }`}
                onClick={() => handlePlanSelect(plan.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-2xl font-bold text-blue-400">{plan.price}</p>
                    <p className="text-cyber-slate mt-2">{plan.description}</p>
                  </div>
                  {tenant.plan === plan.id && <Check size={24} className="text-blue-500" />}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check size={16} className="text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* ユーザー招待 */}
        {step === 'users' && (
          <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6 text-blue-400 flex items-center gap-2">
              <Users size={24} />
              ユーザー招待
            </h3>
            <div className="space-y-4 mb-6">
              {users.map((user, index) => (
                <div key={index} className="flex gap-4">
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => handleUserChange(index, 'email', e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-800 border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="メールアドレス"
                  />
                  <select
                    value={user.role}
                    onChange={(e) => handleUserChange(index, 'role', e.target.value)}
                    className="px-4 py-3 bg-gray-800 border border-white/10 rounded-xl focus:border-blue-500 focus:outline-none"
                  >
                    <option value="admin">管理者</option>
                    <option value="user">一般ユーザー</option>
                  </select>
                  {users.length > 1 && (
                    <button
                      onClick={() => handleUserRemove(index)}
                      className="px-4 py-3 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500/30"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleUserAdd}
                className="flex-1 bg-gray-700 text-white font-bold py-4 rounded-xl hover:bg-gray-600 transition-all"
              >
                ユーザーを追加
              </button>
              <button
                onClick={handleComplete}
                disabled={loading || users.every(u => !u.email)}
                className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'セットアップ完了'}
              </button>
            </div>
          </div>
        )}

        {/* 完了 */}
        {step === 'completed' && (
          <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-lg">
              <Check size={40} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-4">セットアップ完了</h3>
            <p className="text-cyber-slate mb-8">
              企業情報とユーザーの設定が完了しました。<br />
              招待メールを送信しましたので、各ユーザーはメールから本登録をお願いします。
            </p>
            <button
              onClick={onComplete}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all"
            >
              ダッシュボードへ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantSetup;
