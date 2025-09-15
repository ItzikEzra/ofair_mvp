
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
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "Lead ID is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Starting deletion process for lead: ${leadId}`);

    // First, reject all proposals for this lead
    const { error: proposalsError } = await supabaseClient
      .from('proposals')
      .update({ status: 'rejected' })
      .eq('lead_id', leadId)
      .neq('status', 'rejected');

    if (proposalsError) {
      console.error("Error rejecting proposals:", proposalsError);
      return new Response(
        JSON.stringify({ error: `Failed to reject proposals: ${proposalsError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully rejected proposals for lead: ${leadId}`);

    // Then delete the lead
    const { error: deleteError } = await supabaseClient
      .from('leads')
      .delete()
      .eq('id', leadId);

    if (deleteError) {
      console.error("Error deleting lead:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to delete lead: ${deleteError.message}` }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Successfully deleted lead: ${leadId}`);

    return new Response(
      JSON.stringify({ success: true, message: "Lead deleted and proposals rejected successfully" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
