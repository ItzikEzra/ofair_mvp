
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
    const { proposalId, leadId, finalAmount, paymentMethod, sharePercentage } = await req.json();
    
    if (!proposalId || !leadId || !finalAmount) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration error: Missing Supabase URL or key");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Calculate commission amount
    const commissionAmount = sharePercentage > 0 ? (finalAmount * sharePercentage / 100) : 0;
    
    // 1. Get the lead details to get the lead owner
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
      .select('title, professional_id')
      .eq('id', leadId)
      .single();
      
    if (leadError) {
      console.error("Error fetching lead:", leadError);
      throw leadError;
    }
    
    // 2. Get the professional details
    const { data: proposalData, error: proposalError } = await supabase
      .from('proposals')
      .select('professional_id, professional_name')
      .eq('id', proposalId)
      .single();
      
    if (proposalError) {
      console.error("Error fetching proposal:", proposalError);
      throw proposalError;
    }
    
    // 3. Create a payment record
    const { data: paymentData, error: paymentError } = await supabase
      .from('lead_payments')
      .insert({
        lead_id: leadId,
        proposal_id: proposalId,
        final_amount: finalAmount,
        payment_method: paymentMethod,
        share_percentage: sharePercentage,
        commission_amount: commissionAmount,
        professional_id: proposalData.professional_id
      })
      .select()
      .single();
      
    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      throw paymentError;
    }
    
    // 4. Send notification to the lead owner
    if (leadData.professional_id && commissionAmount > 0) {
      const notificationData = {
        professional_id: leadData.professional_id,
        title: "התקבל תשלום עבור ליד",
        description: `התקבל תשלום עבור הליד "${leadData.title}" בסך ${finalAmount} ₪. העמלה שלך: ${commissionAmount.toFixed(2)} ₪`,
        type: 'commission',
        related_id: paymentData.id,
        related_type: 'lead_payment',
        client_details: null
      };
      
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData);
        
      if (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Continue anyway - we don't want to fail the payment update just because the notification failed
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        paymentId: paymentData.id
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing payment update:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
