/**
 * MCP SSE プロキシ: ブラウザ → 当サーバ → Supabase MCP
 * CORS を避けるため、同一オリジンからこのエンドポイントに接続する。
 */

const base64urlEncode = (str: string): string =>
  Buffer.from(str, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export default async function handler(req: { method?: string; query?: Record<string, string | string[]>; headers: Record<string, string | undefined> }, res: { setHeader: (k: string, v: string) => void; status: (n: number) => { end: (s?: string) => void; json: (o: object) => void }; write: (s: string) => void; end: (s?: string) => void }) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  const token = typeof req.query?.token === 'string' ? req.query.token : Array.isArray(req.query?.token) ? req.query.token[0] : '';
  const upstream = process.env.MCP_UPSTREAM_URL || 'https://mcp.supabase.com/mcp?project_ref=frbdpmqxgtgnjeccpbub';
  const sep = upstream.includes('?') ? '&' : '?';
  const upstreamUrl = token ? `${upstream}${sep}token=${encodeURIComponent(token)}` : upstream;

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${proto}://${host}`;
  const proxyPostPath = `${baseUrl}/api/mcp-post`;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      headers: { Accept: 'text/event-stream' },
    });
    if (!upstreamRes.ok || !upstreamRes.body) {
      res.setHeader('Content-Type', 'application/json');
      res.status(upstreamRes.status || 502).json({ error: 'Upstream MCP SSE failed' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';
    let currentData = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
          currentData = '';
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim();
        } else if (line === '') {
          if (currentEvent === 'endpoint' && currentData && currentData.startsWith('http')) {
            const connectionId = base64urlEncode(currentData);
            res.write(`event: endpoint\ndata: ${proxyPostPath}?connectionId=${encodeURIComponent(connectionId)}\n\n`);
          } else if (currentEvent || currentData) {
            res.write((currentEvent ? `event: ${currentEvent}\n` : '') + (currentData ? `data: ${currentData}\n` : '') + '\n');
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }
    if (buffer.trim()) res.write(buffer);
    res.end();
  } catch (e) {
    console.error('[mcp-sse]', e);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'MCP SSE proxy error' });
  }
}
