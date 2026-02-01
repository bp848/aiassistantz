// 実働MCP Server - Google API実接続
// JSON-RPC 2.0 準拠

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const tools = [
  {
    name: 'get_user_profile',
    description: 'Gmailユーザーのプロフィール情報を取得',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'テナントID' }
      },
      required: ['tenant_id']
    }
  },
  {
    name: 'list_events',
    description: 'Google Calendarのイベント一覧を取得',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'テナントID' },
        date: { type: 'string', description: 'YYYY-MM-DD形式の日付' },
        maxResults: { type: 'number', description: '最大取得件数' }
      },
      required: ['tenant_id']
    }
  },
  {
    name: 'search_threads',
    description: 'Gmailのスレッド検索',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'テナントID' },
        query: { type: 'string', description: '検索クエリ' },
        maxResults: { type: 'number', description: '最大取得件数' }
      },
      required: ['tenant_id']
    }
  },
  {
    name: 'gmail.createDraft',
    description: 'Gmailに下書きを作成する',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'テナントID' },
        to: { type: 'string', description: '送信先メールアドレス' },
        subject: { type: 'string', description: '件名' },
        body: { type: 'string', description: '本文' }
      },
      required: ['tenant_id', 'to', 'subject', 'body']
    }
  },
  {
    name: 'gmail.sendDraft',
    description: 'Gmailの下書きを送信する',
    inputSchema: {
      type: 'object',
      properties: {
        tenant_id: { type: 'string', description: 'テナントID' },
        draftId: { type: 'string', description: '下書きID' }
      },
      required: ['tenant_id', 'draftId']
    }
  }
];

// Google APIクライアントを取得
async function getGoogleClient(tenantId) {
  const { data: authData, error } = await supabase
    .from('google_auth')
    .select('access_token, refresh_token, token_expires_at')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !authData) {
    throw new Error('Google auth not found for tenant');
  }

  // トークンの有効期限チェック
  const expiresAt = new Date(authData.token_expires_at);
  const now = new Date();

  let accessToken = authData.access_token;

  if (expiresAt <= now) {
    // トークン更新
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: authData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const newTokens = await response.json();
    accessToken = newTokens.access_token;

    // 更新したトークンを保存
    await supabase
      .from('google_auth')
      .update({
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId);
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return auth;
}

// ユーザープロフィール取得
async function getUserProfile(tenantId) {
  try {
    const auth = await getGoogleClient(tenantId);
    const gmail = google.gmail({ version: 'v1', auth });

    const profile = await gmail.users.getProfile({ userId: 'me' });

    return {
      name: profile.data.emailAddress?.split('@')[0] || 'Unknown',
      email: profile.data.emailAddress,
      historyId: profile.data.historyId
    };
  } catch (error) {
    console.error('[getUserProfile] Error:', error);
    throw error;
  }
}

// Calendarイベント取得
async function listEvents(tenantId, date, maxResults = 10) {
  try {
    const auth = await getGoogleClient(tenantId);
    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = new Date(`${date}T00:00:00+09:00`).toISOString();
    const timeMax = new Date(`${date}T23:59:59+09:00`).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items?.map(event => ({
      id: event.id,
      title: event.summary || '無題',
      date: date,
      time: event.start?.dateTime?.split('T')[1]?.substring(0, 5) || '終日',
      duration: event.end?.dateTime ?
        Math.ceil((new Date(event.end.dateTime) - new Date(event.start.dateTime)) / (1000 * 60)) :
        1440,
      description: event.description || '',
      location: event.location || ''
    })) || [];

    return { events };
  } catch (error) {
    console.error('[listEvents] Error:', error);
    throw error;
  }
}

// RFC822 メール生成
function buildRawEmail(to, subject, body) {
  const message =
    `To: ${to}\r\n` +
    `Subject: ${subject}\r\n` +
    `Content-Type: text/plain; charset="UTF-8"\r\n` +
    `Content-Transfer-Encoding: 7bit\r\n\r\n` +
    body;

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Gmail下書き作成
async function createDraft(tenantId, to, subject, body) {
  try {
    const auth = await getGoogleClient(tenantId);
    const gmail = google.gmail({ version: 'v1', auth });

    const raw = buildRawEmail(to, subject, body);

    const response = await gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: { raw }
      }
    });

    return {
      draftId: response.data.id,
      threadId: response.data.message.threadId
    };
  } catch (error) {
    console.error('[createDraft] Error:', error);
    if (error.code === 401 || error.code === 403) {
      throw new Error('RECONNECT_REQUIRED');
    }
    throw error;
  }
}

// Gmail下書き送信
async function sendDraft(tenantId, draftId) {
  try {
    const auth = await getGoogleClient(tenantId);
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.drafts.send({
      userId: 'me',
      id: draftId
    });

    return {
      messageId: response.data.id,
      threadId: response.data.threadId
    };
  } catch (error) {
    console.error('[sendDraft] Error:', error);
    if (error.code === 401 || error.code === 403) {
      throw new Error('RECONNECT_REQUIRED');
    }
    throw error;
  }
}
async function searchThreads(tenantId, query = '', maxResults = 10) {
  try {
    const auth = await getGoogleClient(tenantId);
    const gmail = google.gmail({ version: 'v1', auth });

    const response = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults
    });

    const threads = response.data.threads || [];
    const detailedThreads = [];

    for (const thread of threads.slice(0, maxResults)) {
      const threadDetail = await gmail.users.threads.get({
        userId: 'me',
        id: thread.id,
        format: 'metadata'
      });

      const headers = threadDetail.data.messages?.[0]?.payload?.headers || [];
      const subject = headers.find(h => h.name === 'subject')?.value || '無題';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      detailedThreads.push({
        id: thread.id,
        subject,
        from,
        date,
        snippet: threadDetail.data.snippet || ''
      });
    }

    return { threads: detailedThreads };
  } catch (error) {
    console.error('[searchThreads] Error:', error);
    throw error;
  }
}

// JSON-RPC 2.0 メッセージ処理
process.stdin.on('data', async (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.error('[MCP Server] Received:', message);

    if (message.method === 'tools/list') {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: message.id,
        result: { tools }
      }));
      return;
    }

    if (message.method === 'tools/call') {
      const { name, arguments: args } = message.params;
      console.error('[MCP Server] Calling:', name);

      let result;
      try {
        switch (name) {
          case 'get_user_profile':
            result = await getUserProfile(args?.tenant_id);
            break;
          case 'list_events':
            result = await listEvents(args?.tenant_id, args?.date, args?.maxResults);
            break;
          case 'search_threads':
            result = await searchThreads(args?.tenant_id, args?.query, args?.maxResults);
            break;
          case 'gmail.createDraft':
            result = await createDraft(args?.tenant_id, args?.to, args?.subject, args?.body);
            break;
          case 'gmail.sendDraft':
            result = await sendDraft(args?.tenant_id, args?.draftId);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result
        }));
      } catch (error) {
        console.error('[MCP Server] Tool error:', error);
        process.stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: error.message || 'Internal error'
          }
        }));
      }
      return;
    }

    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    }));
  } catch (error) {
    console.error('[MCP Server] Parse error:', error);
    process.stdout.write(JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error'
      }
    }));
  }
});

console.error('[MCP Server] Started');
