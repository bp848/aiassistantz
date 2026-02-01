-- テナント管理テーブル
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'pro', 'enterprise')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- テナントユーザーテーブル
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  profile JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Google認証情報テーブル
CREATE TABLE google_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- インデックス
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_email ON tenant_users(email);
CREATE INDEX idx_google_auth_tenant_id ON google_auth(tenant_id);

-- RLS有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_auth ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（テナントごとのデータ分離）
CREATE POLICY "Tenants can view own tenant" ON tenants
  FOR SELECT USING (true);

CREATE POLICY "Tenants can update own tenant" ON tenants
  FOR UPDATE USING (true);

CREATE POLICY "Tenant users can view own tenant users" ON tenant_users
  FOR SELECT USING (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

CREATE POLICY "Tenant users can insert own tenant users" ON tenant_users
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

CREATE POLICY "Tenant users can update own tenant users" ON tenant_users
  FOR UPDATE USING (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

CREATE POLICY "Google auth can view own auth" ON google_auth
  FOR SELECT USING (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

CREATE POLICY "Google auth can insert own auth" ON google_auth
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

CREATE POLICY "Google auth can update own auth" ON google_auth
  FOR UPDATE USING (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

-- 監査ログテーブル
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs can view own logs" ON audit_logs
  FOR SELECT USING (tenant_id IN (
    SELECT id FROM tenants WHERE domain = current_setting('app.current_tenant', true)
  ));

-- トリガー: updated_atの自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_auth_updated_at BEFORE UPDATE ON google_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
