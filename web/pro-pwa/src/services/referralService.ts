/**
 * Legacy Referral Service Wrapper
 * Redirects to FastAPI ReferralsService for backward compatibility
 */

import ReferralsService from './referralsService';
import { DirectInquiryType } from "@/types/jobs";

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

    console.log(`Updating referral ${idAsString} to status: ${newStatus}`);

    // Map the status to the FastAPI status enum
    let fastApiStatus: 'pending' | 'accepted' | 'rejected' | 'completed';
    switch (newStatus) {
      case 'contacted':
      case 'accepted':
        fastApiStatus = 'accepted';
        break;
      case 'completed':
        fastApiStatus = 'completed';
        break;
      case 'rejected':
        fastApiStatus = 'rejected';
        break;
      default:
        fastApiStatus = 'pending';
    }

    // Update using FastAPI service
    await ReferralsService.updateReferralStatus(idAsString, fastApiStatus);

    console.log(`Successfully updated referral ${idAsString}`);
    return true;

  } catch (error) {
    console.error("Error updating referral status:", error);
    return false;
  }
}

export async function acceptReferral(referralId: string | number): Promise<boolean> {
  try {
    const idAsString = typeof referralId === 'number' ? referralId.toString() : referralId;
    await ReferralsService.acceptReferral(idAsString);
    return true;
  } catch (error) {
    console.error("Error accepting referral:", error);
    return false;
  }
}

export async function rejectReferral(referralId: string | number): Promise<boolean> {
  try {
    const idAsString = typeof referralId === 'number' ? referralId.toString() : referralId;
    await ReferralsService.rejectReferral(idAsString);
    return true;
  } catch (error) {
    console.error("Error rejecting referral:", error);
    return false;
  }
}

export async function getReferrals(): Promise<{ data: any[] | null; error: string | null }> {
  try {
    const response = await ReferralsService.getMyReferrals();
    return {
      data: response.referrals,
      error: null
    };
  } catch (error) {
    console.error('Error fetching referrals:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch referrals'
    };
  }
}

// Export for backward compatibility
export { ReferralsService };
export default ReferralsService;