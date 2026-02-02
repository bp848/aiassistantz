// Supabase Edge Function: Google OAuth Start
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { tenantId, returnUrl } = await req.json();

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Google OAuth URL生成
    const authUrl = new URL('https://accounts.google.com/oauth/authorize');
    
    const params = {
      client_id: Deno.env.get('VITE_GOOGLE_CLIENT_ID')!,
      redirect_uri: 'https://assistant.b-p.co.jp/#/auth/callback',
      response_type: 'code',
      scope: Deno.env.get('VITE_GOOGLE_SCOPES')!,
      state: btoa(JSON.stringify({ tenantId, returnUrl })),
      access_type: 'offline',
      prompt: 'consent'
    };

    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value);
    });

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[OAuth Start] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
