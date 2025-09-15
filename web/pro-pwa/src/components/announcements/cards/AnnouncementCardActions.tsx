import React from 'react';
import { Button } from "@/components/ui/button";
import { Eye } from 'lucide-react';
import ProposalButton from './ProposalButton';
interface AnnouncementCardActionsProps {
  isOwner: boolean;
  isChecking: boolean;
  onViewDetails: () => void;
  onOpenProposalDialog: () => void;
}
const AnnouncementCardActions: React.FC<AnnouncementCardActionsProps> = ({
  isOwner,
  isChecking,
  onViewDetails,
  onOpenProposalDialog
}) => {
  return <div className="px-5 pb-5 pt-2 space-y-2 bg-sky-50 rounded-full">
      {/* View Details Button */}
      <Button variant="outline" onClick={onViewDetails} className="w-full">
        <Eye className="ml-2 h-4 w-4" />
        פרטים נוספים
      </Button>
      
      {/* Submit Proposal Button */}
      {!isOwner && !isChecking && <ProposalButton onOpenProposalDialog={onOpenProposalDialog} isSubmitting={false} isCheckingAuth={false} className="w-full bg-gradient-to-r from-ofair-blue to-blue-600 hover:from-blue-600 hover:to-ofair-blue text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" />}
    </div>;
};
export default AnnouncementCardActions;