
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchReferrals, fetchUserProfiles } from "./referralData.ts";
import { processReferral } from "./referralProcessor.ts";
import { createResponse, createErrorResponse, createCorsResponse } from "./responseUtils.ts";
import type { FormattedReferral } from "./types.ts";

serve(async (req) => {
  console.log(`[REFERRALS] ${req.method} request received`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createCorsResponse();
  }

  try {
    // Use service role key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get request body
    const requestBody = await req.json();
    console.log(`[REFERRALS] Request body:`, JSON.stringify(requestBody, null, 2));
    
    const professionalId = requestBody.professionalId || requestBody.professional_id;
    console.log(`[REFERRALS] Processing for professional: ${professionalId}`);

    if (!professionalId) {
      console.error("[REFERRALS] Missing professional ID");
      return createErrorResponse("Professional ID is required", null, 400);
    }

    // Get referrals for the professional
    const referrals = await fetchReferrals(supabaseClient, professionalId);

    if (referrals.length === 0) {
      console.log("[REFERRALS] No referrals found, returning empty array");
      return createResponse([]);
    }

    // Get user profile data for referrals that have user_id
    const userIds = referrals
      .filter(referral => referral.user_id)
      .map(referral => referral.user_id);
    
    const userProfiles = await fetchUserProfiles(supabaseClient, userIds);

    // Format the referrals data for the frontend
    const formattedReferrals: FormattedReferral[] = referrals.map((referral, index) => {
      // Find matching user profile data
      const userProfile = userProfiles.find(profile => profile.id === referral.user_id);
      
      return processReferral({ referral, userProfile, index });
    });

    console.log(`[REFERRALS] Returning ${formattedReferrals.length} formatted referrals`);
    
    return createResponse(formattedReferrals);
  } catch (err) {
    console.error("[REFERRALS] Unexpected error:", err);
    return createErrorResponse(
      "Internal server error", 
      { message: err.message, stack: err.stack }
    );
  }
});
