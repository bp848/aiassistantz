
/**
 * ==========================================
 * MCP Service Bridge (Google Workspace Sync)
 * ==========================================
 * このサービスは、Google Workspaceの実機データにアクセスするための
 * MCP (Model Context Protocol) サーバーとの通信を統括します。
 * 
 * 認証には Google OAuth 2.0 アクセストークンを使用し、
 * 各リクエストの Authorization ヘッダーに付与します。
 */

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

class MCPService {
  private static instance: MCPService;
  private isConnected: boolean = false;
  private authToken: string | null = null;
  
  /**
   * 接続先のMCPサーバURL。
   * 環境変数 VITE_MCP_SERVER_URL で上書き可能（未設定時は Supabase MCP をデフォルト使用）。
   */
  private serverUrl: string =
    (import.meta as any).env?.VITE_MCP_SERVER_URL || "https://mcp.supabase.com/mcp?project_ref=frbdpmqxgtgnjeccpbub"; 
  
  private eventSource: EventSource | null = null;
  private postUrl: string | null = null;
  private nextId: number = 1;
  private pendingRequests: Map<number | string, { resolve: (val: any) => void; reject: (err: any) => void }> = new Map();

  private constructor() {}

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * 【認証トークンの設定】
   * IntegrationSetup.tsx で取得した Google OAuth 2.0 トークンを受け取ります。
   * これにより、以降のすべての実機操作リクエストが「認証済み」となります。
   */
  public setAuth(token: string) {
    this.authToken = token;
    console.log("[MCP-SYSTEM] Authentication token successfully configured.");
    
    // 既存の接続がある場合は一度リセットし、新しいトークンで再接続可能にします。
    if (this.isConnected) {
      this.disconnect();
    }
  }

  /**
   * MCPサーバへのSSE接続を確立します。
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.eventSource) return true;
    
    return new Promise((resolve, reject) => {
      console.log("[MCP-SYSTEM] Initiating SSE transport connection...");
      
      try {
        /**
         * EventSource APIは標準でカスタムヘッダーを送信できません。
         * そのため、多くのMCPブリッジ実装ではクエリパラメータ ?token=... で認証を行います。
         */
        const connectionUrl = this.authToken 
          ? `${this.serverUrl}?token=${encodeURIComponent(this.authToken)}`
          : this.serverUrl;
          
        this.eventSource = new EventSource(connectionUrl);

        this.eventSource.onopen = () => {
          console.log("[MCP-SYSTEM] Transport channel opened.");
        };

        this.eventSource.onerror = (err) => {
          console.error("[MCP-SYSTEM] SSE Transport Error:", err);
          this.isConnected = false;
          this.eventSource?.close();
          reject(new Error("同期サーバへの接続に失敗しました。認証情報の有効期限またはサーバURLを確認してください。"));
        };

        /**
         * 'endpoint' イベント: MCPサーバがJSON-RPCリクエストを受け付ける POST URL を通知します。
         */
        this.eventSource.addEventListener('endpoint', (event: MessageEvent) => {
          this.postUrl = event.data;
          console.log("[MCP-SYSTEM] Received post-endpoint:", this.postUrl);
          this.isConnected = true;
          
          // ハンドシェイク（initialize）を実行して通信を開始します。
          this.initializeMcp()
            .then(() => {
              console.log("[MCP-SYSTEM] Ready for real-world operations.");
              resolve(true);
            })
            .catch(reject);
        });

        /**
         * 受信した JSON-RPC レスポンスを処理し、保留中の Promise を解決します。
         */
        this.eventSource.addEventListener('message', (event: MessageEvent) => {
          try {
            const response = JSON.parse(event.data);
            if (response.id !== undefined && this.pendingRequests.has(response.id)) {
              const { resolve: reqResolve, reject: reqReject } = this.pendingRequests.get(response.id)!;
              this.pendingRequests.delete(response.id);
              
              if (response.error) reqReject(response.error);
              else reqResolve(response.result);
            }
          } catch (e) {
            console.warn("[MCP-SYSTEM] Non-JSON message received:", e);
          }
        });

      } catch (e) {
        console.error("[MCP-SYSTEM] Connection failed during setup:", e);
        reject(e);
      }
    });
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.postUrl = null;
    this.pendingRequests.clear();
    console.log("[MCP-SYSTEM] Session disconnected.");
  }

  private async initializeMcp(): Promise<any> {
    return this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "Cloud-President-Z", version: "1.0.0" }
    });
  }

  /**
   * 【JSON-RPCリクエスト送信】
   * すべての POST リクエストのヘッダーに Bearer トークンを注入します。
   */
  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.isConnected || !this.postUrl) {
      await this.connect();
    }

    const id = `rpc-${this.nextId++}`;
    const request = { jsonrpc: "2.0", id, method, params };
    
    // 【認証の核】Authorizationヘッダーを構築
    const headers: Record<string, string> = { 
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      fetch(this.postUrl!, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }).catch(err => {
        this.pendingRequests.delete(id);
        console.error(`[MCP-RPC] Failed to send ${method}:`, err);
        reject(err);
      });
    });
  }

  /**
   * 利用可能なツールの一覧をサーバから取得します。
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest("tools/list", {});
    return response.tools || [];
  }

  /**
   * ツールを実行します（実機のカレンダー登録やメール検索など）。
   */
  async callTool(toolName: string, args: any): Promise<any> {
    const response = await this.sendRequest("tools/call", {
      name: toolName,
      arguments: args
    });

    if (response && response.content) {
      const textContent = response.content
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text)
        .join('\n');
      try { return JSON.parse(textContent); } catch { return textContent; }
    }
    return response;
  }

  get status() {
    return this.isConnected ? 'connected' : 'disconnected';
  }
}

export const mcp = MCPService.getInstance();
