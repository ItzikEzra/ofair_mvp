
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
    const { professionalId, type } = await req.json();

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

    console.log("Deleting notifications for professional:", professionalId, "type:", type);

    // Create a Supabase client with the service role key for full access
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or service role key");
      throw new Error("Server configuration error");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    let query = supabase
      .from('notifications')
      .delete()
      .eq('professional_id', professionalId);

    if (type === 'markAllAsRead') {
      // For mark all as read, update instead of delete
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('professional_id', professionalId)
        .eq('is_read', false);
        
      if (error) {
        console.error("Error marking all notifications as read:", error);
        throw error;
      }
      
      console.log("All notifications marked as read successfully");
    } else {
      // For delete all notifications
      const { error } = await query;
      
      if (error) {
        console.error("Error deleting notifications:", error);
        throw error;
      }
      
      console.log("All notifications deleted successfully");
    }

    return new Response(
      JSON.stringify({ success: true }),
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
