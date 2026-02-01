import { useEffect, useState } from 'react';

type BootstrapResult = {
  status: 'connected' | 'reconnect_required';
  executiveName?: string;
  email?: string;
  todayEvents?: any[];
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapResult | null>(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch('/api/bootstrap', {
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error(`bootstrap failed: ${res.status}`);
        }

        const json: BootstrapResult = await res.json();

        if (json.status !== 'connected') {
          // 再連携が必要
          window.location.href = '/integration';
          return;
        }

        setData(json);
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
