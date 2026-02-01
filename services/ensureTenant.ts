import { supabase } from './supabaseClient';

export async function ensureTenant(userId: string, email: string) {
  // 既存tenantをチェック
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_user_id', userId)
    .single();

  if (existingTenant) {
    console.log('[ensureTenant] Tenant already exists:', existingTenant.id);
    return existingTenant;
  }

  // 新規tenantを作成
  const { data: createdTenant, error } = await supabase
    .from('tenants')
    .insert({
      owner_user_id: userId,
      name: email.split('@')[0] + '様',
      domain: email.split('@')[1],
      plan: 'basic',
      settings: {}
    })
    .select()
    .single();

  if (error) {
    console.error('[ensureTenant] Failed to create tenant:', error);
    throw error;
  }

  console.log('[ensureTenant] Created new tenant:', createdTenant.id);
  
  // tenant_usersにも作成
  await supabase
    .from('tenant_users')
    .insert({
      tenant_id: createdTenant.id,
      email: email,
      role: 'admin',
      profile: { name: email.split('@')[0] }
    });

  return createdTenant;
}
