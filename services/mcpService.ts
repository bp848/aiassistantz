// MCP (Model Context Protocol) Service
// Googleサービスとの実接続を担当

import MCPTransport from './mcpTransport';

interface MCPTool {
  name: string;
  description: string;
  parameters?: any;
}

interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

class MCPService {
  private isConnected: boolean = false;
  private availableTools: MCPTool[] = [];
  private transport: MCPTransport;

  constructor() {
    this.transport = new MCPTransport('ws'); // WebSocketに変更
  }

  // MCPサーバーに接続
  async connect(): Promise<boolean> {
    try {
      await this.transport.connect();

      // ツール一覧をMCPサーバーから取得
      const toolsResponse = await this.transport.send({
        method: 'tools/list'
      });

      if (toolsResponse.error) {
        throw new Error(toolsResponse.error.message);
      }

      this.availableTools = toolsResponse.result?.tools || [];
      this.isConnected = true;

      console.log('[MCP] Connected successfully');
      return true;
    } catch (error: any) {
      console.error('[MCP] Connection failed:', error);
      return false;
    }
  }

  // 利用可能なツール一覧を取得
  async listTools(): Promise<MCPTool[]> {
    if (!this.isConnected) {
      await this.connect();
    }
    return await this.transport.listTools();
  }

  // MCPツールを実行
  async callTool(toolName: string, args: any): Promise<MCPResponse> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      console.log(`[MCP] Calling tool: ${toolName} with args:`, args);

      // Transport経由でツール実行
      const result = await this.transport.callTool(toolName, args);
      return { result };
    } catch (error: any) {
      console.error(`[MCP] Tool call failed: ${toolName}`, error);
      return {
        error: {
          code: -32603,
          message: error?.message || 'Tool call failed'
        }
      };
    }
  }

  // 接続状態を確認
  isReady(): boolean {
    return this.isConnected;
  }

  // 切断
  disconnect(): void {
    this.transport.disconnect();
    this.isConnected = false;
    console.log('[MCP] Disconnected');
  }
}

// シングルトンインスタンス
export const mcpService = new MCPService();
export default mcpService;
