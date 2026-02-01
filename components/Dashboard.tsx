import { useEffect, useState } from 'react';
import bootstrapService, { BootstrapResult } from '../services/bootstrapService';

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
    <div>
      <h1>{data.executiveName} 社長</h1>
      <p>{data.email}</p>

      <h2>本日の予定</h2>
      <ul>
        {data.todayEvents?.map((e, i) => (
          <li key={i}>
            {e.title}（{e.time}）
          </li>
        ))}
      </ul>
    </div>
  );
}
