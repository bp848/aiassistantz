import { supabase } from './supabaseClient';

export async function ensureTenant(userId: string, email: string) {
  try {
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_user_id', userId)
      .single();

    if (existingTenant) {
      console.log('[ensureTenant] Tenant already exists:', existingTenant.id);
      return existingTenant;
    }

    const { data: createdTenant, error } = await supabase
      .from('tenants')
      .insert({
        owner_user_id: userId,
        name: email.split('@')[0] + '-tenant',
        domain: email.split('@')[1],
        plan: 'basic',
        settings: {}
      })
      .select()
      .single();

    if (error || !createdTenant) {
      console.error('[ensureTenant] Failed to create tenant:', error);
      throw error;
    }

    console.log('[ensureTenant] Created new tenant:', createdTenant.id);

    await supabase
      .from('tenant_users')
      .insert({
        tenant_id: createdTenant.id,
        email: email,
        role: 'admin',
        profile: { name: email.split('@')[0] }
      });

    return createdTenant;
  } catch (error) {
    console.warn('[ensureTenant] Skipping tenant flow due to error:', error);
    return null;
  }
}
