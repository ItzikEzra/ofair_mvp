
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { PlaceResult } from "@/types/googlePlaces";
import { loadGooglePlacesScript } from "@/utils/googlePlacesLoader";
import { 
  initializeGooglePlacesAutocomplete, 
  cleanupGooglePlacesAutocomplete 
} from "@/utils/googlePlacesAutocomplete";

export const useGooglePlacesAutocomplete = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const autocompleteRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  const showError = (description: string) => {
    toast({
      title: "שגיאה",
      description,
      variant: "destructive"
    });
  };

  const initializeAutocomplete = (
    inputElement: HTMLInputElement,
    onPlaceSelect: (place: PlaceResult) => void
  ) => {
    return initializeGooglePlacesAutocomplete(inputElement, onPlaceSelect, autocompleteRef);
  };

  const cleanup = (inputElement?: HTMLInputElement) => {
    cleanupGooglePlacesAutocomplete(autocompleteRef, inputElement);
  };

  useEffect(() => {
    loadGooglePlacesScript(setIsLoaded, setIsLoading, scriptLoadedRef, showError);
    
    return cleanup;
  }, []);

  return {
    isLoaded,
    isLoading,
    initializeAutocomplete,
    cleanup
  };
};
