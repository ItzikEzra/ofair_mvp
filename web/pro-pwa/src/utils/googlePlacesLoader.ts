
import { supabase } from "@/integrations/supabase/client";

export const loadGooglePlacesScript = async (
  setIsLoaded: (loaded: boolean) => void,
  setIsLoading: (loading: boolean) => void,
  scriptLoadedRef: React.MutableRefObject<boolean>,
  showError: (message: string) => void
) => {
  if (window.google && window.google.maps && window.google.maps.places) {
    console.log("Google Places API already loaded");
    setIsLoaded(true);
    return;
  }

  if (scriptLoadedRef.current || document.querySelector('script[src*="maps.googleapis.com"]')) {
    console.log("Google Places API script already loading");
    return;
  }

  console.log("Loading Google Places API script");
  setIsLoading(true);
  scriptLoadedRef.current = true;

  try {
    // Get API key from Edge Function
    const { data: keyData, error: keyError } = await supabase.functions.invoke('google-geocoding', {
      body: { action: 'get-key' }
    });

    if (keyError || !keyData?.apiKey) {
      throw new Error("Failed to get Google API key");
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${keyData.apiKey}&libraries=places&language=he&loading=async&callback=initGooglePlaces`;
    script.async = true;
    script.defer = true;

    // Create callback function
    window.initGooglePlaces = () => {
      console.log("Google Places API script loaded successfully");
      setIsLoaded(true);
      setIsLoading(false);
    };

    script.onerror = (error) => {
      console.error("Failed to load Google Places API:", error);
      setIsLoading(false);
      scriptLoadedRef.current = false;
      showError("לא הצלחנו לטעון את שירות Google Places");
    };

    document.head.appendChild(script);
  } catch (error) {
    console.error("Error loading Google Places script:", error);
    setIsLoading(false);
    scriptLoadedRef.current = false;
    showError("לא הצלחנו לטעון את שירות Google Places");
  }
};
