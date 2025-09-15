
import { DirectInquiryType } from "@/types/jobs";
import { supabase } from "@/integrations/supabase/client";

export async function updateReferralStatus(
  referralId: string | number, 
  isContacted: boolean,
  status?: string
): Promise<boolean> {
  try {
    // Convert the isContacted boolean to the appropriate status
    let newStatus = status || (isContacted ? 'contacted' : 'new');
    
    // Convert referralId to string if it's a number
    const idAsString = typeof referralId === 'number' ? referralId.toString() : referralId;
    
    // Update the referral's status in the database
    const { error } = await supabase
      .from('referrals')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', idAsString);
    
    if (error) {
      console.error("Error updating referral status:", error);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error("Unexpected error updating referral status:", err);
    return false;
  }
}
