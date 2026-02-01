import { useEffect } from 'react';

export default function Integration() {
  useEffect(() => {
    const check = async () => {
      try {
        const result = await fetch('/api/bootstrap', {
          credentials: 'include',
        });

        if (!result.ok) return;

        const json = await result.json();

        if (json.status === 'connected') {
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('[Integration] Check error:', error);
      }
    };

    check();
  }, []);

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

          <a
            href="/api/google/oauth/start"
            className="block w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all text-center shadow-lg active:scale-[0.98]"
          >
            Google連携を再開する
          </a>
        </div>
      </div>
    </div>
  );
}
