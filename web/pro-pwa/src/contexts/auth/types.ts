
import { Professional } from "@/types/profile";

export interface AuthState {
  isLoggedIn: boolean | null;
  isLoading: boolean;
  professionalData: Professional | null;
  logout: () => Promise<void>;
  refreshProfessionalData: () => Promise<boolean>;
  setIsLoggedIn: (status: boolean) => void;
}
