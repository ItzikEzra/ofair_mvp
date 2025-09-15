
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

      if (!response.data.success) {
        console.error('Error sending OTP:', response.data);

        // Check if it's a "user not registered" error
        if (response.data.message_he && response.data.message_he.includes("לא רשום במערכת")) {
          toast({
            title: "משתמש לא רשום",
            description: response.data.message_he,
            variant: "destructive"
          });
        } else {
          toast({
            title: "שגיאה בשליחת קוד",
            description: response.data.message_he || "לא ניתן היה לשלוח קוד אימות.",
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

      if (!response.data.success || !response.data.token_data) {
        console.error('Error verifying OTP:', response.data.message);
        toast({ title: "קוד לא תקין", description: response.data.message_he || "הקוד שהזנת שגוי או פג תוקף. נסה שוב.", variant: "destructive" });
        return null;
      }

      if (!response.data.token_data.access_token) {
        console.error('No auth token received from verify-otp');
        toast({ title: "שגיאה", description: "לא ניתן היה ליצור הפעלה אוטומטית.", variant: "destructive" });
        return null;
      }

      return {
        professional: response.data.user as Professional,
        token: response.data.token_data.access_token,
        expiresAt: response.data.token_data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
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
