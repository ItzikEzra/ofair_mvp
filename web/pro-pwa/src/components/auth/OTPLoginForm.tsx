
import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useOTPAuth } from "@/hooks/useOTPAuth";
import { IdentifierInput } from "./IdentifierInput";
import { OTPInputForm } from "./OTPInput";
import { useAuth } from '@/contexts/auth/AuthContext';
import { saveProfessionalData, clearProfessionalDataOnly, saveAuthToken, getAuthToken } from "@/utils/storageUtils";
import { useNavigate } from 'react-router-dom';

export const OTPLoginForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const { isLoading, sendOTP, verifyOTP } = useOTPAuth();
  const { setIsLoggedIn, refreshProfessionalData } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await sendOTP(identifier);
    if (success) {
      setIsOtpSent(true);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const response = await verifyOTP(identifier, otp);

    if (response) {
      console.log("[OTP_LOGIN] Received response from verifyOTP:", {
        professionalId: response.professional?.id,
        tokenLength: response.token ? response.token.length : 0,
        expiresAt: response.expiresAt
      });
      
      // Clear old data first (but preserve any existing auth tokens)
      clearProfessionalDataOnly();
      
      // Save professional data and auth token
      console.log("[OTP_LOGIN] Saving professional data...");
      const saveDataResult = saveProfessionalData(response.professional);
      console.log("[OTP_LOGIN] Professional data save result:", saveDataResult);
      
      console.log("[OTP_LOGIN] Saving auth token...");
      const saveTokenResult = saveAuthToken(response.token, response.expiresAt);
      console.log("[OTP_LOGIN] Auth token save result:", saveTokenResult);
      
      // Verify token was saved before proceeding
      setTimeout(() => {
        const verifyToken = getAuthToken();
        console.log("[OTP_LOGIN] Token verification after save:", {
          tokenExists: !!verifyToken,
          tokenLength: verifyToken ? verifyToken.length : 0
        });
        
        if (verifyToken) {
          setIsLoggedIn(true);
          refreshProfessionalData();
          
          toast({
            title: "התחברות בוצעה בהצלחה",
            description: "מועבר ללוח הבקרה..."
          });
          
          // Use navigate instead of window.location.href to avoid page reload
          navigate('/dashboard', { replace: true });
        } else {
          console.error("[OTP_LOGIN] Token verification failed after save");
          toast({
            title: "שגיאה בהתחברות",
            description: "אנא נסה שוב",
            variant: "destructive"
          });
        }
      }, 200);
    }
  };

  const handleBack = () => {
    setIsOtpSent(false);
    setOtp('');
  };

  if (!isOtpSent) {
    return (
      <div className="space-y-4 rtl" dir="rtl">
        <IdentifierInput
          identifier={identifier}
          setIdentifier={setIdentifier}
          onSubmit={handleSendCode}
          isLoading={isLoading}
        />
        <div className="text-sm text-muted-foreground mt-2 text-center">
          * יש להזין מספר טלפון נייד שרשום במערכת
        </div>
      </div>
    );
  }

  return (
    <OTPInputForm
      otp={otp}
      setOTP={setOtp}
      onSubmit={handleVerifyCode}
      onBack={handleBack}
      isLoading={isLoading}
    />
  );
};

export default OTPLoginForm;
