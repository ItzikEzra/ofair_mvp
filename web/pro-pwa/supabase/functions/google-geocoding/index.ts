
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { action, ...params } = await req.json();
    const apiKey = Deno.env.get("GOOGLE_GEOCODING_API_KEY");

    if (!apiKey) {
      throw new Error("Google Geocoding API key not configured");
    }

    let response;

    switch (action) {
      case 'get-key':
        // Return the API key for client-side Google Places API
        return new Response(
          JSON.stringify({ apiKey }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
        
      case 'reverse':
        // Reverse geocoding: coordinates to address
        const { lat, lng } = params;
        response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=he`
        );
        break;
        
      case 'forward':
        // Forward geocoding: address to coordinates
        const { address } = params;
        response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=he`
        );
        break;
        
      default:
        throw new Error("Invalid action. Use 'get-key', 'reverse' or 'forward'");
    }

    if (!response.ok) {
      throw new Error(`Google API request failed: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Google Geocoding error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
