
import { Professional } from "@/types/profile";

export interface UserProfile {
  user_id?: string;
  profile_id?: string;
  business_name?: string;
  service_category?: string;
  role?: 'professional' | 'customer' | 'admin' | 'support';
}

export interface AuthState {
  isLoggedIn: boolean | null;
  isLoading: boolean;
  professionalData: Professional | null;
  userProfile: UserProfile | null;
  userRole: string | null;
  logout: () => Promise<void>;
  refreshProfessionalData: () => Promise<boolean>;
  refreshUserProfile: () => Promise<boolean>;
  setIsLoggedIn: (status: boolean) => void;
  isProfessional: () => boolean;
  isAdmin: () => boolean;
}
