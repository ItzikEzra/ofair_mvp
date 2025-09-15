
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
    const { address } = await req.json();
    if (!address || typeof address !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get secret from environment
    const GOOGLE_GEOCODING_API_KEY = Deno.env.get("GOOGLE_GEOCODING_API_KEY") || "";

    if (!GOOGLE_GEOCODING_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Google Maps API Key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Google Geocoding API
    const query = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${GOOGLE_GEOCODING_API_KEY}&language=he`;

    const resp = await fetch(url);
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to contact Google Geocoding API." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const data = await resp.json();
    if (!data.results || !data.results[0]) {
      return new Response(
        JSON.stringify({ error: "No results for specified address." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return new Response(
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        formatted_address: result.formatted_address
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e?.message || "Unknown error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
