
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { ReferralRecord, UserProfile } from "./types.ts";

export async function fetchReferrals(supabaseClient: any, professionalId: string): Promise<ReferralRecord[]> {
  console.log("[REFERRALS] Fetching referrals for professional:", professionalId);
  
  const { data: referrals, error: referralsError } = await supabaseClient
    .from('referrals')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false });
    
  if (referralsError) {
    console.error("[REFERRALS] Error fetching referrals:", referralsError);
    throw new Error(`Database error: ${referralsError.message}`);
  }

  console.log(`[REFERRALS] Found ${referrals?.length || 0} referrals`);
  return referrals || [];
}

export async function fetchUserProfiles(supabaseClient: any, userIds: string[]): Promise<UserProfile[]> {
  if (userIds.length === 0) {
    return [];
  }

  console.log("[REFERRALS] User IDs to fetch:", userIds);
  
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('user_profiles')
    .select('id, name, phone')
    .in('id', userIds);
    
  if (profilesError) {
    console.error("[REFERRALS] Error fetching user profiles:", profilesError);
    return [];
  }

  console.log("[REFERRALS] Fetched user profiles:", profiles?.length || 0);
  return profiles || [];
}
