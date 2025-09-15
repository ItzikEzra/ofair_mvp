import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Fetching public professional data using secure function (contact info excluded)...');
    
    // Use the NEW secure function that excludes all contact information
    const { data, error } = await supabaseClient.rpc('get_public_professionals_secure');

    if (error) {
      console.error("Secure database function error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch professional data" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    console.log(`Successfully fetched ${data?.length || 0} professional profiles (secure - no contact info)`);
    
    // Additional security layer: explicitly sanitize data to ensure no contact info leaks
    const sanitizedData = (data || []).map(professional => ({
      id: professional.id,
      name: professional.name,
      profession: professional.profession,
      location: professional.location,
      city: professional.city,
      rating: professional.rating,
      review_count: professional.review_count,
      image: professional.image,
      image_url: professional.image_url,
      about: professional.about,
      specialties: professional.specialties,
      experience_range: professional.experience_range,
      experience_years: professional.experience_years,
      is_verified: professional.is_verified,
      status: professional.status,
      company_name: professional.company_name,
      certifications: professional.certifications,
      areas: professional.areas
      // SECURITY: Explicitly exclude phone_number, email, user_id
    }));
    
    return new Response(
      JSON.stringify(sanitizedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});