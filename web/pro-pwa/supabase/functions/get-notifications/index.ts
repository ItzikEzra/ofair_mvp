
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
    const { professionalId } = await req.json();

    if (!professionalId) {
      console.error("Missing professional ID");
      return new Response(
        JSON.stringify({ error: "Professional ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Fetching notifications for professional ID:", professionalId);

    // Create a Supabase client with the service role key for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or service role key");
      throw new Error("Server configuration error");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Direct query to the notifications table using service role to bypass RLS
    console.log("Executing query with service role key...");
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('professional_id', professionalId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
    
    console.log(`Found ${data?.length || 0} notifications for professional ${professionalId}`);
    console.log("Sample notification data:", data?.[0] || "No notifications");

    return new Response(
      JSON.stringify(data || []),
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
