import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Fetching professional ratings with security...');

    // Extract token from Authorization header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || null;

    // Call the secure database function that returns masked customer data
    const { data: ratings, error } = await supabaseClient
      .rpc('get_my_professional_ratings', { token_param: token });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Successfully fetched ${ratings?.length || 0} ratings with masked customer data`);

    return new Response(
      JSON.stringify(ratings || []),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in get-my-professional-ratings:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch ratings',
        details: 'Check if you are authenticated and the secure function exists'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})