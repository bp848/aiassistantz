import { supabase } from './supabaseClient';

export async function logAction(
  tenantId: string,
  action: string,
  metadata?: any
) {
  try {
    await supabase.from('audit_logs').insert({
      tenant_id: tenantId,
      action,
      metadata,
    });
  } catch (error) {
    console.error('[Audit Log] Error:', error);
  }
}
