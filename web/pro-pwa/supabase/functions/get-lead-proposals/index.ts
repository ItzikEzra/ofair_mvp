
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
    const { leadId } = await req.json();
    
    if (!leadId) {
      return new Response(
        JSON.stringify({ error: "Lead ID is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Fetching proposals for lead: ${leadId}`);

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get proposals with enhanced professional data
    const { data: proposals, error: proposalsError } = await supabaseClient
      .from('proposals')
      .select(`
        id,
        price,
        description,
        status,
        created_at,
        estimated_completion,
        sample_image_url,
        lower_price_willing,
        lower_price_value,
        scheduled_date,
        scheduled_time,
        professionals (
          id, 
          name, 
          phone_number, 
          location, 
          profession, 
          rating, 
          review_count
        )
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (proposalsError) {
      console.error("Error fetching proposals:", proposalsError);
      return new Response(
        JSON.stringify({ error: proposalsError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log(`Found ${proposals.length} proposals for lead ${leadId}`);

    // Format proposals for the response
    const formattedProposals = proposals.map(proposal => {
      // Handle sample_image_url as an array or convert single URL to array
      let imageUrls: string[] = [];
      if (proposal.sample_image_url) {
        if (Array.isArray(proposal.sample_image_url)) {
          imageUrls = proposal.sample_image_url.filter(url => 
            url && typeof url === 'string' && url.trim() !== ''
          );
        } else if (typeof proposal.sample_image_url === 'string' && proposal.sample_image_url.trim() !== '') {
          imageUrls = [proposal.sample_image_url.trim()];
        }
      }
      
      return {
        id: proposal.id,
        professional_id: proposal.professionals?.id,
        professional_name: proposal.professionals?.name || "בעל מקצוע",
        professional_phone: proposal.professionals?.phone_number || "",
        professional_location: proposal.professionals?.location || "",
        professional_profession: proposal.professionals?.profession || "",
        professional_rating: proposal.professionals?.rating || 0,
        professional_review_count: proposal.professionals?.review_count || 0,
        price: proposal.price,
        description: proposal.description,
        status: proposal.status,
        created_at: proposal.created_at,
        estimated_completion: proposal.estimated_completion,
        sample_image_urls: imageUrls,
        lower_price_willing: proposal.lower_price_willing,
        lower_price_value: proposal.lower_price_value,
        scheduled_date: proposal.scheduled_date,
        scheduled_time: proposal.scheduled_time
      };
    });
    
    console.log(`Formatted ${formattedProposals.length} proposals for response`);

    return new Response(
      JSON.stringify(formattedProposals),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
