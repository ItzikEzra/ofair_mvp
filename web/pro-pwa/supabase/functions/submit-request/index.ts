
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
    const {
      user_id,
      title,
      description,
      location,
      category,
      timing,
      constraints,
      media_urls
    } = await req.json();

    if (!user_id || !title || !description || !location) {
      console.error("Missing required fields in request");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Submitting request with user ID:", user_id);
    console.log("Media URLs received:", media_urls);

    // Create a Supabase client with the project URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or key");
      throw new Error("Server configuration error");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert request with media_urls
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id,
        title,
        description,
        location,
        category: category || null,
        timing: timing || null,
        constraints: constraints || null,
        media_urls: media_urls && Array.isArray(media_urls) && media_urls.length > 0 ? media_urls : null,
        status: 'active'
      })
      .select();

    if (error) {
      console.error("Error inserting request:", error);
      throw error;
    }

    console.log("Request submitted successfully:", data);

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
