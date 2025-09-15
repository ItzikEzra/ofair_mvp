import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface IdentifierInputProps {
  identifier: string;
  setIdentifier: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export const IdentifierInput = ({
  identifier,
  setIdentifier,
  onSubmit,
  isLoading
}: IdentifierInputProps) => {
  const [isValidInput, setIsValidInput] = useState(false);

  // Helper to determine if input is a phone number
  const isPhoneNumber = (value: string) => /^\d/.test(value) && !value.includes('@');

  // Format phone number as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // Don't format if it's an email
    if (value.includes('@')) {
      setIdentifier(value);
      return;
    }

    // Only keep digits for phone numbers for validation purposes
    // but maintain user's input format for display
    setIdentifier(value);
  };

  // Validate input whenever it changes
  useEffect(() => {
    const validateInput = () => {
      if (!identifier) {
        setIsValidInput(false);
        return;
      }

      // Check if it's an email
      if (identifier.includes('@')) {
        setIsValidInput(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier));
        return;
      }

      // More permissive phone validation for Israeli numbers
      const phoneDigits = identifier.replace(/\D/g, '');

      // Support multiple Israeli phone formats
      setIsValidInput(
      // Standard Israeli mobile format: 05X-XXX-XXXX or 05XXXXXXXX
      phoneDigits.startsWith('05') && phoneDigits.length >= 9 ||
      // International format with country code: +972, 972
      phoneDigits.startsWith('972') && phoneDigits.length >= 11 ||
      // Short format (without leading 0): 5XXXXXXXX
      phoneDigits.startsWith('5') && phoneDigits.length >= 8 ||
      // Test number for debugging
      identifier === '0545308505');
    };
    validateInput();
  }, [identifier]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidInput) {
      onSubmit(e);
    }
  };

  // Helper function to get appropriate feedback message
  const getFeedbackMessage = () => {
    if (!identifier || isValidInput) return null;
    if (identifier.includes('@')) {
      return "יש להזין כתובת מייל תקינה";
    }
    return "יש להזין מספר טלפון תקין (לדוגמה: 0501234567)";
  };
  return <form onSubmit={handleSubmit} className="space-y-4 text-right" dir="rtl">
      <div className="space-y-2">
        <Label className="block text-right">טלפון</Label>
        <Input type="text" placeholder="הזינו מספר טלפון" value={identifier} onChange={handleInputChange} className={!identifier ? "" : isValidInput ? "border-green-500 text-right" : "border-red-500 text-right"} dir={identifier && identifier.includes('@') ? "ltr" : "rtl"} />
        {getFeedbackMessage() && <p className="text-sm text-red-500 text-right">
            {getFeedbackMessage()}
          </p>}
        {isPhoneNumber(identifier) && <p className="text-sm text-muted-foreground text-right">
            * מספרים תקינים: 05XXXXXXXX, +972-5XXXXXXXX, 05X-XXX-XXXX
          </p>}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading || !isValidInput}>
        {isLoading ? "מתחבר..." : "התחבר"}
      </Button>
    </form>;
};
