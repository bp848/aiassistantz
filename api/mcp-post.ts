/**
 * MCP POST プロキシ: ブラウザ → 当サーバ → Supabase MCP の JSON-RPC
 * connectionId は SSE の endpoint で受け取った実 postUrl の base64url。
 */

const base64urlDecode = (str: string): string => {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  return Buffer.from(b64, 'base64').toString('utf8');
};

export default async function handler(
  req: { method?: string; query?: Record<string, string | string[]>; headers: Record<string, string | undefined>; body?: unknown },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { end: (s?: string) => void; json: (o: object) => void }; end: (s?: string) => void }
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  const connectionId = typeof req.query?.connectionId === 'string' ? req.query.connectionId : Array.isArray(req.query?.connectionId) ? req.query.connectionId[0] : '';
  if (!connectionId) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).json({ error: 'Missing connectionId' });
    return;
  }
  let postUrl: string;
  try {
    postUrl = base64urlDecode(connectionId);
  } catch {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).json({ error: 'Invalid connectionId' });
    return;
  }
  if (!postUrl.startsWith('https://')) {
    res.setHeader('Content-Type', 'application/json');
    res.status(400).json({ error: 'Invalid postUrl' });
    return;
  }

  const auth = req.headers.authorization;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) headers['Authorization'] = auth;

  try {
    const body = typeof req.body === 'object' && req.body !== null ? JSON.stringify(req.body) : (req.body as string) ?? '{}';
    const upstreamRes = await fetch(postUrl, {
      method: 'POST',
      headers,
      body,
    });
    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.status(upstreamRes.status);
    const text = await upstreamRes.text();
    res.end(text);
  } catch (e) {
    console.error('[mcp-post]', e);
    res.setHeader('Content-Type', 'application/json');
    res.status(502).json({ error: 'MCP POST proxy error' });
  }
}
