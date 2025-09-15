
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export const useAuthState = () => {
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
  
  const stopLoading = () => setIsLoading(false);

  return {
    isLoading,
    showError,
    showSuccess,
    startLoading,
    stopLoading
  };
};
