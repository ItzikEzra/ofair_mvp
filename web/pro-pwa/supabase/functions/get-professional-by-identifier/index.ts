
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { identifier } = await req.json();

    if (!identifier) {
      return new Response(
        JSON.stringify({ error: 'Missing identifier parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Looking up professional by identifier: ${identifier}`);
    
    const isEmail = identifier.includes('@');
    
    try {
      const { data, error } = await supabaseClient.rpc(
        'get_professional_by_identifier', 
        { 
          identifier_param: identifier,
          is_email_param: isEmail 
        }
      );

      if (error) {
        console.error("Database function error:", error);
        return new Response(
          JSON.stringify({ error: "Database error occurred" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        console.log("No professional found for identifier:", identifier);
        return new Response(
          JSON.stringify({ error: "Professional not found" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      console.log("Professional data found:", data);
      return new Response(
        JSON.stringify(data[0]),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } catch (queryError) {
      console.error("Error fetching professional data:", queryError);
      return new Response(
        JSON.stringify({ error: "Database error occurred" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

