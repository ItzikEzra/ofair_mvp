
import { PlaceResult } from "@/types/googlePlaces";
import { extractCityFromPlace } from "./cityExtraction";

// Global singleton to track autocomplete instances
const autocompleteInstances = new Map<HTMLInputElement, any>();

export const initializeGooglePlacesAutocomplete = (
  inputElement: HTMLInputElement,
  onPlaceSelect: (place: PlaceResult) => void,
  autocompleteRef: React.MutableRefObject<any>
) => {
  if (!window.google || !window.google.maps || !window.google.maps.places) {
    console.error("Google Places API not loaded");
    return;
  }

  // Check if this input already has an autocomplete instance
  if (autocompleteInstances.has(inputElement)) {
    console.log('🔥 Reusing existing autocomplete instance for input element');
    const existingInstance = autocompleteInstances.get(inputElement);
    autocompleteRef.current = existingInstance.autocomplete;
    
    // Re-setup the listener with the new callback
    if (existingInstance.listener && window.google) {
      window.google.maps.event.removeListener(existingInstance.listener);
    }
    
    const newListener = existingInstance.autocomplete.addListener('place_changed', () => {
      console.log('🚀 place_changed event fired (reused instance)!');
      setTimeout(() => {
        const place = existingInstance.autocomplete.getPlace();
        if (place.geometry && place.formatted_address) {
          const city = extractCityFromPlace(place);
          const result: PlaceResult = {
            address: place.formatted_address,
            placeId: place.place_id,
            coordinates: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            placeData: place,
            city: city
          };
          onPlaceSelect(result);
        }
      }, 10);
    });
    
    // Update the stored listener
    existingInstance.listener = newListener;
    
    return newListener;
  }

  try {
    console.log("Initializing Google Places Autocomplete");
    
    if (autocompleteRef.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputElement, {
      types: ['address'],
      componentRestrictions: { country: 'il' },
      fields: ['formatted_address', 'place_id', 'geometry', 'address_components']
    });
    
    // Set bounds to Israel for better suggestions
    const israelBounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(29.5013261, 34.2654333),
      new window.google.maps.LatLng(33.2774264, 35.8363991)
    );
    autocompleteRef.current.setBounds(israelBounds);

    let lastProcessedPlaceId = '';
    
    const handlePlaceSelection = () => {
      console.log('🚀 handlePlaceSelection called');
      const place = autocompleteRef.current.getPlace();
      console.log("🚀 Place selected from Google Places:", place);
      console.log('🚀 Place has geometry:', !!place.geometry);
      console.log('🚀 Place has formatted_address:', !!place.formatted_address);
      
      if (!place.geometry || !place.formatted_address) {
        console.log("❌ No geometry or address for selected place");
        return;
      }

      // Prevent duplicate processing of the same place
      if (place.place_id === lastProcessedPlaceId) {
        console.log("🚫 Duplicate place selection, skipping");
        return;
      }
      lastProcessedPlaceId = place.place_id;

      const city = extractCityFromPlace(place);
      console.log("🎯 FINAL EXTRACTED CITY FOR SUBMISSION:", city);

      const result: PlaceResult = {
        address: place.formatted_address,
        placeId: place.place_id,
        coordinates: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        },
        placeData: place,
        city: city
      };

      console.log("✅ About to call onPlaceSelect with result:", result);
      console.log('🚀 onPlaceSelect function exists:', !!onPlaceSelect);
      if (onPlaceSelect) {
        onPlaceSelect(result);
        console.log("✅ onPlaceSelect called successfully");
      } else {
        console.error('❌ onPlaceSelect callback is missing!');
      }
    };

    // Primary listener for place selection
    console.log('🚀 Setting up place_changed listener with callback:', !!onPlaceSelect);
    const listener = autocompleteRef.current.addListener('place_changed', () => {
      console.log('🚀 place_changed event fired!');
      // Use a small delay to ensure the place data is fully loaded
      setTimeout(handlePlaceSelection, 10);
    });

    // Store the instance in our global map
    autocompleteInstances.set(inputElement, {
      autocomplete: autocompleteRef.current,
      listener: listener
    });

    console.log("Google Places Autocomplete initialized successfully");
    return listener;
  } catch (error) {
    console.error("Error initializing Google Places Autocomplete:", error);
  }
};

export const cleanupGooglePlacesAutocomplete = (
  autocompleteRef: React.MutableRefObject<any>,
  inputElement?: HTMLInputElement
) => {
  if (autocompleteRef.current && window.google) {
    window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
    autocompleteRef.current = null;
  }
  
  // Remove from global map if input element is provided
  if (inputElement && autocompleteInstances.has(inputElement)) {
    console.log('🔥 Removing autocomplete instance from global map');
    autocompleteInstances.delete(inputElement);
  }
};
