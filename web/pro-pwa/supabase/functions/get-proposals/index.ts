
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
    const { professionalId } = await req.json();
    
    if (!professionalId) {
      return new Response(
        JSON.stringify({ error: "Professional ID is required" }),
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

    // Join proposals with leads to get additional info
    const { data, error } = await supabaseClient
      .from('proposals')
      .select(`
        id,
        price,
        description,
        status,
        created_at,
        estimated_completion,
        leads (
          title,
          id
        )
      `)
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Format the data for the frontend
    const formattedProposals = data.map(proposal => ({
      id: proposal.id,
      title: proposal.leads?.title || 'Unknown Project',
      client: 'Client via Ofair', // Could be enhanced with client details if available
      price: proposal.price,
      date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
      status: proposal.status,
      leadId: proposal.leads?.id,
      description: proposal.description,
      estimatedCompletion: proposal.estimated_completion
    }));

    return new Response(
      JSON.stringify(formattedProposals),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
