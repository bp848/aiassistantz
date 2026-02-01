// Google OAuthサービス
import { supabase } from './supabaseClient';
export interface GoogleAuthState {
  tenantId: string;
  returnUrl?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

class GoogleOAuthService {
  private static instance: GoogleOAuthService;

  static getInstance(): GoogleOAuthService {
    if (!GoogleOAuthService.instance) {
      GoogleOAuthService.instance = new GoogleOAuthService();
    }
    return GoogleOAuthService.instance;
  }

  // OAuth開始
  async startOAuth(tenantId: string, returnUrl?: string): Promise<string> {
    const state: GoogleAuthState = { tenantId, returnUrl };
    const stateEncoded = btoa(JSON.stringify(state));

    const authUrl = new URL('https://accounts.google.com/oauth/authorize');

    const params = {
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
      redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://assistant.b-p.co.jp/auth/v1/callback',
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
  async handleCallback(code: string, state: string): Promise<GoogleTokenResponse> {
    try {
      const stateData: GoogleAuthState = JSON.parse(atob(state));

      // 認証コードをトークンに交換
      const tokenResponse = await this.exchangeCodeForToken(code);

      // トークンを保存
      await this.saveTokens(stateData.tenantId, tokenResponse);

      return tokenResponse;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  }

  // 認証コードをトークンに交換
  private async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
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
        redirect_uri: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://assistant.b-p.co.jp/auth/v1/callback',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return await response.json();
  }

  // トークンを保存
  private async saveTokens(tenantId: string, tokens: GoogleTokenResponse): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const { error } = await supabase
      .from('google_auth')
      .upsert({
        tenant_id: tenantId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save tokens: ${error.message}`);
    }
  }

  // トークン更新
  async refreshTokens(tenantId: string): Promise<GoogleTokenResponse> {
    const { data: authData, error } = await supabase
      .from('google_auth')
      .select('refresh_token')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !authData?.refresh_token) {
      throw new Error('No refresh token found');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID!,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET!,
        refresh_token: authData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const newTokens = await response.json();
    await this.saveTokens(tenantId, newTokens);

    return newTokens;
  }

  // 有効なトークンを取得
  async getValidToken(tenantId: string): Promise<string> {
    const { data: authData, error } = await supabase
      .from('google_auth')
      .select('access_token, token_expires_at')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !authData) {
      throw new Error('No auth data found');
    }

    // トークンの有効期限チェック
    const expiresAt = new Date(authData.token_expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      // トークンを更新
      const newTokens = await this.refreshTokens(tenantId);
      return newTokens.access_token;
    }

    return authData.access_token;
  }

  // OAuth状態チェック
  async isOAuthConnected(tenantId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('google_auth')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    return !error && !!data;
  }

  // OAuth解除
  async disconnect(tenantId: string): Promise<void> {
    const { error } = await supabase
      .from('google_auth')
      .delete()
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to disconnect: ${error.message}`);
    }
  }
}

export default GoogleOAuthService.getInstance();
