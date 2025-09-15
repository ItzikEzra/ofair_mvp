
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Professional } from "@/types/profile";

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

      console.log('[OTP_AUTH] Calling supabase.functions.invoke for send-otp');
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: identifier },
      });
      
      console.log('[OTP_AUTH] Response from send-otp:', { data, error });

      if (error) {
        console.error('Error sending OTP:', JSON.stringify(error, null, 2));
        toast({ title: "שגיאה בשליחת קוד", description: "לא ניתן היה לשלוח קוד אימות. ודא שהמספר נכון ורשום במערכת.", variant: "destructive" });
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
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone: identifier, otp },
      });

      if (error || !data.professional) {
        console.error('Error verifying OTP:', JSON.stringify(error, null, 2));
        toast({ title: "קוד לא תקין", description: "הקוד שהזנת שגוי או פג תוקף. נסה שוב.", variant: "destructive" });
        return null;
      }

      if (!data.token) {
        console.error('No auth token received from verify-otp');
        toast({ title: "שגיאה", description: "לא ניתן היה ליצור הפעלה אוטומטית.", variant: "destructive" });
        return null;
      }

      return {
        professional: data.professional as Professional,
        token: data.token,
        expiresAt: data.expiresAt
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
