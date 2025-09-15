
import React from 'react';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Announcement } from '@/types/announcements';
import { useAnnouncementOwnership } from './cards/useAnnouncementOwnership';

interface AnnouncementMetaProps {
  announcement: Announcement;
}

const AnnouncementMeta: React.FC<AnnouncementMetaProps> = ({ announcement }) => {
  const isLead = announcement.type === 'lead';
  const isRequest = announcement.type === 'request';
  const { isOwner: ownedAnnouncement } = useAnnouncementOwnership(announcement.id, announcement.type);

  // For leads: calculate earnings for the viewer (not commission breakdown)
  const getViewerEarnings = () => {
    if (!isLead || !announcement.budget) return null;
    
    const totalBudget = announcement.budget;
    const sharePercentage = announcement.sharePercentage || 0;
    const ofairCommission = totalBudget * 0.05; // 5% of total
    const leadProviderAmount = totalBudget * (sharePercentage / 100);
    const professionalEarnings = totalBudget - leadProviderAmount - ofairCommission;
    
    return {
      totalBudget,
      professionalEarnings
    };
  };

  const earnings = getViewerEarnings();

  // Enhanced location display with better city extraction and fallbacks
  const displayLocation = () => {
    console.log("Displaying location for announcement:", {
      location: announcement.location,
      clientAddress: announcement.clientAddress || announcement.client_address,
      type: announcement.type
    });

    // Primary: Use the location field if it exists and is meaningful
    if (announcement.location && announcement.location.trim() !== '') {
      const location = announcement.location.trim();
      
      // If location looks like a full address, try to extract city
      if (location.includes(',') && location.length > 15) {
        const extractedCity = extractCityFromLocation(location);
        console.log("Extracted city from location:", extractedCity);
        return extractedCity;
      }
      
      // If it's already a city name, use it
      return location;
    }
    
    // Secondary: Try to extract city from client address - FIXED property names
    const clientAddress = ownedAnnouncement ? (announcement.clientAddress || announcement.client_address) : null;
    if (clientAddress && clientAddress.trim() !== '') {
      const extractedCity = extractCityFromLocation(clientAddress.trim());
      console.log("Extracted city from client address:", extractedCity);
      return extractedCity;
    }
    
    // Fallback
    return 'מיקום לא צוין';
  };

  // Helper function to extract city from location string
  const extractCityFromLocation = (locationString: string): string => {
    // Remove common prefixes and clean
    const cleanLocation = locationString.replace(/^(\d+\s+)/, '').trim();
    
    // Split by comma and try different extraction methods
    const parts = cleanLocation.split(',').map(part => part.trim());
    
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

  const locationText = displayLocation();

  return (
    <div className="space-y-2 text-sm" dir="rtl">
      {/* Show potential earnings only for leads with budget - simplified display */}
      {isLead && earnings && (
        <div className="flex items-center text-green-700 gap-1 font-semibold">
          <span>רווח פוטנציאלי: {formatCurrency(earnings.professionalEarnings)}</span>
        </div>
      )}

      {/* Commission note for requests */}
      {isRequest && (
        <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded-md">
          שימו לב: עמלת oFair על בקשות צרכנים היא 10%
        </div>
      )}

      {/* Timing for both types */}
      {(isLead && (announcement.workDate || announcement.work_date) || isRequest && announcement.timing) && (
        <div className="flex items-center text-gray-600 gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {isLead ? (announcement.workDate || announcement.work_date) : announcement.timing}
          </span>
        </div>
      )}

      {/* Work time for leads */}
      {isLead && (announcement.workTime || announcement.work_time) && (
        <div className="flex items-center text-gray-600 gap-1">
          <Clock className="h-3 w-3" />
          <span>{announcement.workTime || announcement.work_time}</span>
        </div>
      )}
    </div>
  );
};

export default AnnouncementMeta;
