// SaaSテナント管理サービス

import { supabase } from './supabaseClient';

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: 'basic' | 'pro' | 'enterprise';
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  aiModel: 'gemini-2.0-flash' | 'gemini-2.5-pro';
  maxUsers: number;
  maxGoogleAccounts: number;
  features: {
    calendar: boolean;
    gmail: boolean;
    documents: boolean;
    api: boolean;
  };
  branding: {
    logo?: string;
    primaryColor: string;
    companyName: string;
  };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'user';
  profile: {
    name: string;
    title?: string;
    department?: string;
  };
  isActive: boolean;
  lastLoginAt?: Date;
}

class TenantService {
  private currentTenant: Tenant | null = null;
  private currentUser: User | null = null;

  // テナント情報を取得
  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      // Supabaseからテナント情報を取得
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TenantService] getTenant error:', error);
      return null;
    }
  }

  // テナントを作成
  async createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    try {
      const newTenant = {
        ...tenantData,
        id: `tenant_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { data, error } = await supabase
        .from('tenants')
        .insert(newTenant)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TenantService] createTenant error:', error);
      throw error;
    }
  }

  // ユーザーを招待
  async inviteUser(tenantId: string, email: string, role: 'admin' | 'user'): Promise<User> {
    try {
      const newUser = {
        id: `user_${Date.now()}`,
        tenantId,
        email,
        role,
        profile: {
          name: email.split('@')[0]
        },
        isActive: true
      };

      const { data, error } = await supabase
        .from('users')
        .insert(newUser)
        .select()
        .single();

      if (error) throw error;

      // 招待メールを送信（実装）
      await this.sendInvitationEmail(email, tenantId);

      return data;
    } catch (error) {
      console.error('[TenantService] inviteUser error:', error);
      throw error;
    }
  }

  // ユーザー情報を取得
  async getUser(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[TenantService] getUser error:', error);
      return null;
    }
  }

  // 現在のテナントを設定
  setCurrentTenant(tenant: Tenant): void {
    this.currentTenant = tenant;
  }

  // 現在のユーザーを設定
  setCurrentUser(user: User): void {
    this.currentUser = user;
  }

  // 現在のテナントを取得
  getCurrentTenant(): Tenant | null {
    return this.currentTenant;
  }

  // 現在のユーザーを取得
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // プラン機能をチェック
  hasFeature(feature: keyof TenantSettings['features']): boolean {
    if (!this.currentTenant) return false;
    return this.currentTenant.settings.features[feature];
  }

  // 利用制限をチェック
  checkUsageLimit(type: 'users' | 'googleAccounts'): boolean {
    if (!this.currentTenant) return false;

    switch (type) {
      case 'users':
        return this.currentTenant.settings.maxUsers > 0;
      case 'googleAccounts':
        return this.currentTenant.settings.maxGoogleAccounts > 0;
      default:
        return false;
    }
  }

  // 招待メール送信（ダミー実装）
  private async sendInvitationEmail(email: string, tenantId: string): Promise<void> {
    console.log(`[TenantService] 招待メール送信: ${email} -> ${tenantId}`);
    // 実際のメール送信実装
  }

  // テナント設定を更新
  async updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<Tenant> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .update({
          settings: settings,
          updatedAt: new Date()
        })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;

      // 現在のテナント情報を更新
      if (this.currentTenant?.id === tenantId) {
        this.currentTenant = data;
      }

      return data;
    } catch (error) {
      console.error('[TenantService] updateTenantSettings error:', error);
      throw error;
    }
  }
}

export default new TenantService();
