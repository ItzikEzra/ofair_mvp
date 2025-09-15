
import React from 'react';
import { MapPin, Calendar, Clock, Navigation } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { formatDistance } from '@/utils/coordinateValidation';
import { useDistancePreferences } from '@/hooks/useDistancePreferences';
import { Announcement } from '@/types/announcements';
import { useAnnouncementOwnership } from './cards/useAnnouncementOwnership';

interface AnnouncementMetaWithDistanceProps {
  announcement: Announcement;
}

const AnnouncementMetaWithDistance: React.FC<AnnouncementMetaWithDistanceProps> = ({ announcement }) => {
  const { preferences } = useDistancePreferences();
  const isLead = announcement.type === 'lead';
  const isRequest = announcement.type === 'request';
  const { isOwner: ownedAnnouncement } = useAnnouncementOwnership(announcement.id, announcement.type);

  // חישוב רווחים לליד
  const getViewerEarnings = () => {
    if (!isLead || !announcement.budget) return null;
    
    const totalBudget = announcement.budget;
    const sharePercentage = announcement.sharePercentage || 0;
    const ofairCommission = totalBudget * 0.05;
    const leadProviderAmount = totalBudget * (sharePercentage / 100);
    const professionalEarnings = totalBudget - leadProviderAmount - ofairCommission;
    
    return {
      totalBudget,
      professionalEarnings
    };
  };

  const earnings = getViewerEarnings();

  // הצגת מיקום משופרת
  const displayLocation = () => {
    // אם יש מרחק מחושב, נציג אותו
    if (typeof announcement.distance === 'number') {
      const distanceText = formatDistance(announcement.distance, preferences.unit, preferences.precision);
      
      const locationText = announcement.location && announcement.location.trim() !== '' 
        ? announcement.location.trim()
        : 'מיקום';
        
      return `${locationText} • ${distanceText} ממך`;
    }

    // אחרת, נציג את המיקום הרגיל
    if (announcement.location && announcement.location.trim() !== '') {
      const location = announcement.location.trim();
      
      if (location.includes(',') && location.length > 15) {
        return extractCityFromLocation(location);
      }
      return location;
    }
    
    const clientAddress = ownedAnnouncement ? (announcement.clientAddress || announcement.client_address) : null;
    if (clientAddress && clientAddress.trim() !== '') {
      return extractCityFromLocation(clientAddress.trim());
    }
    
    return 'מיקום לא צוין';
  };

  // פונקציה לחילוץ עיר מכתובת
  const extractCityFromLocation = (locationString: string): string => {
    const cleanLocation = locationString.replace(/^(\d+\s+)/, '').trim();
    const parts = cleanLocation.split(',').map(part => part.trim());
    
    const israeliCityPattern = /(תל אביב|ירושלים|חיפה|באר שבע|פתח תקווה|נתניה|אשדוד|ראשון לציון|הרצליה|רמת גן|בני ברק|חולון|בת ים|רמלה|לוד|מודיעין|כפר סבא|רעננה|גבעתיים|קרית אונו|אילת|טבריה|צפת|עכו|נהריה|קריות|עפולה|בית שמש|מעלה אדומים|אריאל)/i;
    
    for (const part of parts) {
      const cityMatch = part.match(israeliCityPattern);
      if (cityMatch) {
        return cityMatch[1];
      }
    }
    
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (!lastPart.match(/israel|ישראל|\d{5,7}/i) && lastPart.length > 2) {
        return lastPart;
      }
      
      if (parts.length >= 3) {
        const secondToLast = parts[parts.length - 2];
        if (!secondToLast.match(/israel|ישראל|\d{5,7}/i) && secondToLast.length > 2) {
          return secondToLast;
        }
      }
    }
    
    for (const part of parts) {
      if (!part.match(/^\d+/) && part.length > 2 && !part.match(/רחוב|street|st\.|דרך|שדרות/i)) {
        return part;
      }
    }
    
    return parts[0] || locationString;
  };

  const locationText = displayLocation();

  return (
    <div className="space-y-2 text-sm" dir="rtl">
      {/* הצגת רווח פוטנציאלי ללידים עם תקציב */}
      {isLead && earnings && (
        <div className="flex items-center text-green-700 gap-1 font-semibold">
          <span>רווח פוטנציאלי: {formatCurrency(earnings.professionalEarnings)}</span>
        </div>
      )}

      {/* הערת עמלה לבקשות */}
      {isRequest && (
        <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded-md">
          שימו לב: עמלת oFair על בקשות צרכנים היא 10%
        </div>
      )}

      {/* מיקום עם מרחק */}
      <div className="flex items-center text-gray-600 gap-1">
        {typeof announcement.distance === 'number' ? (
          <Navigation className="h-3 w-3 text-blue-600" />
        ) : (
          <MapPin className="h-3 w-3" />
        )}
        <span className={typeof announcement.distance === 'number' ? 'text-blue-600 font-medium' : ''}>
          {locationText}
        </span>
      </div>

      {/* תאריך ושעת עבודה */}
      {(isLead && (announcement.workDate || announcement.work_date) || isRequest && announcement.timing) && (
        <div className="flex items-center text-gray-600 gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {isLead ? (announcement.workDate || announcement.work_date) : announcement.timing}
          </span>
        </div>
      )}

      {isLead && (announcement.workTime || announcement.work_time) && (
        <div className="flex items-center text-gray-600 gap-1">
          <Clock className="h-3 w-3" />
          <span>{announcement.workTime || announcement.work_time}</span>
        </div>
      )}
    </div>
  );
};

export default AnnouncementMetaWithDistance;
