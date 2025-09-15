
import { extractCityFromAddress } from "./cityExtraction.ts";

export const processLocation = (
  location: string | undefined,
  client_address: string | undefined,
  extractedCity?: string | undefined
): string => {
  console.log("🎯 ENHANCED Location processing started with data:", {
    location: location,
    client_address: client_address,
    extractedCity: extractedCity
  });

  // HIGHEST PRIORITY: Google Places extracted city from the form
  // This is the most accurate city information we can get
  if (extractedCity && extractedCity.trim() && extractedCity !== "לא צוין" && extractedCity.length >= 2) {
    const cleanExtractedCity = extractedCity.trim();
    
    // Enhanced validation: make sure it's a proper city name and not a street or full address
    if (!cleanExtractedCity.match(/^[a-zA-Z]{1}$/) && // Not just 1 letter
        !cleanExtractedCity.includes('...') && // Not truncated
        !cleanExtractedCity.includes(',') && // Not a full address with commas
        !cleanExtractedCity.match(/^\d+\s+|בן גוריון|הרצל|רוטשילד|דיזנגוף|אלנבי|יהודה הלוי|רחוב|דרך|שדרות|street|st\.|rd\.|ave\./i)) { // Not street names
      console.log("✅ Using extractedCity from Google Places (HIGHEST PRIORITY):", cleanExtractedCity);
      return cleanExtractedCity;
    } else {
      console.log("⚠️ extractedCity appears to be a street name, full address, or invalid, trying fallback:", cleanExtractedCity);
    }
  }

  // FALLBACK 1: Use location field if it's valid and complete
  if (location && location.trim() && location !== "לא צוין" && location.length >= 3) {
    const cleanLocation = location.trim();
    
    // Enhanced validation: make sure it's not just partial user input
    if (cleanLocation.length >= 3 && 
        !cleanLocation.match(/^[a-zA-Z]{1,2}$/) && // Not just 1-2 letters
        !cleanLocation.includes('...') && // Not truncated
        !cleanLocation.match(/^\d/)) { // Not starting with numbers
      console.log("✅ Using location field (FALLBACK 1):", cleanLocation);
      return cleanLocation;
    } else {
      console.log("⚠️ Location seems like partial input, trying next fallback:", cleanLocation);
    }
  }

  // FALLBACK 2: Extract from address if other methods failed
  if (client_address && client_address.trim()) {
    const extractedCity = extractCityFromAddress(client_address);
    console.log("⚠️ Using fallback extraction from client_address (FALLBACK 2):", extractedCity);
    return extractedCity;
  }

  console.log("❌ No valid location data available, using default");
  return "לא צוין";
};
