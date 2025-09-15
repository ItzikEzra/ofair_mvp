
export interface ReferralRecord {
  id: string;
  user_id?: string;
  professional_id: string;
  phone_number: string;
  profession?: string;
  date?: string;
  created_at: string;
  status?: string;
  completed_work?: boolean;
}

export interface UserProfile {
  id: string;
  name?: string;
  phone?: string;
}

export interface FormattedReferral {
  id: string;
  client: string;
  phoneNumber: string;
  date: string;
  service: string;
  isContacted: boolean;
  isClosed: boolean;
}

export interface ProcessReferralOptions {
  referral: ReferralRecord;
  userProfile?: UserProfile;
  index: number;
}
