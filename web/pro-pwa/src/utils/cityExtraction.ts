
import { CityExtractionRule } from "@/types/googlePlaces";

export const extractCityFromPlace = (place: any): string => {
  console.log("🎯 ENHANCED: Extracting city from Google Places result:", place);
  
  if (!place || !place.address_components) {
    console.log("❌ No place data or address_components found in place");
    return "לא צוין";
  }
  
  // Log all address components for debugging
  console.log("📍 All address components:", place.address_components.map((comp: any) => ({
    name: comp.long_name,
    types: comp.types
  })));
  
  // CRITICAL FIX: Enhanced Israeli city extraction with better priority and validation
  const cityExtractionRules: CityExtractionRule[] = [
    // Primary city identifiers - highest priority
    { types: ['locality'], priority: 1, label: "locality (עיר)" },
    { types: ['administrative_area_level_2'], priority: 2, label: "admin_area_level_2 (מחוז)" },
    { types: ['sublocality_level_1'], priority: 3, label: "sublocality_1 (תת-עיר)" },
    { types: ['sublocality'], priority: 4, label: "sublocality (תת-מיקום)" },
    // NEW: Add political as a fallback - this often contains city names
    { types: ['political'], priority: 5, label: "political (יחידה מדינית)" },
  ];
  
  let bestMatch = null;
  let bestPriority = 999;
  let bestLabel = "";
  
  // Look for the best city match using strict rules
  for (const component of place.address_components) {
    for (const rule of cityExtractionRules) {
      const hasMatchingType = rule.types.some(type => component.types.includes(type));
      
      if (hasMatchingType && rule.priority < bestPriority) {
        const cityName = component.long_name;
        
        // ENHANCED validation for Israeli cities - skip invalid entries
        if (cityName.match(/israel|ישראל|\d{5,7}|הארץ|מדינת|district|מחוז|tel aviv-yafo district|jerusalem district|center district|southern district|northern district|haifa district/i)) {
          console.log(`⏭️ Skipping "${cityName}" - not a valid city name (administrative unit)`);
          continue;
        }
        
        // Skip street numbers and very short entries
        if (cityName.length < 2 || cityName.match(/^\d+$/)) {
          console.log(`⏭️ Skipping "${cityName}" - too short or numeric`);
          continue;
        }
        
        // NEW: Skip obvious street names (containing common Israeli street patterns)
        if (cityName.match(/^\d+\s+|בן גוריון|הרצל|רוטשילד|דיזנגוף|אלנבי|יהודה הלוי|רחוב|דרך|שדרות/i)) {
          console.log(`⏭️ Skipping "${cityName}" - appears to be a street name`);
          continue;
        }
        
        bestMatch = cityName;
        bestPriority = rule.priority;
        bestLabel = rule.label;
        console.log(`✅ NEW BEST CITY MATCH: "${bestMatch}" (priority: ${rule.priority}, type: ${bestLabel})`);
      }
    }
  }
  
  // If we found a good match, return it
  if (bestMatch && bestMatch.length >= 2) {
    console.log(`🎯 FINAL EXTRACTED CITY: "${bestMatch}" (method: ${bestLabel})`);
    return bestMatch;
  }
  
  // ENHANCED fallback: Smart extraction from formatted_address
  if (place.formatted_address) {
    console.log("🔄 Trying enhanced fallback extraction from formatted_address:", place.formatted_address);
    
    // Look for known Israeli cities in the full address (expanded list)
    const knownIsraeliCities = [
      'תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'פתח תקווה', 'נתניה', 'אשדוד', 'ראשון לציון',
      'הרצליה', 'רמת גן', 'בני ברק', 'חולון', 'בת ים', 'רמלה', 'לוד', 'מודיעין', 'כפר סבא',
      'רעננה', 'גבעתיים', 'קרית אונו', 'אילת', 'טבריה', 'צפת', 'עכו', 'נהריה', 'קריות',
      'עפולה', 'בית שמש', 'אריאל', 'רחובות', 'קרית גת', 'נס ציונה', 'אור יהודה', 'אשקלון',
      'דימונה', 'קרית שמונה', 'כרמיאל', 'מעלות', 'שדרות', 'נתיבות', 'אופקים', 'קיסריה',
      'זכרון יעקב', 'הוד השרון', 'רמת השרון', 'תל אביב יפו', 'קרית מוצקין', 'קרית ים',
      'קרית ביאליק', 'קרית אתא', 'אלעד', 'ביתר עילית', 'מודיעין עילית', 'בית שאן',
      'מגדל העמק', 'יבנה', 'נהריה', 'אכסאל', 'שפרעם', 'סחנין', 'טמרה', 'תל מונד', 'רמת ישי'
    ];
    
    for (const city of knownIsraeliCities) {
      if (place.formatted_address.includes(city)) {
        console.log(`✅ Found known Israeli city in address: "${city}"`);
        return city;
      }
    }
    
    // SMART extraction from address parts - prioritize the RIGHT part of the address
    const addressParts = place.formatted_address.split(',').map((part: string) => part.trim());
    console.log("📍 Address parts for analysis:", addressParts);
    
    // Look at address parts in reverse order (city usually appears after street)
    for (let i = 1; i < addressParts.length - 1; i++) { // Skip first (usually street) and last (usually country)
      const part = addressParts[i];
      console.log(`🔍 Analyzing address part [${i}]: "${part}"`);
      
      // Look for parts that look like city names
      if (part.length >= 2 && part.length <= 25 && 
          !part.match(/^\d+/) && // Not starting with number
          !part.match(/israel|ישראל|\d{5,7}|רחוב|street|st\.|דרך|שדרות|district|מחוז|בן גוריון|הרצל/i)) {
        console.log(`✅ Using address part as city: "${part}"`);
        return part;
      }
    }
  }
  
  console.log("❌ Could not extract city from Google Places data");
  return "לא צוין";
};
