
import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { MapPin, Clock, Star, User } from "lucide-react";
import { LeadProposal } from "@/types/leads";
import { Lead } from "@/types/leads";
import { formatCurrency } from "@/lib/utils";
import { getStatusBadge } from "@/utils/statusHelpers";

interface ReceivedProposalCardProps {
  proposal: LeadProposal;
  relatedLead?: Lead;
}

const ReceivedProposalCard: React.FC<ReceivedProposalCardProps> = ({ 
  proposal, 
  relatedLead 
}) => {
  console.log("[RECEIVED_PROPOSAL_CARD] Rendering proposal:", proposal);
  
  // Extract professional data from the join
  const professional = proposal.professionals;
  const professionalName = professional?.name || proposal.professional_name || 'בעל מקצוע';
  const professionalLocation = professional?.location || proposal.professional_location;
  const professionalRating = professional?.rating || proposal.professional_rating;
  const professionalProfession = professional?.profession || proposal.professional_profession;
  
  console.log("[RECEIVED_PROPOSAL_CARD] Professional data:", {
    name: professionalName,
    location: professionalLocation,
    rating: professionalRating,
    profession: professionalProfession
  });
  
  return (
    <Card 
      key={proposal.id} 
      className={`overflow-hidden ${proposal.status === 'accepted' ? 'border-green-300 bg-green-50' : 'border-ofair-blue'}`}
    >
      <CardHeader className="pb-2 bg-ofair-blue/5">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{relatedLead?.title || 'ליד'}</CardTitle>
          {getStatusBadge(proposal.status)}
        </div>
        {relatedLead?.location && (
          <div className="flex items-center text-sm text-gray-500">
            <MapPin size={14} className="ml-1" />
            {relatedLead.location}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {/* Professional Info Section */}
        <div className="bg-blue-50 p-3 rounded-md mb-3">
          <div className="flex items-center gap-2 mb-2">
            <User size={16} className="text-blue-600" />
            <span className="font-medium text-blue-800">
              {professionalName}
            </span>
            {professionalProfession && (
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {professionalProfession}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            {professionalLocation && (
              <div className="flex items-center gap-1 text-gray-600">
                <MapPin size={12} />
                <span>{professionalLocation}</span>
              </div>
            )}
            
            {professionalRating && professionalRating > 0 && (
              <div className="flex items-center gap-1 text-yellow-600">
                <Star size={12} className="fill-current" />
                <span className="font-medium">{professionalRating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Proposal Content */}
        <div className="p-3 bg-gray-50 rounded-md mb-3">
          <p className="text-sm font-medium mb-1">הצעת המחיר:</p>
          <p className="text-sm text-gray-700">{proposal.description}</p>
          
          {proposal.estimated_completion && (
            <div className="flex items-center text-xs text-gray-500 mt-2">
              <Clock size={12} className="ml-1" />
              זמן אספקה משוער: {proposal.estimated_completion}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">מחיר מוצע:</span>
          <span className="text-green-600 font-bold">
            {formatCurrency(proposal.price)}
          </span>
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center text-xs text-gray-500">
          <p className="text-sm">
            התקבל בתאריך: {new Date(proposal.created_at).toLocaleDateString('he-IL')}
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ReceivedProposalCard;
