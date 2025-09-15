import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { amount, professional_id } = await req.json();
    
    if (!amount || !professional_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, professional_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get ICOUNT API credentials
    const icountCid = Deno.env.get("ICOUNT_CID");
    const icountUser = Deno.env.get("ICOUNT_USER");
    const icountPass = Deno.env.get("ICOUNT_PASS");
    const icountApiUrl = Deno.env.get("ICOUNT_API_URL") || "https://api.icount.co.il/api/v3.php";

    if (!icountCid || !icountUser || !icountPass) {
      console.error("Missing ICOUNT API credentials");
      return new Response(
        JSON.stringify({ error: "ICOUNT API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get professional billing details
    const { data: billingDetails, error: billingError } = await supabase
      .from('professional_billing_details')
      .select('*')
      .eq('professional_id', professional_id)
      .maybeSingle();

    if (billingError) {
      console.error("Error fetching billing details:", billingError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch billing details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For iCount API, we use the Classic Trio Method (cid, user, pass) 
    // No session creation needed - we pass credentials with each request
    console.log("Using ICOUNT Classic Trio Method - no session required");

    // Store transaction record
    const { data: transaction, error: transactionError } = await supabase
      .from('icount_transactions')
      .insert({
        professional_id,
        amount,
        currency: 'ILS',
        status: 'session_created',
        request_payload: { session_created: true }
      })
      .select()
      .single();

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        session_id: null, // Not needed for Classic Trio Method
        transaction_id: transaction.id,
        billing_details: billingDetails,
        icount_credentials: {
          cid: icountCid,
          user: icountUser,
          pass: icountPass
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-icount-session:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});