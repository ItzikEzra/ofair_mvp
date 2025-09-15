
import React, { useState } from "react";
import { Info } from "lucide-react";
import { Announcement } from '@/types/announcements';
import AnnouncementTypeBadge from "../AnnouncementTypeBadge";
import CompactAnnouncementDetails from "../CompactAnnouncementDetails";
import AnnouncementDetailModal from "../AnnouncementDetailModal";
import ProposalDialog from "../ProposalDialog";
import { useAnnouncementOwnership } from './useAnnouncementOwnership';
import { useProposalHandler } from './useProposalHandler';
import ExpandableText from '@/components/ui/ExpandableText';

interface AnnouncementTypeCardProps {
  announcement: Announcement;
  onViewDetails: () => void;
}

const AnnouncementTypeCard: React.FC<AnnouncementTypeCardProps> = ({
  announcement,
  onViewDetails: externalOnViewDetails
}) => {
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);

  const {
    isOwner,
    isChecking
  } = useAnnouncementOwnership(announcement.id, announcement.type);

  const {
    handleSubmitProposal
  } = useProposalHandler(announcement.id, announcement.type, announcement.title, announcement.budget);

  // Handle opening the detail modal
  const handleViewDetails = () => {
    setIsDetailModalOpen(true);
    externalOnViewDetails(); // Keep the external handler call for any additional logic
  };

  // Handle submitting a proposal from the detail modal
  const handleSubmitProposalFromModal = () => {
    setIsDetailModalOpen(false);
    setIsProposalDialogOpen(true);
  };

  // Enhanced visual distinction based on type
  const getCardStyling = () => {
    if (announcement.type === 'lead') {
      return "rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50/80 to-indigo-50 border-2 border-blue-200/40 p-4 mb-4 flex flex-col justify-between min-h-[200px] relative shadow-lg transition-all duration-300 mx-auto max-w-sm";
    } else {
      return "rounded-2xl bg-gradient-to-br from-green-50 via-green-50/80 to-emerald-50 border-2 border-green-200/40 p-4 mb-4 flex flex-col justify-between min-h-[200px] relative shadow-lg transition-all duration-300 mx-auto max-w-sm";
    }
  };


  return (
    <>
      <div className={getCardStyling()}>
        {/* Ownership Banner */}
        {isOwner && (
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium border border-gray-300">
              שלי
            </div>
          </div>
        )}

        <div className="flex w-full items-start gap-3 mb-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-snug pr-2 text-right break-words">
              {announcement.title}
            </h3>
          </div>
          {/* Enhanced badge with better shadow */}
          <div className="shadow-lg flex-shrink-0">
            <AnnouncementTypeBadge type={announcement.type} size="sm"/>
          </div>
        </div>

        {/* Compact Details Grid */}
        <div className="mb-3">
          <CompactAnnouncementDetails announcement={announcement} />
        </div>

        {/* Description with better styling */}
        {announcement.description && (
          <div className="mb-3 mt-1 px-2 overflow-hidden">
            <div className="block text-sm text-[#333] dark:text-[#EEE] bg-white/60 dark:bg-[#ffffff09] py-2 px-3 rounded-lg shadow-inner leading-relaxed text-right break-words">
              <ExpandableText 
                text={announcement.description}
                wordLimit={12}
                className=""
                showButtonInline={false}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-auto px-2 gap-2">
          <button
            onClick={handleViewDetails}
            className="flex items-center text-sm font-medium text-ofair-blue hover:text-ofair-turquoise transition-colors rounded-lg px-3 py-2 hover:bg-ofair-blue/10 dark:hover:text-ofair-turquoise shadow-sm"
          >
            <Info size={16} className="ml-1" />
            פרטים נוספים
          </button>
          
          {!isOwner && !isChecking && (
            <button
              onClick={() => setIsProposalDialogOpen(true)}
              className="bg-ofair-blue hover:bg-ofair-blue/80 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              הגש הצעה
            </button>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnnouncementDetailModal 
        open={isDetailModalOpen} 
        onOpenChange={setIsDetailModalOpen} 
        announcement={announcement}
        onSubmitProposal={!isOwner && !isChecking ? handleSubmitProposalFromModal : undefined}
      />

      {/* Proposal Dialog */}
      {isProposalDialogOpen && (
        <ProposalDialog 
          open={isProposalDialogOpen} 
          onOpenChange={setIsProposalDialogOpen}
          announcementId={announcement.id}
          announcementType={announcement.type}
          announcementTitle={announcement.title}
          announcementBudget={announcement.budget}
          sharePercentage={announcement.type === 'lead' ? announcement.sharePercentage : 0}
          onSubmit={handleSubmitProposal}
        />
      )}
    </>
  );
};

export default AnnouncementTypeCard;
