// MCP WebSocket Bridge
// stdioベースMCPサーバーをブラウザから接続可能にする

import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// MCPサーバープロセスを起動
const mcpServer = spawn('node', ['mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd()
});

// HTTPサーバーとWebSocketサーバーを起動
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('[MCP Bridge] WebSocket client connected');
  
  // MCPサーバーからのstdoutをWebSocketに転送
  mcpServer.stdout.on('data', (data) => {
    const message = data.toString().trim();
    if (message && ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });

  // WebSocketから受信したメッセージをMCPサーバーに転送
  ws.on('message', (data) => {
    const message = data.toString();
    console.log('[MCP Bridge] → MCP:', message);
    mcpServer.stdin.write(message + '\n');
  });

  ws.on('close', () => {
    console.log('[MCP Bridge] WebSocket client disconnected');
  });
});

// エラーハンドリング
mcpServer.stderr.on('data', (data) => {
  console.error('[MCP Server Error]:', data.toString());
});

mcpServer.on('close', (code) => {
  console.log(`[MCP Server] Process exited with code ${code}`);
});

// サーバー起動
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[MCP Bridge] WebSocket server listening on port ${PORT}`);
  console.log(`[MCP Bridge] MCP endpoint: ws://localhost:${PORT}`);
});
