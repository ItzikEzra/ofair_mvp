import React from 'react';
import { MapPin, Calendar, Banknote, AlertTriangle, Clock } from 'lucide-react';
import { Announcement } from '@/types/announcements';
import { formatCurrency } from '@/lib/utils';
interface CompactAnnouncementDetailsProps {
  announcement: Announcement;
  showConstraintsIndicator?: boolean;
}
const CompactAnnouncementDetails: React.FC<CompactAnnouncementDetailsProps> = ({
  announcement,
  showConstraintsIndicator = true
}) => {
  // Calculate net budget for leads
  const getNetBudget = () => {
    if (announcement.type !== 'lead' || !announcement.budget) return null;
    const totalBudget = Number(announcement.budget);
    const sharePercentage = announcement.sharePercentage || 0;
    const leadProviderCommission = totalBudget * (sharePercentage / 100);
    return totalBudget - leadProviderCommission;
  };
  const netBudget = getNetBudget();
  return <div className="grid grid-cols-2 gap-2 text-sm" dir="rtl">
      {/* Location */}
      <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
        <MapPin size={14} className="text-blue-600 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-blue-800 text-xs truncate">
            {announcement.location || 'לא צוין'}
          </div>
          <div className="text-xs text-blue-600">מיקום</div>
        </div>
      </div>

      {/* Budget for leads */}
      {announcement.type === 'lead' && announcement.budget && announcement.budget > 0 && <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
          <Banknote size={14} className="text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-green-800 text-xs truncate">
              {netBudget ? formatCurrency(netBudget) : formatCurrency(announcement.budget)}
            </div>
            <div className="text-xs text-green-600">הרווח שלך</div>
          </div>
        </div>}

      {/* Budget for requests */}
      {announcement.type === 'request' && announcement.budget && announcement.budget > 0 && <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
          <Banknote size={14} className="text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-green-800 text-xs truncate">
              {formatCurrency(announcement.budget)}
            </div>
            <div className="text-xs text-green-600">תקציב</div>
          </div>
        </div>}

      {/* Work Date/Time */}
      {(announcement.workDate || announcement.workTime || announcement.timing) && <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
          <Calendar size={14} className="text-purple-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-purple-800 text-xs truncate">
              {announcement.workDate && announcement.workTime ? `${new Date(announcement.workDate).toLocaleDateString('he-IL')}` : announcement.workDate ? `${new Date(announcement.workDate).toLocaleDateString('he-IL')}` : announcement.workTime || announcement.timing || 'לא צוין'}
            </div>
            <div className="text-xs text-purple-600">
              {announcement.workTime ? 'תאריך ושעה' : 'תזמון'}
            </div>
          </div>
        </div>}

      {/* Constraints Indicator */}
      {announcement.constraints && announcement.constraints.trim() && showConstraintsIndicator && <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-100">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-800 text-xs">
              יש מגבלות
            </div>
            <div className="text-xs text-amber-600">דרישות מיוחדות</div>
          </div>
        </div>}

      {/* Commission info for leads - condensed */}
      {announcement.type === 'lead' && announcement.sharePercentage > 0 && <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-md border border-orange-200">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-orange-800 text-xs">
              {announcement.sharePercentage}% עמלה
            </div>
            <div className="text-xs text-orange-600">לנותן הליד</div>
          </div>
        </div>}

      {/* Commission note for requests - condensed */}
      {announcement.type === 'request' && <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-200">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-800 text-xs">
              10% עמלה
            </div>
            <div className="text-xs text-amber-600">oFair</div>
          </div>
        </div>}
    </div>;
};
export default CompactAnnouncementDetails;