
// Enhanced fallback city extraction with better Israeli city recognition
export const extractCityFromAddress = (address: string): string => {
  if (!address) return "לא צוין";
  
  console.log("Fallback: Extracting city from address:", address);
  
  // Remove common prefixes and clean the address
  const cleanAddress = address.replace(/^(\d+\s+)/, '').trim();
  
  // Split by comma and try different extraction methods
  const parts = cleanAddress.split(',').map(part => part.trim());
  
  // Enhanced Israeli city pattern with more cities and better organization
  const israeliCityPattern = /(תל אביב|ירושלים|חיפה|באר שבע|פתח תקווה|נתניה|אשדוד|ראשון לציון|הרצליה|רמת גן|בני ברק|חולון|בת ים|רמלה|לוד|מודיעין|כפר סבא|רעננה|גבעתיים|קרית אונו|אילת|טבריה|צפת|עכו|נהריה|קריות|עפולה|בית שמש|אריאל|רחובות|קרית גת|קרית מוצקין|קרית ים|נס ציונה|יהוד|אור יהודה|אשקלון|דימונה|קרית שמונה|מגדל העמק|טירת הכרמל|יקנעם|כרמיאל|מעלות תרשיחא|שדרות|אופקים|נתיבות|מטולה|קצרין|ביתר עילית|באר יעקב|גבעת שמואל|מעלה אדומים|תל אביב יפו|קיסריה|זכרון יעקב|הוד השרון|רמת השרון)/i;
  
  // Method 1: Look for known Israeli cities first
  for (const part of parts) {
    const cityMatch = part.match(israeliCityPattern);
    if (cityMatch) {
      console.log("Fallback: Found Israeli city:", cityMatch[1]);
      return cityMatch[1];
    }
  }
  
  // Method 2: For short addresses (likely just city names), use the entire clean address
  if (parts.length === 1 && cleanAddress.length < 20 && !cleanAddress.match(/\d+/)) {
    console.log("Fallback: Using entire short address as city:", cleanAddress);
    return cleanAddress;
  }
  
  // Method 3: Take the last meaningful part (usually the city)
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    // Skip if it's "Israel" or postal code
    if (!lastPart.match(/israel|ישראל|\d{5,7}/i) && lastPart.length > 2) {
      console.log("Fallback: Using last part as city:", lastPart);
      return lastPart;
    }
    
    // Try second to last
    if (parts.length >= 3) {
      const secondToLast = parts[parts.length - 2];
      if (!secondToLast.match(/israel|ישראל|\d{5,7}|רחוב|street|st\.|דרך|שדרות/i) && secondToLast.length > 2) {
        console.log("Fallback: Using second to last part as city:", secondToLast);
        return secondToLast;
      }
    }
  }
  
  // Method 4: Try to find any word that looks like a city name (Hebrew or English)
  for (const part of parts) {
    const trimmedPart = part.trim();
    if (trimmedPart.length > 2 && 
        !trimmedPart.match(/^\d+$/) && 
        !trimmedPart.match(/israel|ישראל|\d{5,7}|רחוב|street|st\.|דרך|שדרות/i)) {
      console.log("Fallback: Using likely city name:", trimmedPart);
      return trimmedPart;
    }
  }
  
  console.log("Fallback: Could not extract city, returning default");
  return "לא צוין";
};
