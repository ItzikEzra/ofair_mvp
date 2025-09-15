
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  LeadSubmissionData,
  validateRequiredFields,
  validateProfessionalExists,
  getSupabaseClient
} from "./validation.ts";
import { processLocation } from "./locationProcessor.ts";
import { insertLead } from "./leadInsertion.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get coordinates from Google Geocoding API
const getCoordinatesForCity = async (cityName: string): Promise<{lat: number, lng: number} | null> => {
  try {
    console.log("🌍 Attempting to get coordinates for city:", cityName);
    
    const apiKey = Deno.env.get("GOOGLE_GEOCODING_API_KEY");
    if (!apiKey) {
      console.error("Google Geocoding API key not configured");
      return null;
    }

    const encodedCity = encodeURIComponent(`${cityName}, Israel`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedCity}&key=${apiKey}&language=he`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Google Geocoding API request failed:", response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log("✅ Successfully got coordinates for city:", cityName, location);
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    console.log("❌ No results found for city:", cityName);
    return null;
  } catch (error) {
    console.error("Error getting coordinates for city:", error);
    return null;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: LeadSubmissionData & { extractedCity?: string } = await req.json();

    // Validate required fields
    const validationError = validateRequiredFields(requestData);
    if (validationError) {
      console.error("Missing required fields in request");
      return new Response(
        JSON.stringify({ error: validationError }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log("Submitting lead with professional ID:", requestData.professional_id);

    // Create Supabase client
    const supabase = getSupabaseClient();

    // Validate that the professional exists
    const { isValid, error: professionalError } = await validateProfessionalExists(
      supabase, 
      requestData.professional_id
    );
    
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: professionalError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Process location data with enhanced city handling
    const processedLocation = processLocation(
      requestData.location,
      requestData.client_address,
      requestData.extractedCity
    );

    // Enhanced coordinate handling - get coordinates if missing
    let finalLatitude = requestData.latitude;
    let finalLongitude = requestData.longitude;

    // If we don't have coordinates but we have a valid city, try to get them
    if ((!finalLatitude || !finalLongitude) && processedLocation && processedLocation !== "לא צוין") {
      console.log("🔍 Missing coordinates, attempting to get them for city:", processedLocation);
      const coordinates = await getCoordinatesForCity(processedLocation);
      if (coordinates) {
        finalLatitude = coordinates.lat;
        finalLongitude = coordinates.lng;
        console.log("✅ Successfully added coordinates for city:", processedLocation, coordinates);
      }
    }

    // Prepare the enhanced lead data
    const enhancedRequestData = {
      ...requestData,
      location: processedLocation,
      latitude: finalLatitude,
      longitude: finalLongitude
    };

    console.log("📍 Final lead data with processed location and coordinates:", {
      location: processedLocation,
      latitude: finalLatitude,
      longitude: finalLongitude,
      originalData: {
        location: requestData.location,
        extractedCity: requestData.extractedCity,
        client_address: requestData.client_address
      }
    });

    // Insert the lead
    const data = await insertLead(supabase, enhancedRequestData, processedLocation);

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
