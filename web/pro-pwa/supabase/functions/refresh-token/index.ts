import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { validateAuthToken } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  console.log('[refresh-token] Function invoked');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Validate current token
    const professionalId = await validateAuthToken(token, supabase);
    console.log('[refresh-token] Token validation result:', !!professionalId);

    if (!professionalId) {
      console.log('[refresh-token] Invalid token, returning 401');
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Generate new token with sliding expiration (14 days from now)
    const newToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14);

    // Deactivate old token
    await supabase
      .from('auth_tokens')
      .update({ is_active: false })
      .eq('token', token);

    // Insert new token
    const { error: tokenError } = await supabase
      .from('auth_tokens')
      .insert({
        professional_id: professionalId,
        token: newToken,
        expires_at: expiresAt.toISOString(),
        device_info: req.headers.get('user-agent') || 'unknown'
      });

    if (tokenError) {
      console.error('Failed to create new auth token:', tokenError);
      return new Response(JSON.stringify({ error: 'Failed to refresh token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('[refresh-token] Token refreshed successfully');
    return new Response(JSON.stringify({ 
      token: newToken,
      expiresAt: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in refresh-token:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});