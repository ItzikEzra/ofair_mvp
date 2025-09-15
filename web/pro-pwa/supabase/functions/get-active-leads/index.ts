
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { Lead } from "./types.ts";
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
      console.log("🎯 LEADS Edge Function - Distance filtering request:", {
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
    
    // Get user authentication if available
    let userProfessionalId = null;
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (user && !error) {
          const { data: professionalData } = await supabase
            .from('professionals')
            .select('id')
            .eq('user_id', user.id)
            .single();
          if (professionalData) {
            userProfessionalId = professionalData.id;
          }
        }
      }
    } catch (authError) {
      console.log("Auth check failed, proceeding with public data");
    }

    // Start building the query
    let query = supabase
      .from('leads')
      .select(`
        id,
        title,
        description,
        location,
        budget,
        status,
        created_at,
        professional_id,
        share_percentage,
        image_url,
        image_urls,
        client_name,
        client_phone,
        client_address,
        work_date,
        work_time,
        notes,
        profession,
        constraints,
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
        const orConditions = relatedCategories.map(cat => `profession.ilike.%${cat}%`);
        query = query.or(orConditions.join(','));
      } else {
        query = query.ilike('profession', `%${body.category.trim()}%`);
      }
    }

    // Execute the query
    const { data: leads, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
      throw error;
    }

    // Filter out leads that the user has already submitted proposals to
    let filteredLeads = leads || [];
    if (userProfessionalId) {
      const { data: existingProposals } = await supabase
        .from('proposals')
        .select('lead_id')
        .eq('professional_id', userProfessionalId);
      
      if (existingProposals && existingProposals.length > 0) {
        const proposedLeadIds = new Set(existingProposals.map(p => p.lead_id));
        filteredLeads = filteredLeads.filter(lead => !proposedLeadIds.has(lead.id));
        console.log(`Filtered out ${leads.length - filteredLeads.length} leads with existing proposals`);
      }
    }

    

    // Apply distance filtering if needed
    let outputLeads = filteredLeads;
    
    console.log(`Found ${filteredLeads.length} leads before distance filtering`);
    
    if ((filteringMode === "city_distance" || filteringMode === "city_distance_coords" || filteringMode === "user_location_distance") && body.latitude && body.longitude && body.distance) {
      console.log("🎯 APPLYING DISTANCE CALCULATION:", {
        userLat: body.latitude,
        userLng: body.longitude,
        maxDistance: body.distance,
        leadCount: outputLeads.length
      });
      const userLat = Number(body.latitude);
      const userLng = Number(body.longitude);
      const maxDistance = Number(body.distance);

      if (!isNaN(userLat) && !isNaN(userLng) && !isNaN(maxDistance)) {
        console.log("✅ Valid coordinates, processing leads...");
        let processedCount = 0;
        let validCoordCount = 0;
        let withinRangeCount = 0;
        
        outputLeads = outputLeads
          .map((lead) => {
            processedCount++;
            if (lead.latitude && lead.longitude && 
                typeof lead.latitude === 'number' && typeof lead.longitude === 'number') {
              validCoordCount++;
              const distance = haversine(userLat, userLng, lead.latitude, lead.longitude);
              const result = { ...lead, distance };
              console.log(`Lead ${lead.id}: ${distance.toFixed(2)}km (${lead.location})`);
              return result;
            } else {
              console.log(`Lead ${lead.id}: NO COORDINATES (${lead.location})`);
              return null;
            }
          })
          .filter((lead): lead is NonNullable<typeof lead> => {
            if (lead === null) return false;
            if (typeof lead.distance === "number") {
              const isWithin = lead.distance <= maxDistance;
              if (isWithin) withinRangeCount++;
              console.log(`Lead ${lead.id}: ${lead.distance.toFixed(2)}km ${isWithin ? '✅ INCLUDED' : '❌ EXCLUDED'} (max: ${maxDistance}km)`);
              return isWithin;
            }
            return false;
          })
          .sort((a, b) => (a.distance ?? 99999) - (b.distance ?? 99999));
          
        console.log(`📊 Distance filtering results: ${processedCount} total → ${validCoordCount} with coords → ${withinRangeCount} within range`);
      } else {
        console.log("❌ Invalid coordinates:", { userLat, userLng, maxDistance });
      }
    }

    // Filter sensitive information
    const sanitizedLeads = outputLeads.map((lead) => {
      const isOwner = userProfessionalId && lead.professional_id === userProfessionalId;
      if (!isOwner) {
        return {
          ...lead,
          client_name: undefined,
          client_phone: undefined,
          client_address: undefined,
          work_date: undefined,
          work_time: undefined,
          notes: undefined,
          distance: lead.distance
        };
      }
      return {
        ...lead,
        distance: lead.distance
      };
    });


    console.log(`✅ Returning ${sanitizedLeads.length} leads after filtering`);

    return new Response(
      JSON.stringify(sanitizedLeads as Lead[]),
      { headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      }}
    );
  } catch (error) {
    console.error("Error fetching leads:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        }
      }
    );
  }
});

// Helper function to find related categories based on keyword
function findRelatedCategories(keyword: string): string[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const exactCategory = professionCategories.find(
    category => category.value.toLowerCase() === normalizedKeyword ||
               category.label.toLowerCase() === normalizedKeyword ||
               category.synonyms.some(syn => syn.toLowerCase() === normalizedKeyword)
  );
  if (exactCategory) {
    return [exactCategory.value, ...exactCategory.synonyms];
  }
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
    return [...new Set(allMatches)];
  }
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
