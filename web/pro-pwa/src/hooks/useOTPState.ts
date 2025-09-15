
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Professional } from "@/types/profile";

export const useOTPState = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const showError = (title: string, description: string) => {
    toast({
      title,
      description,
      variant: "destructive"
    });
    setIsLoading(false);
  };

  const showSuccess = (title: string, description: string) => {
    toast({
      title,
      description
    });
    setIsLoading(false);
  };

  const startLoading = () => setIsLoading(true);

  return {
    isLoading,
    showError,
    showSuccess,
    startLoading
  };
};
