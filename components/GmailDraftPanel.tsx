import { useState } from 'react';
import mcpApiService from '../services/mcpApiService';
import { logAction } from '../services/auditLog';

export default function GmailDraftPanel() {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createDraft = async () => {
    setLoading(true);
    try {
      const result = await mcpApiService.callTool('gmail.createDraft', {
        tenant_id: 'demo-tenant', // TODO: 実際のtenant_idに
        to,
        subject,
        body
      });

      setDraftId(result.draftId);
      setLoading(false);

      await logAction('demo-tenant', 'gmail.create', {
        to, subject, body
      });
    } catch (error) {
      console.error('[createDraft] Error:', error);

      if (error.message === 'RECONNECT_REQUIRED') {
        window.location.href = '/integration';
        return;
      }

      alert('下書き作成に失敗しました');
      setLoading(false);
    }
  };

  const sendDraft = async () => {
    if (!draftId) return;

    try {
      const result = await mcpApiService.callTool('gmail.sendDraft', {
        tenant_id: 'demo-tenant', // TODO: 実際のtenant_idに
        draftId
      });

      alert('送信しました');
      setDraftId(null);
      setTo('');
      setSubject('');
      setBody('');

      await logAction('demo-tenant', 'gmail.send', {
        draftId, to, subject
      });
    } catch (error) {
      console.error('[sendDraft] Error:', error);

      if (error.message === 'RECONNECT_REQUIRED') {
        window.location.href = '/integration';
        return;
      }

      alert('送信に失敗しました');
    }
  };

  return (
    <div className="bg-gray-900/40 backdrop-blur-md border border-white/10 rounded-3xl p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-blue-400">メール下書き</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">宛先</label>
          <input
            type="email"
            placeholder="example@company.com"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">件名</label>
          <input
            type="text"
            placeholder="件名"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">本文</label>
          <textarea
            placeholder="本文"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          {!draftId && (
            <button
              onClick={createDraft}
              disabled={loading || !to || !subject || !body}
              className="flex-1 bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '作成中...' : '下書きを作成'}
            </button>
          )}

          {draftId && (
            <button
              onClick={sendDraft}
              className="flex-1 bg-green-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
            >
              送信（確認済み）
            </button>
          )}
        </div>

        {draftId && (
          <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-lg">
            <p className="text-sm text-green-400">
              ✓ 下書きを作成しました。内容を確認の上、送信してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
