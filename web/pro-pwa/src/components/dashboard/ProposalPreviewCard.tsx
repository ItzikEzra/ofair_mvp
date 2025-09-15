import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { getStatusBadge } from "@/utils/statusHelpers";
import { ProposalType } from "@/types/jobs";
import { ArrowRight } from "lucide-react";
import ExpandableText from "@/components/ui/ExpandableText";
import { useNavigate } from "react-router-dom";

interface ProposalPreviewCardProps {
  proposal: ProposalType;
  onClick?: () => void;
  type?: "submitted" | "received";
}
const ProposalPreviewCard: React.FC<ProposalPreviewCardProps> = ({
  proposal,
  onClick,
  type = "submitted"
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      if (type === "received") {
        // For received proposals, navigate to the specific lead details
        if (proposal.leadId) {
          navigate(`/my-leads?id=${proposal.leadId}`);
        } else {
          navigate("/my-leads");
        }
      } else {
        // For submitted proposals, navigate to the specific proposal in proposals viewer or my-jobs
        if (proposal.leadId) {
          navigate(`/proposals-viewer/${proposal.leadId}?proposalId=${proposal.id}`);
        } else if (proposal.id) {
          navigate(`/my-jobs?tab=proposals&proposalId=${proposal.id}`);
        } else {
          navigate("/my-jobs?tab=proposals");
        }
      }
    }
  };

  return (
    <Card 
      className={`overflow-hidden cursor-pointer transition-all hover:shadow-md ${proposal.status === 'accepted' ? 'border-green-300 bg-green-50' : ''}`} 
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-xs sm:text-sm line-clamp-1">{proposal.title}</h3>
          {getStatusBadge(proposal.status)}
        </div>
        
        <ExpandableText 
          text={proposal.description}
          wordLimit={8}
          className="text-xs text-gray-500 mb-2"
          showButtonInline={false}
        />
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">{proposal.date}</span>
          <span className="text-ofair-blue text-xs sm:text-sm font-medium">
            {typeof proposal.price === 'number' ? formatCurrency(proposal.price) : proposal.price}
          </span>
        </div>
        
        <div className="flex justify-end mt-1">
          <div className="flex items-center text-xs text-ofair-blue">
            לפרטים נוספים
            <ArrowRight size={12} className="mr-1 rotate-180 " />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export default ProposalPreviewCard;