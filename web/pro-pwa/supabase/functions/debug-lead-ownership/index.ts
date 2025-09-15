
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    const { announcementId, userId, professionalId } = await req.json();
    
    if (!announcementId) {
      return new Response(
        JSON.stringify({ error: "Announcement ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    console.log("Checking ownership for announcement:", announcementId);
    console.log("User ID:", userId);
    console.log("Professional ID:", professionalId);
    
    // Get the lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from('leads')
      .select('*')
      .eq('id', announcementId)
      .single();
      
    if (leadError) {
      console.error("Error fetching lead:", leadError);
      return new Response(
        JSON.stringify({ error: leadError.message, code: leadError.code }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Get professional details associated with the user if professional ID is not provided
    let userProfessionalId = professionalId;
    if (userId && !professionalId) {
      const { data: professional } = await supabaseClient
        .from('professionals')
        .select('id')
        .eq('user_id', userId)
        .single();
        
      if (professional) {
        userProfessionalId = professional.id;
      }
    }
    
    const isOwner = lead && userProfessionalId && 
                   lead.professional_id?.toString() === userProfessionalId.toString();
                   
    const debugData = {
      announcementId,
      lead,
      userProfessionalId,
      leadProfessionalId: lead?.professional_id,
      isOwner,
      idMatch: lead && userProfessionalId ? 
        `${lead.professional_id?.toString()} === ${userProfessionalId.toString()}` : 
        'No IDs to compare',
      idTypes: {
        leadProfessionalIdType: lead?.professional_id ? typeof lead.professional_id : 'undefined',
        userProfessionalIdType: userProfessionalId ? typeof userProfessionalId : 'undefined'
      }
    };

    return new Response(
      JSON.stringify(debugData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: err.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
