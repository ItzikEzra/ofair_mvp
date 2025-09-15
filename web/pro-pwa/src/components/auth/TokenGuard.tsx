import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTokenManager } from "@/hooks/useTokenManager";
import { getAuthToken } from "@/utils/storageUtils";

interface TokenGuardProps {
  children: React.ReactNode;
  requireToken?: boolean;
  fallbackMessage?: string;
}

export const TokenGuard: React.FC<TokenGuardProps> = ({ 
  children, 
  requireToken = true,
  fallbackMessage = "אנא התחבר למערכת לצפייה בתוכן זה"
}) => {
  const [hasValidToken, setHasValidToken] = useState<boolean | null>(null);
  const { validateTokenAndRefresh, handleTokenExpiry } = useTokenManager();

  useEffect(() => {
    const checkToken = async () => {
      const token = getAuthToken();
      
      if (!token) {
        setHasValidToken(false);
        return;
      }

      const isValid = await validateTokenAndRefresh();
      setHasValidToken(isValid);
    };

    if (requireToken) {
      checkToken();
    } else {
      setHasValidToken(true);
    }
  }, [requireToken, validateTokenAndRefresh]);

  if (!requireToken) {
    return <>{children}</>;
  }

  if (hasValidToken === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin h-6 w-6 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full mb-2"></div>
          <p className="text-muted-foreground">בודק תקפות הטוכן...</p>
        </div>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="p-4">
        <Alert>
          <AlertDescription className="flex flex-col gap-3">
            <span>{fallbackMessage}</span>
            <Button 
              onClick={handleTokenExpiry}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              התחבר למערכת
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
};