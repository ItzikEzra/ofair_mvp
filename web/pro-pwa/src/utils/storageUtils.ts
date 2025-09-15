
import { Professional } from "@/types/profile";

const AUTH_TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRES_KEY = 'token_expires';

export const validateProfessionalData = (data: any): data is Professional => {
  if (!data) {
    console.error("No professional data provided");
    return false;
  }
  if (typeof data !== 'object') {
    console.error("Professional data is not an object");
    return false;
  }
  
  // Check essential fields
  if (!data.id) {
    console.error("Missing professional ID");
    return false;
  }
  if (!data.name) {
    console.error("Missing professional name");
    return false;
  }
  
  return true;
};

export const saveProfessionalData = (professionalData: Professional) => {
  if (!professionalData?.id) {
    console.error("Cannot save professional data: Missing ID", professionalData);
    return false;
  }

  try {
    if (!validateProfessionalData(professionalData)) {
      console.error("Invalid professional data structure:", professionalData);
      return false;
    }

    // Clear existing professional data (but preserve auth tokens)
    clearProfessionalDataOnly();
    
    // Store each piece separately to make troubleshooting easier
    localStorage.setItem("professionalId", String(professionalData.id));
    localStorage.setItem("rememberAuth", "true");
    localStorage.setItem("professionalData", JSON.stringify(professionalData));
    localStorage.setItem("lastLogin", new Date().toISOString());
    
    // Set OTP flag if phone number is present
    if (professionalData.phone_number) {
      localStorage.setItem("otpAuth", "true");
    }
    
    console.log("Successfully saved professional data:", {
      id: professionalData.id,
      name: professionalData.name,
      profession: professionalData.profession
    });
    
    return true;
  } catch (error) {
    console.error("Error saving professional data:", error);
    return false;
  }
};

// Clear professional data only (preserve auth tokens)
export const clearProfessionalDataOnly = () => {
  console.log("Clearing professional data only (preserving auth tokens)");
  
  try {
    // Clear only professional-related items, not auth tokens
    const keysToRemove = [
      "rememberAuth",
      "professionalData", 
      "professionalId",
      "lastLogin",
      "otpAuth",
      "dashboard-initialized",
      "dashboard-loading-complete"
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.error(`Error clearing ${key}:`, e);
      }
    });
    
    console.log("Professional data cleared (auth tokens preserved)");
    return true;
  } catch (error) {
    console.error("Error clearing professional data:", error);
    return false;
  }
};

export const clearProfessionalData = () => {
  console.log("Clearing professional data from storage");
  
  try {
    // נקה כל דגלים שעלולים לגרום ללולאות אינסופיות
    try {
      if (localStorage.getItem("redirectAttempted") === "true") {
        localStorage.removeItem("redirectAttempted");
      }
      
      if (localStorage.getItem("isInitializing") === "true") {
        localStorage.removeItem("isInitializing");
      }
    } catch (e) {
      console.error("Error cleaning up flags:", e);
    }
    
    // Clear auth token first
    clearAuthToken();
    
    // First clear relevant items specifically
    const keysToRemove = [
      "rememberAuth",
      "professionalData", 
      "professionalId",
      "lastLogin",
      "otpAuth",
      "supabase.auth.token",
      "access_token",
      "refresh_token",
      // Add any other auth-related keys
      "sb-erlfsougrkzbgonumhoa-auth-token",
      "sb-access-token",
      "sb-refresh-token",
      "supabase.auth.refreshToken",
      "supabase.auth.accessToken",
      "supabase.auth.event",
      "supabase.auth.token.refresh-token",
      "supabase.auth.token.access-token",
      "dashboard-initialized",
      "dashboard-loading-complete",
      AUTH_TOKEN_KEY,
      TOKEN_EXPIRES_KEY
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        console.error(`Error clearing ${key}:`, e);
      }
    });
    
    // Then try to clear everything else from local storage that might be auth related
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('auth') || 
            key.includes('supabase') || 
            key.includes('professional') ||
            key.includes('token') ||
            key.includes('sb-') ||
            key.includes('otp')) {
          console.log(`Removing localStorage key: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing localStorage:", e);
    }
    
    // Try doing the same for session storage
    try {
      const allSessionKeys = Object.keys(sessionStorage);
      allSessionKeys.forEach(key => {
        if (key.includes('auth') || 
            key.includes('supabase') || 
            key.includes('professional') ||
            key.includes('token') ||
            key.includes('sb-') ||
            key.includes('otp')) {
          console.log(`Removing sessionStorage key: ${key}`);
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing sessionStorage:", e);
    }
    
    // Verify clearing worked
    const professionalDataAfterClear = localStorage.getItem("professionalData");
    const professionalIdAfterClear = localStorage.getItem("professionalId");
    const rememberAuthAfterClear = localStorage.getItem("rememberAuth");
    const otpAuthAfterClear = localStorage.getItem("otpAuth");
    
    console.log("All professional and session data cleared. Verification check:", {
      professionalDataRemains: !!professionalDataAfterClear,
      professionalIdRemains: !!professionalIdAfterClear,
      rememberAuthRemains: !!rememberAuthAfterClear,
      otpAuthRemains: !!otpAuthAfterClear
    });
    
    return !professionalDataAfterClear && !professionalIdAfterClear;
  } catch (error) {
    console.error("Error during storage cleanup:", error);
    return false;
  }
};

export const getProfessionalData = (): Professional | null => {
  try {
    const data = localStorage.getItem("professionalData");
    if (!data) {
      console.log("No professional data found in storage");
      return null;
    }
    
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      console.error("Invalid JSON in professionalData:", e);
      clearProfessionalData(); // Clean up corrupted data
      return null;
    }
    
    if (!validateProfessionalData(parsed)) {
      console.error("Invalid stored professional data, missing required fields:", parsed);
      clearProfessionalData();
      return null;
    }
    
    // Check if the data is stale (24 hours)
    const lastLogin = localStorage.getItem("lastLogin");
    if (lastLogin) {
      const loginTime = new Date(lastLogin).getTime();
      const currentTime = new Date().getTime();
      const hoursSinceLogin = (currentTime - loginTime) / (1000 * 60 * 60);
      
      if (hoursSinceLogin > 24) {
        console.log("Professional data is stale (>24h), consider refreshing");
      }
    }
    
    console.log("Successfully retrieved professional data for:", parsed.name);
    return parsed;
  } catch (error) {
    console.error("Error retrieving professional data:", error);
    clearProfessionalData();
    return null;
  }
};

// Token management functions
export const saveAuthToken = (token: string, expiresAt?: string) => {
  try {
    console.log("[AUTH_TOKEN] Saving auth token");
    
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    if (expiresAt) {
      localStorage.setItem(TOKEN_EXPIRES_KEY, expiresAt);
    }
    
    // Force localStorage flush (synchronous operation)
    try {
      localStorage.getItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.warn("[AUTH_TOKEN] localStorage access issue during verification");
    }
    
    // Verify token was saved with retry mechanism
    let verificationAttempts = 0;
    const maxAttempts = 3;
    
    while (verificationAttempts < maxAttempts) {
      const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      const savedExpiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
      
      if (savedToken === token) {
        console.log("[AUTH_TOKEN] Token save verification successful:", {
          tokenSaved: "Yes",
          expiresAtSaved: savedExpiresAt ? "Yes" : "No",
          attempts: verificationAttempts + 1
        });
        return true;
      }
      
      verificationAttempts++;
      if (verificationAttempts < maxAttempts) {
        // Wait a bit before retrying
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for 10ms
        }
      }
    }
    
    console.error("[AUTH_TOKEN] Token verification failed after", maxAttempts, "attempts");
    return false;
  } catch (error) {
    console.error("[AUTH_TOKEN] Error saving auth token:", error);
    return false;
  }
};

export const getAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiresAt = localStorage.getItem(TOKEN_EXPIRES_KEY);
    
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    if (expiresAt) {
      const expirationDate = new Date(expiresAt);
      const currentDate = new Date();
      
      if (expirationDate < currentDate) {
        console.log("[AUTH_TOKEN] Token expired, clearing");
        clearAuthToken();
        return null;
      }
    }
    
    return token;
  } catch (error) {
    console.error("[AUTH_TOKEN] Error retrieving auth token:", error);
    return null;
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRES_KEY);
    console.log("Auth token cleared");
    return true;
  } catch (error) {
    console.error("Error clearing auth token:", error);
    return false;
  }
};
