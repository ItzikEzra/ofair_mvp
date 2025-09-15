import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

/**
 * Rate limiting function with enhanced security
 */
async function checkRateLimit(supabase: any, identifier: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const maxAttempts = 5;
  const windowMinutes = 60;
  const blockDurationMinutes = 60;
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - (windowMinutes * 60 * 1000));
  
  // Get recent attempts
  const { data: attempts, error } = await supabase
    .from('auth_rate_limits')
    .select('attempt_count, blocked_until, last_attempt_at')
    .eq('identifier', identifier)
    .gte('last_attempt_at', windowStart.toISOString())
    .order('last_attempt_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow on error to avoid blocking legitimate users
  }

  if (attempts && attempts.length > 0) {
    const latest = attempts[0];
    
    // Check if currently blocked
    if (latest.blocked_until && new Date(latest.blocked_until) > now) {
      const retryAfter = Math.ceil((new Date(latest.blocked_until).getTime() - now.getTime()) / 1000);
      return { allowed: false, retryAfter };
    }

    // Check if max attempts reached
    if (latest.attempt_count >= maxAttempts) {
      const blockUntil = new Date(now.getTime() + (blockDurationMinutes * 60 * 1000));
      
      // Update block status
      await supabase
        .from('auth_rate_limits')
        .update({
          blocked_until: blockUntil.toISOString(),
          last_attempt_at: now.toISOString()
        })
        .eq('identifier', identifier);

      return { allowed: false, retryAfter: blockDurationMinutes * 60 };
    }
  }

  return { allowed: true };
}

/**
 * Record authentication attempt
 */
async function recordAttempt(supabase: any, identifier: string, success: boolean): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - (60 * 60 * 1000)); // 1 hour window
  
  if (success) {
    // Clear rate limit on successful auth
    await supabase
      .from('auth_rate_limits')
      .delete()
      .eq('identifier', identifier);
    return;
  }

  // Get current attempts in window
  const { data: existing } = await supabase
    .from('auth_rate_limits')
    .select('attempt_count')
    .eq('identifier', identifier)
    .gte('last_attempt_at', windowStart.toISOString())
    .limit(1);

  const currentAttempts = existing && existing.length > 0 ? existing[0].attempt_count : 0;

  // Upsert attempt record
  await supabase
    .from('auth_rate_limits')
    .upsert({
      identifier,
      attempt_count: currentAttempts + 1,
      last_attempt_at: now.toISOString()
    }, {
      onConflict: 'identifier',
      ignoreDuplicates: false
    });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { identifier, success } = await req.json();
    
    // Input validation
    if (!identifier || typeof identifier !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid identifier" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (identifier.length > 50) {
      return new Response(
        JSON.stringify({ error: "Identifier too long" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(supabaseClient, identifier);
    
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Rate limit exceeded", 
          retryAfter: rateLimit.retryAfter 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Record attempt if specified
    if (typeof success === 'boolean') {
      await recordAttempt(supabaseClient, identifier, success);
    }
    
    return new Response(
      JSON.stringify({ allowed: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Rate limit check error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});