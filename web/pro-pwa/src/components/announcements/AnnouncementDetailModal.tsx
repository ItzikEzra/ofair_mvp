
import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Announcement } from '@/types/announcements';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Calendar, Clock, File, AlertTriangle, DollarSign } from 'lucide-react';
import AnnouncementTypeBadge from './AnnouncementTypeBadge';
import MediaCarousel from './MediaCarousel';
import CompactAnnouncementDetails from './CompactAnnouncementDetails';

interface AnnouncementDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement: Announcement;
  onSubmitProposal?: () => void;
}

const AnnouncementDetailModal: React.FC<AnnouncementDetailModalProps> = ({
  open,
  onOpenChange,
  announcement,
  onSubmitProposal
}) => {
  const isLead = announcement.type === 'lead';
  const isRequest = announcement.type === 'request';

  // פונקציה מאוחדת לקבלת מדיה
  const getMediaArray = (announcement: Announcement): string[] => {
    let mediaArray: string[] = [];
    
    if (isLead) {
      if (Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0) {
        mediaArray = announcement.image_urls.filter(url => url && url.trim() !== '');
      } else if (announcement.image_url && announcement.image_url.trim() !== '') {
        mediaArray = [announcement.image_url];
      }
    } else if (isRequest) {
      if (Array.isArray(announcement.media_urls) && announcement.media_urls.length > 0) {
        mediaArray = announcement.media_urls.filter(url => url && url.trim() !== '');
      } else if (Array.isArray(announcement.image_urls) && announcement.image_urls.length > 0) {
        mediaArray = announcement.image_urls.filter(url => url && url.trim() !== '');
      }
    }
    
    return Array.from(new Set(mediaArray.filter(url => url && url.trim() !== '')));
  };

  const allMedia = getMediaArray(announcement);

  // Calculate detailed price breakdown for leads
  const getPriceBreakdown = () => {
    if (!isLead || !announcement.budget) return null;
    
    const totalAmount = announcement.budget;
    const sharePercentage = announcement.sharePercentage || 0;
    const ofairCommission = totalAmount * 0.05; // 5% oFair commission
    const leadProviderAmount = totalAmount * (sharePercentage / 100);
    const professionalEarnings = totalAmount - leadProviderAmount - ofairCommission;
    
    return {
      totalAmount,
      leadProviderAmount,
      professionalEarnings,
      ofairCommission
    };
  };

  const priceBreakdown = getPriceBreakdown();

  // Card styling based on type
  const getModalStyling = () => {
    if (isLead) {
      return "bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200/60";
    } else {
      return "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200/60";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`max-w-sm w-full mx-6 rounded-2xl shadow-xl p-0 overflow-hidden max-h-[90vh] flex flex-col ${getModalStyling()}`}
        dir="rtl"
        style={{maxWidth: "360px", width: "calc(100% - 3rem)", margin: "0 auto"}}
      >
        {/* קרוסלה תמיד תוצג */}
        <div className="relative flex-shrink-0">
          <MediaCarousel media={allMedia} title={announcement.title} />
        </div>
        
        {/* תוכן הדיאלוג עם גלילה */}
        <ScrollArea className="flex-1 overflow-auto" dir="rtl">
          <div className="px-4 sm:px-6 py-4" dir="rtl">
            <DialogHeader dir="rtl">
              <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-ofair-blue mb-2 text-right" dir="rtl">
                <AnnouncementTypeBadge type={announcement.type} size="lg" />
                {announcement.title}
              </DialogTitle>
            </DialogHeader>

            {/* Description */}
            <div className="mb-4 p-3 rounded-lg border bg-white/60" dir="rtl">
              <p className="text-gray-800 text-sm leading-relaxed font-medium text-right whitespace-pre-wrap">
                {announcement.description}
              </p>
            </div>

            {/* Compact Details Grid - New design */}
            <div className="mb-4">
              <CompactAnnouncementDetails 
                announcement={announcement} 
                showConstraintsIndicator={false}
              />
            </div>

            {/* Full constraints section */}
            {announcement.constraints && announcement.constraints.trim() && (
              <div className="mb-4">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-600 text-xs block mb-1">מגבלות ודרישות מיוחדות</span>
                    <div className="font-medium text-amber-800 text-sm leading-relaxed break-words text-right">
                      {announcement.constraints}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed price breakdown for leads with budget */}
            {isLead && priceBreakdown && (
              <div className="bg-green-50 p-3 rounded-lg mb-4 border border-green-200" dir="rtl">
                <div className="space-y-2 text-sm text-right">
                  <div className="font-bold text-gray-800">
                    סכום כולל שישלם הלקוח: {formatCurrency(priceBreakdown.totalAmount)}
                  </div>
                  <div className="text-green-700 font-medium">
                    הרווח שלך: {formatCurrency(priceBreakdown.professionalEarnings)} (לפני עמלת oFair)
                  </div>
                  <div className="text-blue-600">
                    תשלום לנותן הליד: {formatCurrency(priceBreakdown.leadProviderAmount)}
                  </div>
                  <div className="text-xs text-orange-500 mt-1">
                    שימו לב שעמלת oFair לעסקה זו היא 5%
                  </div>
                </div>
              </div>
            )}

            {/* אם זה ליד בלי מחיר - תציג רק את הערת העמלה */}
            {isLead && !announcement.budget && (
              <div className="bg-orange-50 p-3 rounded-lg mb-4 border border-orange-200" dir="rtl">
                <div className="text-xs text-orange-600 text-right">
                  שימו לב שעמלת oFair לעסקה זו עומדת על 10% מהעסקה
                </div>
              </div>
            )}

            {/* Commission note for requests */}
            {isRequest && (
              <div className="bg-amber-50 p-3 rounded-lg mb-4 border border-amber-200" dir="rtl">
                <div className="text-xs text-amber-600 text-right">
                  שימו לב שעמלת oFair לבקשה זו היא 10% מהעסקה
                </div>
              </div>
            )}

            {/* Additional lead fields */}
            {isLead && (
              <div className="space-y-3 mb-4">
                {/* Work timing details */}
                {(announcement.workDate || announcement.work_date) && (
                  <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
                    <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-blue-800 text-xs">
                        {new Date(announcement.workDate || announcement.work_date).toLocaleDateString('he-IL')}
                      </div>
                      <div className="text-xs text-blue-600">תאריך עבודה</div>
                    </div>
                  </div>
                )}

                {(announcement.workTime || announcement.work_time) && (
                  <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
                    <Clock size={14} className="text-purple-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-purple-800 text-xs">
                        {announcement.workTime || announcement.work_time}
                      </div>
                      <div className="text-xs text-purple-600">שעת עבודה</div>
                    </div>
                  </div>
                )}

                {/* Profession field */}
                {announcement.profession && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-md border border-orange-100">
                    <File size={14} className="text-orange-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-orange-800 text-xs">
                        {announcement.profession}
                      </div>
                      <div className="text-xs text-orange-600">תחום מקצועי</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client details (only for lead owners) */}
            {isLead && (announcement.clientName || announcement.client_name) && (
              <div className="bg-blue-50 p-4 rounded-lg mt-4 text-right border border-blue-200" dir="rtl">
                <h3 className="font-bold mb-3 text-blue-800 text-right">פרטי לקוח:</h3>
                <div className="space-y-2 text-gray-800 text-right">
                  <div className="flex justify-between">
                    <span className="font-semibold">שם:</span>
                    <span>{announcement.clientName || announcement.client_name}</span>
                  </div>
                  {(announcement.clientPhone || announcement.client_phone) && (
                    <div className="flex justify-between">
                      <span className="font-semibold">טלפון:</span>
                      <span>{announcement.clientPhone || announcement.client_phone}</span>
                    </div>
                  )}
                  {(announcement.clientAddress || announcement.client_address) && (
                    <div className="flex justify-between">
                      <span className="font-semibold">כתובת:</span>
                      <span>{announcement.clientAddress || announcement.client_address}</span>
                    </div>
                  )}
                  {announcement.notes && (
                    <div className="flex justify-between">
                      <span className="font-semibold">הערות:</span>
                      <span>{announcement.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex sm:justify-between justify-end gap-2 bg-gray-50 py-3 px-4 sm:px-6 rounded-b-2xl flex-shrink-0" dir="rtl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
          {onSubmitProposal && (
            <Button onClick={onSubmitProposal} className="bg-ofair-blue hover:bg-ofair-blue/80 text-white font-bold">
              שלח הצעת מחיר
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementDetailModal;
