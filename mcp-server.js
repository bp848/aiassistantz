// 最小MCP Server - stdioベース
// JSON-RPC 2.0 準拠

import { google } from 'googleapis';

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
        date: { type: 'string', description: 'YYYY-MM-DD形式の日付' },
        maxResults: { type: 'number', description: '最大取得件数' }
      }
    }
  },
  {
    name: 'create_event',
    description: 'Google Calendarにイベントを作成',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'イベントタイトル' },
        date: { type: 'string', description: 'YYYY-MM-DD形式の日付' },
        time: { type: 'string', description: 'HH:MM形式の時刻' },
        duration: { type: 'number', description: '開催時間（分）' },
        description: { type: 'string', description: 'イベント説明' }
      },
      required: ['title', 'date', 'time']
    }
  },
  {
    name: 'search_threads',
    description: 'Gmailのスレッドを検索',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '検索クエリ' },
        maxResults: { type: 'number', description: '最大取得件数' }
      }
    }
  },
  {
    name: 'get_message',
    description: 'Gmailのメッセージ詳細を取得',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', description: 'メッセージID' }
      },
      required: ['messageId']
    }
  },
  {
    name: 'create_draft',
    description: 'Gmailの下書きを作成',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: '送信先メールアドレス' },
        subject: { type: 'string', description: '件名' },
        body: { type: 'string', description: 'メール本文' }
      },
      required: ['to', 'subject', 'body']
    }
  },
  {
    name: 'send_message',
    description: 'Gmailでメッセージを送信',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: '送信先メールアドレス' },
        subject: { type: 'string', description: '件名' },
        body: { type: 'string', description: 'メール本文' }
      },
      required: ['to', 'subject', 'body']
    }
  }
];

function respond(response) {
  console.log(JSON.stringify(response));
}

function handleRequest(message) {
  console.error('[MCP Server] Received:', message.method);

  if (message.method === 'tools/list') {
    respond({
      jsonrpc: '2.0',
      id: message.id,
      result: { tools }
    });
    return;
  }

  if (message.method === 'tools/call') {
    const { name, arguments: args } = message.params;
    console.error('[MCP Server] Calling:', name);

    // ダミー実装から実API呼び出しに変更
    let result;
    switch (name) {
      case 'get_user_profile':
        result = await this.getUserProfile(args?.tenant_id);
        break;
      case 'list_events':
        result = {
          events: [
            {
              id: '1',
              title: 'テストイベント',
              date: args?.date || new Date().toISOString().split('T')[0],
              time: '14:00',
              duration: 60
            }
          ]
        };
        break;
      case 'create_event':
        result = {
          id: `event_${Date.now()}`,
          created: true,
          ...args
        };
        break;
      case 'search_threads':
        result = {
          threads: [
            {
              id: 'thread_1',
              subject: 'テストメール',
              from: 'test@example.com',
              snippet: 'これはテストです'
            }
          ]
        };
        break;
      case 'get_message':
        result = {
          id: args?.messageId,
          subject: 'テストメール詳細',
          from: 'test@example.com',
          body: 'メール本文です'
        };
        break;
      case 'create_draft':
        result = {
          id: `draft_${Date.now()}`,
          status: 'draft',
          ...args
        };
        break;
      case 'send_message':
        result = {
          id: `msg_${Date.now()}`,
          status: 'sent',
          ...args
        };
        break;
      default:
        respond({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${name}`
          }
        });
        return;
    }

    respond({
      jsonrpc: '2.0',
      id: message.id,
      result
    });
    return;
  }

  // 未知のメソッド
  respond({
    jsonrpc: '2.0',
    id: message.id,
    error: {
      code: -32601,
      message: `Method not found: ${message.method}`
    }
  });
}

// stdinから1行ずつ読み込む
process.stdin.setEncoding('utf8');
let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // 最後の不完全な行をバッファに戻す

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        handleRequest(message);
      } catch (error) {
        console.error('[MCP Server] JSON parse error:', error.message);
      }
    }
  }
});

process.stdin.on('end', () => {
  console.error('[MCP Server] Connection closed');
});

console.error('[MCP Server] Started');
