
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Professional } from "@/types/profile";
import { AuthService } from "@/services/authService";

export const useOTPAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendOTP = async (identifier: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      console.log('[OTP_AUTH] Starting sendOTP for identifier:', identifier);

      if (identifier.includes('@')) {
        console.log('[OTP_AUTH] Email detected, rejecting');
        toast({ title: "כניסה באמצעות מייל", description: "כרגע ניתן להכנס רק עם מספר טלפון", variant: "destructive" });
        return false;
      }

      console.log('[OTP_AUTH] Calling AuthService.sendOtp');
      const response = await AuthService.sendOtp({ contact: identifier, language: 'he' });

      console.log('[OTP_AUTH] Response from send-otp:', response);

      if (!response.success) {
        console.error('Error sending OTP:', response);

        // Check if it's a "user not registered" error
        if (response.message_he && response.message_he.includes("לא רשום במערכת")) {
          toast({
            title: "משתמש לא רשום",
            description: response.message_he,
            variant: "destructive"
          });
        } else {
          toast({
            title: "שגיאה בשליחת קוד",
            description: response.message_he || "לא ניתן היה לשלוח קוד אימות.",
            variant: "destructive"
          });
        }
        return false;
      }

      toast({ title: "קוד נשלח", description: "קוד אימות נשלח למספר הטלפון שלך." });
      return true;

    } catch (error) {
      console.error('Unexpected error sending OTP:', error);
      toast({ title: "שגיאה", description: "אירעה שגיאה בלתי צפויה.", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (identifier: string, otp: string): Promise<{ professional: Professional; token: string; expiresAt: string } | null> => {
    setIsLoading(true);
    try {
      const response = await AuthService.verifyOtp({ contact: identifier, otp });

      if (!response.success || !response.token_data) {
        console.error('Error verifying OTP:', response.message);
        toast({ title: "קוד לא תקין", description: response.message_he || "הקוד שהזנת שגוי או פג תוקף. נסה שוב.", variant: "destructive" });
        return null;
      }

      if (!response.token_data.access_token) {
        console.error('No auth token received from verify-otp');
        toast({ title: "שגיאה", description: "לא ניתן היה ליצור הפעלה אוטומטית.", variant: "destructive" });
        return null;
      }

      // Create professional object from token data and user info
      const professional: Professional = {
        id: response.token_data.user_id,
        name: identifier, // We'll get the real name from the backend later
        phone: identifier,
        email: '', // We'll get this from the backend
        businessName: '',
        profession: '',
        experienceYears: 0,
        serviceArea: '',
        description: '',
        rating: 0,
        totalReviews: 0,
        verified: false
      };

      return {
        professional,
        token: response.token_data.access_token,
        expiresAt: new Date(Date.now() + response.token_data.expires_in * 1000).toISOString()
      };

    } catch (error) {
      console.error('Unexpected error verifying OTP:', error);
      toast({ title: "שגיאה", description: "אירעה שגיאה בלתי צפויה.", variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    sendOTP,
    verifyOTP,
  };
};
