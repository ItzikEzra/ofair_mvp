
import React from "react";
import { MapPin } from "lucide-react";
import AnnouncementTypeBadge from "../AnnouncementTypeBadge";

interface AnnouncementHeaderProps {
  title: string;
  type: 'lead' | 'request';
  location: string;
  description: string;
}

const AnnouncementHeader = ({ title, type, location, description }: AnnouncementHeaderProps) => {
  // Enhanced location display with city extraction
  const displayLocation = () => {
    if (!location || location.trim() === '') {
      return 'מיקום לא צוין';
    }

    const cleanLocation = location.trim();
    
    // If location looks like a full address, try to extract city
    if (cleanLocation.includes(',') && cleanLocation.length > 15) {
      return extractCityFromLocation(cleanLocation);
    }
    
    // If it's already a city name, use it
    return cleanLocation;
  };

  // Helper function to extract city from location string
  const extractCityFromLocation = (locationString: string): string => {
    // Remove common prefixes and clean
    const cleanLocationStr = locationString.replace(/^(\d+\s+)/, '').trim();
    
    // Split by comma and try different extraction methods
    const parts = cleanLocationStr.split(',').map(part => part.trim());
    
    // Method 1: Look for known Israeli cities
    const israeliCityPattern = /(תל אביב|ירושלים|חיפה|באר שבע|פתח תקווה|נתניה|אשדוד|ראשון לציון|הרצליה|רמת גן|בני ברק|חולון|בת ים|רמלה|לוד|מודיעין|כפר סבא|רעננה|גבעתיים|קרית אונו|אילת|טבריה|צפת|עכו|נהריה|קריות|עפולה|בית שמש|מעלה אדומים|אריאל)/i;
    
    for (const part of parts) {
      const cityMatch = part.match(israeliCityPattern);
      if (cityMatch) {
        return cityMatch[1];
      }
    }
    
    // Method 2: Take the last meaningful part (usually the city)
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      // Skip if it's "Israel" or postal code
      if (!lastPart.match(/israel|ישראל|\d{5,7}/i) && lastPart.length > 2) {
        return lastPart;
      }
      
      // Try second to last
      if (parts.length >= 3) {
        const secondToLast = parts[parts.length - 2];
        if (!secondToLast.match(/israel|ישראל|\d{5,7}/i) && secondToLast.length > 2) {
          return secondToLast;
        }
      }
    }
    
    // Method 3: Take the first part that looks like a city (not a street)
    for (const part of parts) {
      if (!part.match(/^\d+/) && part.length > 2 && !part.match(/רחוב|street|st\.|דרך|שדרות/i)) {
        return part;
      }
    }
    
    // Fallback: return first part if it exists
    return parts[0] || locationString;
  };

  const displayLocationText = displayLocation();

  return (
    <div className="px-4 py-3">
      <div className="flex justify-between items-start mb-3 gap-3">
        <h3 className="font-bold text-lg flex-1 min-w-0 pr-2">{title}</h3>
        <div className="flex-shrink-0">
          <AnnouncementTypeBadge type={type} />
        </div>
      </div>
      
      <div className="flex items-center text-gray-600 text-sm mb-3 pr-2">
        <MapPin size={14} className="ml-1 flex-shrink-0" />
        <span>{displayLocationText}</span>
      </div>
      
      <p className="text-sm text-gray-700 mb-3 line-clamp-2 px-2">{description}</p>
    </div>
  );
};

export default AnnouncementHeader;
