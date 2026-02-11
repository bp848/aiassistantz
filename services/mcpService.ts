
import { GoogleGenAI } from "@google/genai";

/**
 * MCP Service Bridge
 * Google Workspace (Gmail/Calendar) 実機操作用プロトコル
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
  
  // デプロイしたMCPサーバーのSSEエンドポイントURL
  private serverUrl: string = "https://mcp-bridge.local/sse"; 
  
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

  public setAuth(token: string) {
    this.authToken = token;
    if (this.isConnected) this.disconnect();
  }

  async connect(): Promise<boolean> {
    if (this.isConnected && this.eventSource) return true;
    
    return new Promise((resolve, reject) => {
      try {
        const connectionUrl = this.authToken 
          ? `${this.serverUrl}?token=${encodeURIComponent(this.authToken)}`
          : this.serverUrl;
          
        this.eventSource = new EventSource(connectionUrl);

        this.eventSource.onopen = () => console.log("[MCP] SSE Channel Open");

        this.eventSource.onerror = (err) => {
          this.isConnected = false;
          this.eventSource?.close();
          reject(new Error("MCPサーバに接続できません。認証切れかURLが誤っています。"));
        };

        this.eventSource.addEventListener('endpoint', (event: MessageEvent) => {
          this.postUrl = event.data;
          this.isConnected = true;
          this.initializeMcp().then(() => resolve(true)).catch(reject);
        });

        this.eventSource.addEventListener('message', (event: MessageEvent) => {
          try {
            const response = JSON.parse(event.data);
            if (response.id !== undefined && this.pendingRequests.has(response.id)) {
              const { resolve: reqResolve, reject: reqReject } = this.pendingRequests.get(response.id)!;
              this.pendingRequests.delete(response.id);
              if (response.error) reqReject(response.error);
              else reqResolve(response.result);
            }
          } catch (e) { console.warn("[MCP] Message Parse Error", e); }
        });
      } catch (e) { reject(e); }
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
  }

  private async initializeMcp(): Promise<any> {
    return this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      clientInfo: { name: "President-Z-Client", version: "1.0.0" }
    });
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.isConnected || !this.postUrl) await this.connect();

    const id = `rpc-${this.nextId++}`;
    const request = { jsonrpc: "2.0", id, method, params };
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    if (this.authToken) headers['Authorization'] = `Bearer ${this.authToken}`;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      fetch(this.postUrl!, {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }).catch(err => {
        this.pendingRequests.delete(id);
        reject(err);
      });
    });
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest("tools/list", {});
    return response.tools || [];
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const response = await this.sendRequest("tools/call", {
      name: toolName,
      arguments: args
    });
    if (response && response.content) {
      const text = response.content.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n');
      try { return JSON.parse(text); } catch { return text; }
    }
    return response;
  }
}

export const mcp = MCPService.getInstance();
