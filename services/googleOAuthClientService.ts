// Google OAuth クライアント側実装
export interface GoogleOAuthState {
  tenantId: string;
  returnUrl?: string;
}

class GoogleOAuthClientService {
  private static instance: GoogleOAuthClientService;

  static getInstance(): GoogleOAuthClientService {
    if (!GoogleOAuthClientService.instance) {
      GoogleOAuthClientService.instance = new GoogleOAuthClientService();
    }
    return GoogleOAuthClientService.instance;
  }

  // OAuth開始
  async startOAuth(tenantId: string, returnUrl?: string): Promise<string> {
    const state: GoogleOAuthState = { tenantId, returnUrl };
    const stateEncoded = btoa(JSON.stringify(state));

    const authUrl = new URL('https://accounts.google.com/oauth/authorize');
    
    const params = {
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
      redirect_uri: `${window.location.origin}/auth/callback`,
      response_type: 'code',
      scope: import.meta.env.VITE_GOOGLE_SCOPES!,
      state: stateEncoded,
      access_type: 'offline',
      prompt: 'consent'
    };

    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value);
    });

    return authUrl.toString();
  }

  // コールバック処理
  async handleCallback(code: string, state: string): Promise<void> {
    try {
      const stateData: GoogleOAuthState = JSON.parse(atob(state));
      
      // 認証コードをトークンに交換
      const tokenResponse = await this.exchangeCodeForToken(code);
      
      // トークンを保存
      await this.saveTokens(stateData.tenantId, tokenResponse);
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  // 認証コードをトークンに交換
  private async exchangeCodeForToken(code: string): Promise<any> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${window.location.origin}/auth/callback`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // トークンを保存
  private async saveTokens(tenantId: string, tokens: any): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    
    const response = await fetch('/api/auth/save-tokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save tokens: ${response.statusText}`);
    }
  }

  // OAuth状態チェック
  async isOAuthConnected(tenantId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/auth/check-tokens/${tenantId}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default GoogleOAuthClientService.getInstance();
