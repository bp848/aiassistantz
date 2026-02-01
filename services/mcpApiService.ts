// MCP APIサービス
import mcpService from './mcpService';

export interface MCPRequest {
  tool: string;
  params: any;
}

export interface MCPResponse {
  result?: any;
  error?: string;
}

class MCPApiService {
  private static instance: MCPApiService;

  static getInstance(): MCPApiService {
    if (!MCPApiService.instance) {
      MCPApiService.instance = new MCPApiService();
    }
    return MCPApiService.instance;
  }

  async callTool(tool: string, params: any): Promise<any> {
    try {
      const result = await mcpService.callTool(tool, params);
      return result;
    } catch (error) {
      console.error('[MCP API] Error:', error);
      
      if (error.message === 'RECONNECT_REQUIRED') {
        throw new Error('RECONNECT_REQUIRED');
      }
      
      throw error;
    }
  }
}

export default MCPApiService.getInstance();
