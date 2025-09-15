import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

export async function validateAuthToken(token: string, supabase: unknown) {
  if (!token) return null;

  const { data, error } = await supabase
    .from('auth_tokens')
    .select('professional_id, expires_at')
    .eq('token', token)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;

  // Check if token is expired
  if (new Date(data.expires_at) < new Date()) {
    // Token expired - deactivate it
    await supabase
      .from('auth_tokens')
      .update({ is_active: false })
      .eq('token', token);
    return null;
  }

  // Update last_used_at
  await supabase
    .from('auth_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('token', token);

  return data.professional_id;
}

Deno.serve(async (req) => {
  console.log('[validate-token] Function invoked');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response(JSON.stringify({ error: 'No token provided' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const professionalId = await validateAuthToken(token, supabase);
  console.log('[validate-token] Token validation result:', !!professionalId);

  if (!professionalId) {
    console.log('[validate-token] Invalid token, returning 401');
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  console.log('[validate-token] Token valid, returning success');
  return new Response(JSON.stringify({ valid: true, professionalId }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});