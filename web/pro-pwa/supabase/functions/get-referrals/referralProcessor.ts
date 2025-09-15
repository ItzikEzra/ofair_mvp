
import type { ProcessReferralOptions, FormattedReferral } from "./types.ts";

export function processReferral({ referral, userProfile, index }: ProcessReferralOptions): FormattedReferral {
  console.log(`[REFERRALS] Processing referral ${index + 1}`);
  
  try {
    // Only show consumer data, never professional data
    let clientName = 'צרכן לא ידוע';
    let clientPhone = 'טלפון לא ידוע';
    
    if (referral.user_id) {
      // If there's a user_id, try to get data from user_profiles
      if (userProfile?.name) {
        clientName = userProfile.name;
      } else {
        clientName = 'צרכן לא רשום במערכת';
      }
      
      if (userProfile?.phone) {
        clientPhone = userProfile.phone;
      } else if (referral.phone_number) {
        clientPhone = referral.phone_number;
      }
    } else {
      // If there's no user_id, it's an external referral - show available phone only
      if (referral.phone_number) {
        clientPhone = referral.phone_number;
        clientName = 'צרכן חיצוני';
      }
    }
    
    const service = referral.profession || 'שירות לא צוין';
    
    // Safe date handling
    let displayDate = 'תאריך לא ידוע';
    try {
      if (referral.date) {
        displayDate = new Date(referral.date).toLocaleDateString('he-IL');
      } else if (referral.created_at) {
        displayDate = new Date(referral.created_at).toLocaleDateString('he-IL');
      }
    } catch (dateError) {
      console.warn(`[REFERRALS] Date parsing error for referral ${referral.id}`);
      displayDate = 'תאריך לא ידוע';
    }
    
    return {
      id: referral.id,
      client: clientName,
      phoneNumber: clientPhone,
      date: displayDate,
      service: service,
      isContacted: referral.status === 'contacted' || referral.status === 'completed' || referral.status === 'accepted_quote',
      isClosed: referral.status === 'completed' || referral.completed_work === true,
    };
    
  } catch (processingError) {
    console.error(`[REFERRALS] Error processing referral ${index + 1}:`, processingError);
    // Return a safe fallback object
    return {
      id: referral.id || `unknown-${index}`,
      client: 'צרכן לא ידוע',
      phoneNumber: 'טלפון לא ידוע',
      date: 'תאריך לא ידוע',
      service: 'שירות לא צוין',
      isContacted: false,
      isClosed: false,
    };
  }
}
