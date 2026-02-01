import { useEffect, useState } from 'react';
import bootstrapService, { BootstrapResult } from '../services/bootstrapService';
import GmailDraftPanel from './GmailDraftPanel';
import CalendarCreatePanel from './CalendarCreatePanel';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapResult | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const result = await bootstrapService.bootstrap();

        if (result.status !== 'connected') {
          // 再連携が必要
          window.location.href = '/integration';
          return;
        }

        setData(result);
      } catch (e: any) {
        console.error(e);
        setError('初期データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  if (loading) {
    return <div>読み込み中…</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b1120] p-6 text-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{data.executiveName} 社長</h1>
          <p className="text-gray-400">{data.email}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-blue-400">本日の予定</h2>
          <ul className="space-y-2">
            {data.todayEvents?.map((e, i) => (
              <li key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                <div className="font-medium">{e.title}</div>
                <div className="text-sm text-gray-400">{e.time}</div>
              </li>
            ))}
          </ul>
        </div>

        <GmailDraftPanel />
        <CalendarCreatePanel />
      </div>
    </div>
  );
}
