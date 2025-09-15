
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    // Parse request body
    const { leadId, status } = await req.json();
    
    console.log("Updating lead status:", { leadId, status });
    
    if (!leadId || !status) {
      console.error("Missing required fields:", { leadId, status });
      return new Response(
        JSON.stringify({ error: "Lead ID and status are required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate status
    const validStatuses = ['active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      console.error("Invalid status:", status);
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be one of: active, completed, cancelled" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First check if the lead exists
    const { data: existingLead, error: checkError } = await supabaseClient
      .from('leads')
      .select('id, status, professional_id')
      .eq('id', leadId)
      .single();

    if (checkError || !existingLead) {
      console.error("Lead not found:", checkError);
      return new Response(
        JSON.stringify({ 
          error: "Lead not found",
          details: checkError?.message || 'Lead does not exist'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Found existing lead:", existingLead);

    // Update the lead status (only the status column)
    const { data: updatedLead, error: updateError } = await supabaseClient
      .from('leads')
      .update({
        status: status
      })
      .eq('id', leadId)
      .select('*')
      .single();
    
    if (updateError) {
      console.error("Error updating lead status:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to update lead status",
          details: updateError.message 
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("Lead status updated successfully:", updatedLead);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Lead status updated successfully",
        data: updatedLead 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: err.message || "An unexpected error occurred" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
