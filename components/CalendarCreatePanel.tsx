import { useState } from 'react';
import mcpApiService from '../services/mcpApiService';
import { logAction } from '../services/auditLog';

export default function CalendarCreatePanel() {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      const result = await mcpApiService.callTool('calendar.createEvent', {
        tenant_id: 'demo-tenant', // TODO: 実際のtenant_idに
        title,
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString()
      });

      await logAction('demo-tenant', 'calendar.create', {
        title,
        start,
        end
      });

      alert('予定を作成しました');
      setTitle('');
      setStart('');
      setEnd('');
    } catch (error) {
      console.error('[Calendar Create] Error:', error);

      if (error.message === 'RECONNECT_REQUIRED') {
        window.location.href = '/integration';
        return;
      }

      alert('予定作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-blue-400">予定作成</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">件名</label>
          <input
            type="text"
            placeholder="件名"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">開始時刻</label>
          <input
            type="datetime-local"
            value={start}
            onChange={e => setStart(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">終了時刻</label>
          <input
            type="datetime-local"
            value={end}
            onChange={e => setEnd(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={create}
          disabled={loading || !title || !start || !end}
          className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? '作成中...' : '作成'}
        </button>
      </div>
    </div>
  );
}
