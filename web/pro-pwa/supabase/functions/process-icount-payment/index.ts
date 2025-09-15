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
    const { 
      transaction_id, 
      cc_number, 
      cc_validity, 
      cc_cvv, 
      cc_holder_name, 
      cc_holder_id,
      amount,
      professional_id,
      client_name,
      email
    } = await req.json();
    
    if (!transaction_id || !cc_number || !cc_validity || !cc_cvv || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required payment fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const icountApiUrl = Deno.env.get("ICOUNT_API_URL") || "https://api.icount.co.il/api/v3.php";

    // Get ICOUNT API credentials for Classic Trio Method
    const icountCid = Deno.env.get("ICOUNT_CID");
    const icountUser = Deno.env.get("ICOUNT_USER");
    const icountPass = Deno.env.get("ICOUNT_PASS");

    if (!icountCid || !icountUser || !icountPass) {
      console.error("Missing ICOUNT API credentials");
      return new Response(
        JSON.stringify({ error: "ICOUNT API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process payment via ICOUNT using Classic Trio Method
    const cleanCcNumber = cc_number.replace(/\s+/g, '');
    const cleanCcValidity = cc_validity.replace(/[\/\-\s]/g, '');
    
    console.log("Payment data before sending:", {
      cc_number: cleanCcNumber,
      cc_validity: cleanCcValidity,
      cc_cvv: cc_cvv,
      amount: amount
    });
    
    const paymentPayload = {
      cid: icountCid,
      user: icountUser,
      pass: icountPass,
      sum: amount,
      cc_number: cleanCcNumber, // Send as string, not integer
      cc_validity: cleanCcValidity, // Send as string, not integer
      cc_cvv: parseInt(cc_cvv),
      cc_holder_name: cc_holder_name || "",
      cc_holder_id: cc_holder_id ? parseInt(cc_holder_id) : undefined,
      client_name: client_name || "Commission Payment",
      email: email || "",
      currency_code: "ILS",
      payment_description: `Commission payment - Professional ID: ${professional_id}`,
      is_test: false // Set to true for testing
    };

    console.log("Processing ICOUNT payment...");
    const paymentResponse = await fetch(`${icountApiUrl}/cc/bill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await paymentResponse.json();
    console.log("ICOUNT payment response:", paymentData);

    // Update transaction record
    console.log("Determining transaction status from ICOUNT response:", {
      status: paymentData.status,
      success: paymentData.success,
      approved: paymentData.approved,
      Code: paymentData.Code,
      confirmation_code: paymentData.confirmation_code
    });
    
    // בדיקה מפורטת יותר של תגובת איקאונט
    console.log("Full ICOUNT response analysis:", {
      success: paymentData.success,
      Code: paymentData.Code,
      deal_id: paymentData.deal_id,
      uid: paymentData.uid,
      transaction_id: paymentData.transaction_id,
      confirmation_code: paymentData.confirmation_code,
      ErrorDesc: paymentData.ErrorDesc,
      cc_bill_log_id: paymentData.cc_bill_log_id
    });
    
    // איקאונט מחזיר success=true ו-Code="0" רק אם הקלט תקין
    // עסקה אמיתית מסומנת ע"י קיומו של deal_id או uid
    const hasValidTransaction = paymentData.deal_id || paymentData.uid || paymentData.transaction_id;
    const hasSuccessfulValidation = paymentData.success === true && paymentData.Code === "0";
    
    console.log("Transaction validation:", {
      hasValidTransaction,
      hasSuccessfulValidation,
      dealId: paymentData.deal_id,
      uid: paymentData.uid
    });
    
    const transactionStatus = hasSuccessfulValidation && hasValidTransaction ? 'completed' : 'failed';
    
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('icount_transactions')
      .update({
        status: transactionStatus,
        icount_transaction_id: paymentData.transaction_id || paymentData.id,
        confirmation_code: paymentData.confirmation_code || paymentData.approval_code,
        response_payload: paymentData,
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating transaction:", updateError);
    }

    // Create notification for successful payment
    if (transactionStatus === 'completed') {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          professional_id,
          title: "תשלום עמלה בוצע בהצלחה",
          description: `תשלום עמלה בסך ${amount} ₪ בוצע בהצלחה`,
          type: 'payment_success',
          related_id: transaction_id,
          related_type: 'icount_transaction'
        });

      if (notificationError) {
        console.error("Error creating notification:", notificationError);
      }
    }

    console.log("Final response status:", transactionStatus);
    
    return new Response(
      JSON.stringify({ 
        success: transactionStatus === 'completed',
        status: transactionStatus,
        transaction_id: paymentData.transaction_id || paymentData.id || paymentData.deal_id,
        confirmation_code: paymentData.confirmation_code || paymentData.approval_code,
        message: transactionStatus === 'completed' ? "Payment processed successfully" : "Payment failed",
        details: paymentData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in process-icount-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});