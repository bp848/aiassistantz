// MCP Transport Layer
// 実際のMCPサーバーとの通信を担当

interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export class MCPTransport {
  private transport: 'http' | 'ws' = 'ws'; // WebSocketに変更
  private serverUrl?: string;
  private messageId = 0;
  private ws?: WebSocket;

  constructor(transport: 'http' | 'ws' = 'ws', serverUrl?: string) {
    this.transport = transport;
    this.serverUrl = serverUrl || 'ws://localhost:3000';
  }

  // MCPサーバーに接続
  async connect(serverUrl?: string): Promise<void> {
    this.serverUrl = serverUrl || this.serverUrl;

    switch (this.transport) {
      case 'http':
        await this.connectHttp();
        break;
      case 'ws':
        await this.connectWebSocket();
        break;
    }
  }

  private async connectHttp(): Promise<void> {
    console.log('[MCP Transport] Testing HTTP connection...');

    // 接続テストとしてtools/listを呼び出す
    try {
      await this.send({ method: 'tools/list' });
      console.log('[MCP Transport] HTTP connection established');
    } catch (error) {
      console.error('[MCP Transport] HTTP connection failed:', error);
      throw new Error('MCP server not reachable');
    }
  }

  private async connectWebSocket(): Promise<void> {
    console.log('[MCP Transport] Connecting to WebSocket...');

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.serverUrl!);

      this.ws.onopen = () => {
        console.log('[MCP Transport] WebSocket connection established');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('[MCP Transport] WebSocket connection failed:', error);
        reject(new Error('WebSocket connection failed'));
      };

      this.ws.onclose = () => {
        console.log('[MCP Transport] WebSocket connection closed');
      };
    });
  }

  // MCPメッセージを送信
  async send(message: Omit<MCPMessage, 'jsonrpc'>): Promise<MCPMessage> {
    const mcpMessage: MCPMessage = {
      jsonrpc: '2.0',
      id: ++this.messageId,
      ...message
    };

    switch (this.transport) {
      case 'http':
        return await this.sendHttp(mcpMessage);
      case 'ws':
        return await this.sendWebSocket(mcpMessage);
      default:
        throw new Error(`Unsupported transport: ${this.transport}`);
    }
  }

  private async sendHttp(message: MCPMessage): Promise<MCPMessage> {
    if (!this.serverUrl) {
      throw new Error('Server URL not configured');
    }

    console.log('[MCP Transport] → Sending:', message.method);

    try {
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: MCPMessage = await response.json();
      console.log('[MCP Transport] ← Received:', result.method || result.result || result.error);

      return result;
    } catch (error: any) {
      console.error('[MCP Transport] HTTP request failed:', error);
      throw error;
    }
  }

  private async sendWebSocket(message: MCPMessage): Promise<MCPMessage> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    console.log('[MCP Transport] → Sending:', message.method);

    return new Promise((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        try {
          const response: MCPMessage = JSON.parse(event.data);
          console.log('[MCP Transport] ← Received:', response.method || response.result || response.error);

          // 一時的なイベントリスナーを削除
          this.ws!.removeEventListener('message', messageHandler);
          resolve(response);
        } catch (error) {
          console.error('[MCP Transport] Failed to parse response:', error);
          this.ws!.removeEventListener('message', messageHandler);
          reject(error);
        }
      };

      this.ws.addEventListener('message', messageHandler);
      this.ws.send(JSON.stringify(message));

      // タイムアウト処理
      setTimeout(() => {
        this.ws!.removeEventListener('message', messageHandler);
        reject(new Error('WebSocket request timeout'));
      }, 10000);
    });
  }

  // ツール一覧を取得
  async listTools(): Promise<MCPTool[]> {
    const response = await this.send({ method: 'tools/list' });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result?.tools || [];
  }

  // ツールを実行
  async callTool(name: string, args: any): Promise<any> {
    const response = await this.send({
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  // 切断
  disconnect(): void {
    console.log('[MCP Transport] Disconnected');
  }
}

export default MCPTransport;
