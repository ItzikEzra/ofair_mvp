
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Request } from "./types.ts";
import { professionCategories } from "./professionalData.ts";

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
    let body: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        body = JSON.parse(bodyText);
      }
    } catch (e) {
      console.log("Failed to parse request body, using empty body");
    }

    const filteringMode = body.filteringMode || "all";
    
    // Debug distance filtering specifically  
    if (filteringMode === "city_distance" || filteringMode === "city_distance_coords" || filteringMode === "user_location_distance") {
      console.log("🎯 REQUESTS Edge Function - Distance filtering request:", {
        filteringMode,
        city: body.city,
        distance: body.distance,
        latitude: body.latitude,
        longitude: body.longitude,
        hasCoords: !!(body.latitude && body.longitude && body.distance)
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Server configuration error");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Start building the query
    let query = supabase
      .from('requests')
      .select(`
        id,
        title,
        description,
        location,
        status,
        created_at,
        media_urls,
        constraints,
        timing,
        category,
        latitude,
        longitude
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    // Apply filtering based on mode
    switch (filteringMode) {
      case "city_distance_coords":
      case "city_distance":
        // For distance filtering, we don't pre-filter by city to allow for broader search
        break;

      case "user_location_distance":
        // For user location distance filtering, don't pre-filter by location
        console.log("📍 Using user location distance mode - no pre-filtering");
        break;

      case "city_only":
        if (body.city) {
          query = query.ilike('location', `%${body.city}%`);
        }
        break;

      case "work_areas":
        if (body.areaRestriction && body.areaRestriction.length > 0) {
          const orConditions = body.areaRestriction.map((area: string) => `location.ilike.%${area}%`);
          query = query.or(orConditions.join(','));
        }
        break;

      case "all":
        // No additional location filtering
        break;

      default:
        break;
    }
    
    // Apply category filter if specified
    if (body.category && body.category.trim() !== '') {
      const relatedCategories = findRelatedCategories(body.category);
      
      if (relatedCategories.length > 0) {
        const orConditions = relatedCategories.map(cat => `category.ilike.%${cat}%`);
        query = query.or(orConditions.join(','));
      } else {
        query = query.ilike('category', `%${body.category.trim()}%`);
      }
    }
    
    // Execute the query
    const { data: requests, error: requestsError } = await query;
    
    if (requestsError) {
      console.error("Error fetching requests:", requestsError);
      throw requestsError;
    }
    
    
    console.log(`Found ${requests?.length || 0} requests before distance filtering`);

    // Apply distance filtering if needed
    let outputRequests = requests || [];
    
    if ((filteringMode === "city_distance" || filteringMode === "city_distance_coords" || filteringMode === "user_location_distance") && body.latitude && body.longitude && body.distance) {
      console.log("🎯 APPLYING DISTANCE CALCULATION FOR REQUESTS:", {
        userLat: body.latitude,
        userLng: body.longitude,
        maxDistance: body.distance,
        requestCount: outputRequests.length
      });
      
      const userLat = Number(body.latitude);
      const userLng = Number(body.longitude);
      const maxDistance = Number(body.distance);

      // Validate coordinates
      if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDistance) && 
          userLat >= -90 && userLat <= 90 && userLng >= -180 && userLng <= 180 && maxDistance > 0) {
        
        console.log("🔍 Processing distance calculations for requests...");
        
        const processedRequests = outputRequests
          .map((request, index) => {
            if (request.latitude && request.longitude && 
                typeof request.latitude === 'number' && typeof request.longitude === 'number') {
              const distance = haversine(userLat, userLng, request.latitude, request.longitude);
              console.log(`📏 Request ${index}: ${request.title} - Distance: ${distance.toFixed(2)}km (${distance <= maxDistance ? 'INCLUDED' : 'EXCLUDED'})`);
              return { ...request, distance };
            } else {
              console.log(`❌ Request ${index}: ${request.title} - Missing coordinates`);
              return null;
            }
          })
          .filter((request): request is NonNullable<typeof request> => {
            if (request === null) return false;
            if (typeof request.distance === "number") {
              return request.distance <= maxDistance;
            }
            return false;
          })
          .sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
          
        console.log(`📊 Distance filtering results: ${processedRequests.length}/${outputRequests.length} requests within ${maxDistance}km`);
        outputRequests = processedRequests;
      } else {
        console.error("❌ Invalid coordinates or distance for filtering:", {
          userLat,
          userLng,
          maxDistance,
          isLatValid: !isNaN(userLat) && userLat >= -90 && userLat <= 90,
          isLngValid: !isNaN(userLng) && userLng >= -180 && userLng <= 180,
          isDistanceValid: !isNaN(maxDistance) && maxDistance > 0
        });
      }
    }

    
    console.log(`✅ Returning ${outputRequests.length} requests after filtering`);
    
    return new Response(
      JSON.stringify(outputRequests),
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

// Helper function to find related categories based on keyword
function findRelatedCategories(keyword: string): string[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  // First check for exact match
  const exactCategory = professionCategories.find(
    category => category.value.toLowerCase() === normalizedKeyword ||
               category.label.toLowerCase() === normalizedKeyword ||
               category.synonyms.some(syn => syn.toLowerCase() === normalizedKeyword)
  );
  
  if (exactCategory) {
    return [exactCategory.value, ...exactCategory.synonyms];
  }
  
  // Then look for partial matches
  const matchingCategories = professionCategories.filter(
    category => category.label.toLowerCase().includes(normalizedKeyword) ||
               category.synonyms.some(syn => syn.toLowerCase().includes(normalizedKeyword))
  );
  
  if (matchingCategories.length > 0) {
    const allMatches: string[] = [];
    matchingCategories.forEach(category => {
      allMatches.push(category.value);
      allMatches.push(...category.synonyms);
    });
    return [...new Set(allMatches)]; // Remove duplicates
  }
  
  // Return the original keyword if no matches found
  return [keyword];
}

// Enhanced Haversine distance calculation function in km with higher precision
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371.0088; // Earth's radius in km (more precise value)
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}
