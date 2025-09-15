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
      professional_id,
      business_name,
      vat_id,
      contact_name,
      email,
      phone,
      address,
      city,
      postal_code
    } = await req.json();
    
    if (!professional_id) {
      return new Response(
        JSON.stringify({ error: "Missing professional_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate Israeli VAT ID format if provided
    if (vat_id) {
      const vatRegex = /^\d{9}$/;
      if (!vatRegex.test(vat_id.replace(/[^0-9]/g, ''))) {
        return new Response(
          JSON.stringify({ error: "Invalid VAT ID format. Must be 9 digits." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check if billing details already exist
    const { data: existingDetails, error: checkError } = await supabase
      .from('professional_billing_details')
      .select('*')
      .eq('professional_id', professional_id)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing billing details:", checkError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing billing details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const billingData = {
      business_name,
      vat_id: vat_id?.replace(/[^0-9]/g, ''), // Store only digits
      contact_name,
      email,
      phone,
      address,
      city,
      postal_code,
      updated_at: new Date().toISOString()
    };

    let result;
    
    if (existingDetails) {
      // Update existing record
      const { data, error } = await supabase
        .from('professional_billing_details')
        .update(billingData)
        .eq('professional_id', professional_id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('professional_billing_details')
        .insert({
          professional_id,
          ...billingData
        })
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error("Error saving billing details:", result.error);
      return new Response(
        JSON.stringify({ error: "Failed to save billing details" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        billing_details: result.data
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in save-billing-details:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});