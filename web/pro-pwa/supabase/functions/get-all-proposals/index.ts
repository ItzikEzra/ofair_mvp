
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log(`[ALL_PROPOSALS] ${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { professionalId } = await req.json();
    
    if (!professionalId) {
      console.error("[ALL_PROPOSALS] Missing professional ID");
      return new Response(
        JSON.stringify({ error: "Professional ID is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`[ALL_PROPOSALS] Processing for professional: ${professionalId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get lead proposals
    console.log("[ALL_PROPOSALS] Fetching proposals...");
    const { data: proposals, error: proposalsError } = await supabaseClient
      .from('proposals')
      .select(`
        id,
        price,
        description,
        status,
        created_at,
        estimated_completion,
        final_amount,
        leads (
          title,
          id,
          location
        )
      `)
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    
    if (proposalsError) {
      console.error("[ALL_PROPOSALS] Error fetching proposals:", proposalsError);
      throw proposalsError;
    }
    
    console.log(`[ALL_PROPOSALS] Found ${proposals?.length || 0} proposals`);

    // 2. Get request quotes
    console.log("[ALL_PROPOSALS] Fetching quotes...");
    const { data: quotes, error: quotesError } = await supabaseClient
      .from('quotes')
      .select(`
        id,
        price,
        description,
        status,
        created_at,
        estimated_time,
        request_status,
        request_id,
        final_amount,
        requests!inner (
          title,
          id,
          location
        )
      `)
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false });
    
    if (quotesError) {
      console.error("[ALL_PROPOSALS] Error fetching quotes:", quotesError);
      throw quotesError;
    }
    
    console.log(`[ALL_PROPOSALS] Found ${quotes?.length || 0} quotes`);

    // 3. Format the data for the frontend
    const formattedProposals = proposals?.map(proposal => {
      console.log("[ALL_PROPOSALS] Processing proposal:", proposal);
      
      // Safe price parsing - handle null/undefined values
      let parsedPrice = null;
      if (proposal.price !== null && proposal.price !== undefined) {
        const priceFloat = parseFloat(proposal.price);
        parsedPrice = isNaN(priceFloat) ? null : priceFloat;
      }
      
      return {
        id: proposal.id,
        title: proposal.leads?.title || 'Unknown Project',
        client: 'Client via Ofair',
        price: parsedPrice,
        date: new Date(proposal.created_at).toLocaleDateString('he-IL'),
        status: proposal.status,
        leadId: proposal.leads?.id,
        description: proposal.description,
        estimatedCompletion: proposal.estimated_completion,
        location: proposal.leads?.location,
        type: 'lead' as const,
        created_at: proposal.created_at, // Keep original for sorting
        final_amount: proposal.final_amount // Add final_amount to returned data
      };
    }) || [];

    const formattedQuotes = quotes?.map(quote => {
      console.log("[ALL_PROPOSALS] Processing quote:", quote);
      
      // Safe price parsing - handle null/undefined values
      let parsedPrice = null;
      if (quote.price !== null && quote.price !== undefined) {
        const priceFloat = parseFloat(quote.price);
        parsedPrice = isNaN(priceFloat) ? null : priceFloat;
      }
      
      return {
        id: quote.id,
        title: quote.requests?.title || 'Unknown Request',
        client: 'Client Request',
        price: parsedPrice,
        date: new Date(quote.created_at).toLocaleDateString('he-IL'),
        status: quote.status,
        requestId: quote.request_id, // Use request_id directly from quote
        description: quote.description,
        estimatedCompletion: quote.estimated_time,
        location: quote.requests?.location,
        type: 'request' as const,
        request_status: quote.request_status, // Include request_status
        created_at: quote.created_at, // Keep original for sorting
        final_amount: quote.final_amount // Add final_amount to returned data
      };
    }) || [];

    // Sort by original created_at timestamp for accurate sorting
    const allProposals = [...formattedProposals, ...formattedQuotes]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log(`[ALL_PROPOSALS] Returning ${allProposals.length} total proposals and quotes`);
    console.log("[ALL_PROPOSALS] Final data:", JSON.stringify(allProposals, null, 2));

    return new Response(
      JSON.stringify(allProposals),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("[ALL_PROPOSALS] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
