import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Image } from 'lucide-react';
import { Announcement } from '@/types/announcements';
import { useAnnouncementOwnership } from './cards/useAnnouncementOwnership';
import { useProposalHandler } from './cards/useProposalHandler';
import { useAnnouncementCard } from './cards/useAnnouncementCard';
import AnnouncementCardHeader from './cards/AnnouncementCardHeader';
import AnnouncementCardContent from './cards/AnnouncementCardContent';
import AnnouncementCardActions from './cards/AnnouncementCardActions';
import AnnouncementDetailModal from './AnnouncementDetailModal';
import ProposalDialog from './ProposalDialog';
import AnnouncementTypeBadge from './AnnouncementTypeBadge';
interface AnnouncementCardProps {
  announcement: Announcement;
}
const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  announcement
}) => {
  const {
    isOwner,
    isChecking
  } = useAnnouncementOwnership(announcement.id, announcement.type);
  const {
    handleSubmitProposal
  } = useProposalHandler(announcement.id, announcement.type, announcement.title, announcement.budget);
  const {
    mediaArray,
    isProposalDialogOpen,
    setIsProposalDialogOpen,
    isDetailModalOpen,
    setIsDetailModalOpen,
    handleViewDetails,
    handleSubmitProposalFromModal
  } = useAnnouncementCard(announcement);
  return <>
      <Card className="group relative overflow-hidden bg-white hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 border-gray-200/60 shadow-lg rounded-2xl">
        {/* Simple Header with Type Badge */}
        <div className="relative p-4 pb-2 py-[4px] rounded-none bg-transparent">
          {/* Ownership Banner */}
          {isOwner && <div className="absolute top-3 right-3 z-10">
              <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-300">
                שלי
              </div>
            </div>}

          {/* Type Badge */}
          <div className="absolute top-3 left-3 z-10">
            <AnnouncementTypeBadge type={announcement.type} size="sm" />
          </div>

          {/* Title with Image Indicator */}
          <div className="mt-6 flex items-start gap-2">
            <div className="flex-1">
              <h3 className="font-bold text-xl text-gray-900 leading-tight mb-2 pr-2">
                {announcement.title}
              </h3>
            </div>
            
            {/* Image Indicator */}
            {mediaArray.length > 0 && <div className="flex-shrink-0 mt-1">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full my-[8px] mx-0">
                  <Image size={14} className="text-blue-600" />
                </div>
              </div>}
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-0">
          <AnnouncementCardContent announcement={announcement} />
          
          <AnnouncementCardActions isOwner={isOwner} isChecking={isChecking} onViewDetails={handleViewDetails} onOpenProposalDialog={() => setIsProposalDialogOpen(true)} />
        </CardContent>

        {/* Proposal Dialog */}
        {isProposalDialogOpen && <ProposalDialog open={isProposalDialogOpen} onOpenChange={setIsProposalDialogOpen} announcementId={announcement.id} announcementType={announcement.type} announcementTitle={announcement.title} announcementBudget={announcement.budget} sharePercentage={announcement.type === 'lead' ? announcement.sharePercentage : 0} onSubmit={handleSubmitProposal} />}

        {/* Detail Modal */}
        <AnnouncementDetailModal open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen} announcement={announcement} onSubmitProposal={!isOwner && !isChecking ? handleSubmitProposalFromModal : undefined} />
      </Card>
    </>;
};
export default AnnouncementCard;