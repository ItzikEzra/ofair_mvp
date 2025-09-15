
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { validateAuthToken, extractTokenFromRequest } from "../_shared/auth.ts";

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
    console.log("Processing work completion request");
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log("Authorization header present:", !!authHeader);
    
    // Parse request body
    const { proposalId, proposalType, finalAmount, paymentMethod, notes } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Server configuration error: Missing Supabase URL or key");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the professional ID - try multiple approaches
    console.log("Getting current professional ID securely...");
    
    let actualProfessionalId = null;
    let professionalIdError = null;
    
    // First, try using the RPC function which handles both auth methods
    const { data: rpcProfessionalId, error: rpcError } = await supabase
      .rpc('get_current_professional_id_secure');
    
    if (rpcProfessionalId) {
      actualProfessionalId = rpcProfessionalId;
    } else {
      console.log("RPC function failed, trying manual auth token extraction");
      
      // Extract token from authorization header
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '').trim();
        console.log("Token extracted, length:", token.length);
        
        // Try to find professional by auth token
        const { data: tokenData, error: tokenError } = await supabase
          .from('auth_tokens')
          .select('professional_id')
          .eq('token', token)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
          
        if (tokenData?.professional_id) {
          actualProfessionalId = tokenData.professional_id;
          console.log("Found professional ID via token:", actualProfessionalId);
        } else {
          console.log("Token lookup failed:", tokenError);
          professionalIdError = tokenError || new Error("Invalid or expired token");
        }
      }
    }
    
    console.log("Professional ID lookup result:", { actualProfessionalId, professionalIdError });
    
    if (!actualProfessionalId) {
      console.error("Failed to get professional ID:", professionalIdError);
      return new Response(
        JSON.stringify({ 
          error: "Authentication failed - could not identify professional",
          details: professionalIdError?.message || "No valid authentication found"
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log("Request data:", { proposalId, proposalType, finalAmount, paymentMethod, notes: notes ? "present" : "none" });
    
    // Validate UUID format for proposalId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!proposalId || !finalAmount) {
      console.error("Missing required fields:", { proposalId: !!proposalId, finalAmount: !!finalAmount });
      return new Response(
        JSON.stringify({ error: "Missing required fields", details: { proposalId: !!proposalId, finalAmount: !!finalAmount } }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!uuidRegex.test(proposalId)) {
      console.error("Invalid UUID format for proposalId:", proposalId);
      return new Response(
        JSON.stringify({ error: "Invalid proposal ID format" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Handle proposal type mapping
    const isLead = proposalType === 'lead' || proposalType === 'proposal';
    const isRequest = proposalType === 'request' || proposalType === 'quote';
    
    if (!isLead && !isRequest) {
      console.error("Invalid proposalType:", proposalType);
      return new Response(
        JSON.stringify({ 
          error: "Invalid proposal type. Must be 'lead', 'proposal', 'request', or 'quote'",
          proposalType 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Get the proposal/quote details from appropriate table
    console.log(`Fetching ${isLead ? 'proposal' : 'quote'} details for ID: ${proposalId}, type: ${proposalType}`);
    
    let proposalData: any = null;
    let proposalError: any = null;
    let leadData: any = null;
    let requestData: any = null;
    
    if (isLead) {
      // For leads: get from proposals table and related lead data
      const { data, error } = await supabase
        .from('proposals')
        .select('professional_id, lead_id, status')
        .eq('id', proposalId)
        .maybeSingle();
      proposalData = data;
      proposalError = error;
      
      if (data?.lead_id) {
        const { data: lead } = await supabase
          .from('leads')
          .select('share_percentage, title')
          .eq('id', data.lead_id)
          .maybeSingle();
        leadData = lead;
      }
    } else {
      // For requests: get from quotes table and related request data
      const { data, error } = await supabase
        .from('quotes')
        .select('professional_id, request_id, status, request_status')
        .eq('id', proposalId)
        .maybeSingle();
      proposalData = data;
      proposalError = error;
      
      if (data?.request_id) {
        const { data: request } = await supabase
          .from('requests')
          .select('title')
          .eq('id', data.request_id)
          .maybeSingle();
        requestData = request;
      }
    }
      
    console.log(`Proposal query result:`, { data: proposalData, error: proposalError });
      
    if (proposalError) {
      console.error("Error fetching proposal:", proposalError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to find proposal with ID ${proposalId}`,
          details: proposalError.message 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!proposalData) {
      console.error(`No proposal found with ID ${proposalId}`);
      return new Response(
        JSON.stringify({ 
          error: "Proposal not found",
          proposalId
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const professionalId = proposalData.professional_id;
    
    // Validate that the current professional owns this proposal
    console.log("Validating ownership:", { 
      actualProfessionalId, 
      proposalProfessionalId: professionalId,
      match: actualProfessionalId === professionalId 
    });
    
    if (actualProfessionalId !== professionalId) {
      console.error("Permission denied: Professional doesn't own this proposal");
      return new Response(
        JSON.stringify({ 
          error: "Permission denied - you can only complete your own work",
          currentProfessionalId: actualProfessionalId,
          proposalProfessionalId: professionalId
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Validate that the proposal is in a completable state
    const validStatuses = ['accepted', 'approved', 'waiting_for_rating', 'scheduled'];
    let isValidStatus = false;
    
    if (isRequest) {
      // For quotes, check both status and request_status
      isValidStatus = validStatuses.includes(proposalData.status) || 
                     validStatuses.includes(proposalData.request_status) ||
                     proposalData.request_status === 'approved';
    } else {
      isValidStatus = validStatuses.includes(proposalData.status);
    }
    
    if (!isValidStatus) {
      console.error("Invalid status for completion:", { 
        status: proposalData.status, 
        request_status: proposalData.request_status 
      });
      return new Response(
        JSON.stringify({ 
          error: "Cannot complete work - proposal must be accepted or approved",
          currentStatus: proposalData.status,
          requestStatus: proposalData.request_status,
          validStatuses
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const relatedId = isLead ? proposalData.lead_id : proposalData.request_id;
    
    // Calculate commission amount
    let sharePercentage = 0;
    let ownerId = null;
    let title = '';
    
    if (isLead) {
      sharePercentage = leadData?.share_percentage || 5;
      const { data: leadOwner } = await supabase
        .from('leads')
        .select('professional_id')
        .eq('id', relatedId)
        .maybeSingle();
      ownerId = leadOwner?.professional_id;
      title = leadData?.title || 'Unknown Lead';
    } else {
      sharePercentage = 10;
      ownerId = null;
      title = requestData?.title || 'Unknown Request';
    }
    
    let commissionAmount = 0;
    let ofairCommission = 0;
    
    if (isLead) {
      // For leads: 5% OFAIR commission
      ofairCommission = finalAmount * 0.05;
      if (sharePercentage > 0) {
        const leadOwnerCommission = finalAmount * sharePercentage / 100;
        commissionAmount = finalAmount - ofairCommission - leadOwnerCommission;
      } else {
        commissionAmount = finalAmount - ofairCommission;
      }
    } else {
      // For requests: 10% OFAIR commission
      ofairCommission = finalAmount * 0.10;
      commissionAmount = finalAmount - ofairCommission;
    }
    
    console.log(`Commission calculation:`, { 
      finalAmount, 
      ofairCommission, 
      commissionAmount, 
      sharePercentage,
      type: proposalType 
    });
    
    // Create a payment record
    const paymentTableName = isLead ? 'lead_payments' : 'quote_payments';
    const relatedPaymentField = isLead ? 'lead_id' : 'request_id';
    
    const paymentData = {
      [relatedPaymentField]: relatedId,
      final_amount: finalAmount,
      payment_method: paymentMethod,
      share_percentage: sharePercentage,
      commission_amount: commissionAmount,
      professional_id: professionalId,
      notes: notes || null
    };
    
    // Add specific ID field based on type
    if (isLead) {
      paymentData.proposal_id = proposalId;
    } else {
      paymentData.quote_id = proposalId;
    }
    
    console.log(`Inserting payment record into ${paymentTableName}:`, paymentData);
    
    let { data: savedPayment, error: paymentError } = await supabase
      .from(paymentTableName)
      .insert(paymentData)
      .select()
      .maybeSingle();
      
    if (paymentError) {
      console.error("Error creating payment record:", paymentError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment record", details: paymentError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    if (!savedPayment) {
      console.error("Payment record was not created properly");
      return new Response(
        JSON.stringify({ error: "Payment record was not created" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Send notification to the professional who completed the work
    const professionalNetEarnings = commissionAmount;
    const professionalNotificationData = {
      professional_id: professionalId,
      title: `עבודה הושלמה - התקבל תשלום`,
      description: `עבודה "${title}" הושלמה בהצלחה. סכום סופי: ${finalAmount} ₪. הרווח שלך: ${professionalNetEarnings.toFixed(2)} ₪`,
      type: 'work_completed',
      related_id: savedPayment.id,
      related_type: isLead ? 'lead_payment' : 'quote_payment',
      client_details: null
    };
    
    const { error: professionalNotificationError } = await supabase
      .from('notifications')
      .insert(professionalNotificationData);
      
    if (professionalNotificationError) {
      console.error("Error creating professional notification:", professionalNotificationError);
    }

    // Send notification to the lead owner if applicable
    if (ownerId && isLead && sharePercentage > 0) {
      const leadOwnerCommission = finalAmount * sharePercentage / 100;
      
      const leadOwnerNotificationData = {
        professional_id: ownerId,
        title: `ליד הושלם - התקבלה עמלה`,
        description: `הליד "${title}" הושלם בהצלחה בסכום ${finalAmount} ₪. העמלה שלך: ${leadOwnerCommission.toFixed(2)} ₪`,
        type: 'lead_commission',
        related_id: savedPayment.id,
        related_type: 'lead_payment',
        client_details: null
      };
      
      const { error: leadOwnerNotificationError } = await supabase
        .from('notifications')
        .insert(leadOwnerNotificationData);
        
      if (leadOwnerNotificationError) {
        console.error("Error creating lead owner notification:", leadOwnerNotificationError);
      }
    }
    
    // Update proposal/quote status to 'completed' and set final amount
    const updateTableName = isLead ? 'proposals' : 'quotes';
    const updateData = { status: 'completed', final_amount: finalAmount };
    const { error: updateError } = await supabase
      .from(updateTableName)
      .update(updateData)
      .eq('id', proposalId);
      
    if (updateError) {
      console.error(`Error updating proposal status:`, updateError);
    }
    
    // For leads, check if we need to update the lead status
    if (isLead) {
      const { data: activeProposals, error: checkError } = await supabase
        .from('proposals')
        .select('id')
        .eq('lead_id', relatedId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .neq('status', 'rejected');
        
      if (checkError) {
        console.error("Error checking active proposals:", checkError);
      } else {
        // If no active proposals remain, update the lead status to 'completed'
        if (!activeProposals || activeProposals.length === 0) {
          const { error: leadUpdateError } = await supabase
            .from('leads')
            .update({ status: 'completed' })
            .eq('id', relatedId);
            
          if (leadUpdateError) {
            console.error("Error updating lead status:", leadUpdateError);
          } else {
            // Send notification to lead owner about completion
            if (ownerId) {
              const completionNotificationData = {
                professional_id: ownerId,
                title: `ליד הושלם`,
                description: `הליד "${title}" הושלם ועבר לסטטוס 'הושלם'`,
                type: 'lead_status',
                related_id: relatedId,
                related_type: 'lead',
                client_details: null
              };
              
              await supabase
                .from('notifications')
                .insert(completionNotificationData);
            }
          }
        }
      }
    }
    
    console.log("Work completion processed successfully", { paymentId: savedPayment.id });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        paymentId: savedPayment.id
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing work completion:", error);
    console.error("Error stack:", error.stack);
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error",
        stack: error.stack,
        name: error.name
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
