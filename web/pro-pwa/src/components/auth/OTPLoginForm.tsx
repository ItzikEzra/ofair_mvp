
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

      // The token is already set in the AuthService, just update auth state
      setIsLoggedIn(true);

      toast({
        title: "התחברות בוצעה בהצלחה",
        description: "מועבר ללוח הבקרה..."
      });

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
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
