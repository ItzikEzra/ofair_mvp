import React from 'react';
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
interface OTPInputProps {
  otp: string;
  setOTP: (otp: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  isLoading: boolean;
}
export const OTPInputForm = ({
  otp,
  setOTP,
  onSubmit,
  onBack,
  isLoading
}: OTPInputProps) => {
  return <form onSubmit={onSubmit} className="space-y-6 max-w-sm mx-auto px-4">
      <div className="space-y-4 text-center">
        <Label className="text-xl font-medium">קוד חד פעמי</Label>
        <p className="text-sm text-muted-foreground">
          הזן את הקוד בן 6 הספרות ששלחנו אליך ב-SMS
        </p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOTP}>
            <InputOTPGroup dir="ltr" className="gap-1.5 sm:gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot 
                  key={i} 
                  index={i} 
                  className="w-10 h-12 text-lg sm:w-12 sm:h-14 border-ofair-blue bg-card rounded-lg" 
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <div className="space-y-2 mt-6">
        <Button type="submit" className="w-full bg-ofair-blue hover:bg-ofair-blue/90" disabled={isLoading || otp.length !== 6}>
          {isLoading ? "מאמת..." : "אמת קוד"}
        </Button>
        <Button type="button" variant="outline" className="w-full" onClick={onBack} disabled={isLoading}>
          חזור
        </Button>
      </div>
    </form>;
};