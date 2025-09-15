import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import { corsHeaders } from "../_shared/cors.ts";
import { addSecurityHeaders, validateInputLength } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { professional_id } = await req.json();
    
    // Input validation
    if (!professional_id || typeof professional_id !== 'string') {
      return new Response(
        JSON.stringify({ error: "Professional ID is required" }),
        { 
          headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
          status: 400 
        }
      );
    }

    validateInputLength(professional_id, 50, 'professional_id');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Attempting to get professional contact info with authentication check');
    
    // Get the authorization token from headers
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication required to access contact information" }),
        { 
          headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
          status: 401 
        }
      );
    }

    // Use the secure function that validates business relationships
    const { data, error } = await supabaseClient.rpc('get_professional_contact_info', {
      professional_id_param: professional_id
    });

    if (error) {
      console.error("Contact info access denied:", error.message);
      
      // Return different error messages based on the type of error
      if (error.message.includes('Authentication required')) {
        return new Response(
          JSON.stringify({ error: "Authentication required" }),
          { 
            headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
            status: 401 
          }
        );
      } else if (error.message.includes('Insufficient permissions')) {
        return new Response(
          JSON.stringify({ error: "Access denied: No business relationship found" }),
          { 
            headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
            status: 403 
          }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to access contact information" }),
        { 
          headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
          status: 500 
        }
      );
    }
    
    console.log('Contact information access granted based on business relationship');
    
    return new Response(
      JSON.stringify(data || []),
      { 
        headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
        status: 200 
      }
    );
    
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        headers: addSecurityHeaders({ ...corsHeaders, 'Content-Type': 'application/json' }), 
        status: 500 
      }
    );
  }
});