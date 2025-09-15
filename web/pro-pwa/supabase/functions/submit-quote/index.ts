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
    // Get authorization token from headers
    const authHeader = req.headers.get('authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '').trim() : null;
    
    console.log("Auth header received:", authHeader ? "Present" : "Missing");
    console.log("Extracted token:", token ? "Present" : "Missing");

    const {
      request_id,
      professional_id,
      description,
      price,
      estimated_time,
      media_urls
    } = await req.json();

    console.log("Submit quote called with:", {
      request_id,
      professional_id,
      description,
      price,
      estimated_time,
      media_urls,
      hasToken: !!token
    });

    // Validate required fields
    if (!request_id || !professional_id || !estimated_time) {
      console.error("Missing required fields in quote submission");
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields", 
          details: { request_id, professional_id, estimated_time }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or key");
      throw new Error("Server configuration error");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify token and professional ownership if token is provided
    if (token) {
      console.log("Verifying token and professional ownership...");
      const { data: tokenData, error: tokenError } = await supabase
        .from('auth_tokens')
        .select('professional_id, expires_at, is_active')
        .eq('token', token)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        console.error("Invalid or expired token:", tokenError);
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      if (tokenData.professional_id !== professional_id) {
        console.error("Token professional ID mismatch:", {
          tokenProfessionalId: tokenData.professional_id,
          submittedProfessionalId: professional_id
        });
        return new Response(
          JSON.stringify({ error: "Professional ID mismatch" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      console.log("Token verification successful for professional:", professional_id);
    }

    // Insert quote into quotes table
    const quoteData = {
      request_id,
      professional_id,
      description: description || "",
      price: price ? price.toString() : "0", // Store as string as per DB schema
      estimated_time,
      media_urls: media_urls && Array.isArray(media_urls) && media_urls.length > 0 ? media_urls : null,
      status: 'pending'
    };

    console.log("Inserting quote with data:", quoteData);

    const { data, error } = await supabase
      .from('quotes')
      .insert(quoteData)
      .select();

    if (error) {
      console.error("Error inserting quote:", error);
      throw error;
    }

    console.log("Quote submitted successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unexpected error in submit-quote:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});