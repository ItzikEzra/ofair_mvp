import React, { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { useGooglePlacesAutocomplete } from "@/hooks/useGooglePlacesAutocomplete";

interface GooglePlacesInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: { address: string; lat?: number; lng?: number; placeData?: any; city?: string }) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const GooglePlacesInput: React.FC<GooglePlacesInputProps> = ({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className,
  id
}) => {
  const { isLoaded, initializeAutocomplete, cleanup } = useGooglePlacesAutocomplete();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const listenerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const [internalValue, setInternalValue] = useState(value);
  const [isGoogleSelected, setIsGoogleSelected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const googleValueRef = useRef<string>("");

  // Initialize internal value only once
  useEffect(() => {
    if (!isInitialized) {
      setInternalValue(value);
      setIsInitialized(true);
    }
  }, []);

  // Sync from parent when value changes (for location button updates)
  useEffect(() => {
    if (isInitialized && value !== internalValue) {
      // If this matches our stored Google selection, maintain the Google flag
      if (value === googleValueRef.current && isGoogleSelected) {
        setInternalValue(value);
      } else if (!isGoogleSelected) {
        // Only update from parent if we're not in the middle of a Google selection
        setInternalValue(value);
      }
    }
    
    // Allow clearing from parent
    if (value === "" && internalValue !== "") {
      setInternalValue("");
      setIsGoogleSelected(false);
      googleValueRef.current = "";
    }
  }, [value]);

  
  const handlePlaceSelect = useCallback((place: any) => {
    console.log('🔥 GooglePlacesInput: handlePlaceSelect called with:', place);
    const fullAddress = place.address || "לא צוין";
    
    // Mark as Google-selected and store the value
    setIsGoogleSelected(true);
    setInternalValue(fullAddress);
    googleValueRef.current = fullAddress;
    
    console.log('🔥 GooglePlacesInput: Updated internal state, calling callbacks');
    
    // Notify parent about place selection with all details for coordinate/city extraction
    if (onPlaceSelect) {
      console.log('🔥 GooglePlacesInput: Calling onPlaceSelect');
      onPlaceSelect({
        address: place.address,
        lat: place.coordinates?.lat,
        lng: place.coordinates?.lng,
        placeData: place.placeData,
        city: place.city
      });
    }
    
    // Call onChange to sync with parent form state
    console.log('🔥 GooglePlacesInput: Calling onChange with:', fullAddress);
    onChange(fullAddress);
  }, [onPlaceSelect, onChange]);

  // Initialize autocomplete when Google is loaded - ONLY ONCE PER COMPONENT LIFECYCLE
  useEffect(() => {
    // Check if the current input element already has an autocomplete attached
    const hasAutocompleteAttached = inputRef.current && inputRef.current.hasAttribute('data-autocomplete-attached');
    
    if (isLoaded && inputRef.current && !isInitializedRef.current && !hasAutocompleteAttached) {
      console.log('🔥 GooglePlacesInput: Initializing autocomplete with callback:', !!handlePlaceSelect);
      listenerRef.current = initializeAutocomplete(inputRef.current, handlePlaceSelect);
      autocompleteRef.current = true;
      isInitializedRef.current = true;
      
      // Mark the input element as having autocomplete attached
      inputRef.current.setAttribute('data-autocomplete-attached', 'true');
      
      console.log('🔥 GooglePlacesInput: Autocomplete initialization completed and marked as initialized');
    } else if (isLoaded && inputRef.current && (isInitializedRef.current || hasAutocompleteAttached)) {
      console.log('🔥 GooglePlacesInput: Skipping reinitialization - already initialized or attached');
    }
  }, [isLoaded, handlePlaceSelect]);

  // Cleanup on unmount - but DON'T remove from global map to prevent interference
  useEffect(() => {
    return () => {
      if (listenerRef.current && window.google) {
        window.google.maps.event.removeListener(listenerRef.current);
      }
      
      // Remove the autocomplete attached marker
      if (inputRef.current) {
        inputRef.current.removeAttribute('data-autocomplete-attached');
      }
      
      autocompleteRef.current = null;
      isInitializedRef.current = false;
      // DON'T call cleanup to avoid removing from global map during usage
      // cleanup(inputRef.current);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // If user starts typing after Google selection, reset the Google flag
    if (isGoogleSelected && newValue !== googleValueRef.current) {
      setIsGoogleSelected(false);
      googleValueRef.current = "";
    }
    
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <Input
      ref={inputRef}
      id={id}
      value={internalValue}
      onChange={handleInputChange}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
};
