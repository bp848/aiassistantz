#!/usr/bin/env node

// MCP WebSocket Bridge - 実働サーバー対応
import { WebSocketServer } from 'ws';
import { spawn } from 'child_process';

const PORT = 3000;
const wss = new WebSocketServer({ port: PORT });

console.log(`[MCP Bridge] WebSocket server started on port ${PORT}`);

// 実働MCPサーバーを起動
const mcpServer = spawn('node', ['mcp-server-real.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

mcpServer.stdout.on('data', (data) => {
  console.log('[MCP Server]', data.toString());
});

mcpServer.stderr.on('data', (data) => {
  console.error('[MCP Server Error]', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`[MCP Server] exited with code ${code}`);
});

// WebSocket接続処理
wss.on('connection', (ws) => {
  console.log('[MCP Bridge] Client connected');

  // MCPサーバーにメッセージを転送
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('[MCP Bridge] Forwarding to MCP server:', message);

      // MCPサーバーに送信
      mcpServer.stdin.write(JSON.stringify(message) + '\n');

      // レスポンスを待機（簡易実装）
      setTimeout(() => {
        // TODO: 実際のレスポンス処理を実装
        if (message.method === 'tools/list') {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            id: message.id,
            result: {
              tools: [
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
                }
              ]
            }
          }));
        }
      }, 1000);
    } catch (error) {
      console.error('[MCP Bridge] Message parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log('[MCP Bridge] Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('[MCP Bridge] WebSocket error:', error);
  });
});

process.on('SIGINT', () => {
  console.log('[MCP Bridge] Shutting down...');
  mcpServer.kill();
  wss.close();
  process.exit(0);
});
