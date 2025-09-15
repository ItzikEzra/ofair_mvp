import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Announcement } from '@/types/announcements';
import CompactAnnouncementDetails from '../CompactAnnouncementDetails';
interface AnnouncementCardContentProps {
  announcement: Announcement;
}
const AnnouncementCardContent: React.FC<AnnouncementCardContentProps> = ({
  announcement
}) => {
  return <div className="p-4 space-y-3">
      {/* Description Section - moved from header */}
      {announcement.description && <div className="mb-4">
          <p className="leading-relaxed break-words text-base text-black">
            {announcement.description}
          </p>
        </div>}

      {/* Compact Details Grid */}
      <CompactAnnouncementDetails announcement={announcement} />

      {/* Full constraints section - shown only in detail modal */}
      {announcement.constraints && announcement.constraints.trim() && <div className="hidden" id="full-constraints">
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-gray-600 text-xs block mb-1">מגבלות ודרישות מיוחדות</span>
              <div className="font-medium text-amber-800 text-sm leading-relaxed break-words">
                {announcement.constraints}
              </div>
            </div>
          </div>
        </div>}
    </div>;
};
export default AnnouncementCardContent;