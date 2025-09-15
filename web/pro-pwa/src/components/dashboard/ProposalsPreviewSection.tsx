import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProposalPreviewCard from "./ProposalPreviewCard";
import { ProposalType } from "@/types/jobs";
import EmptyStateMessage from "../proposals/EmptyStateMessage";
import { useProposals } from "@/hooks/useProposals";

const ProposalsPreviewSection: React.FC = () => {
  const { submittedProposals, receivedProposals, isLoading } = useProposals();
  const navigate = useNavigate();

  const handleViewAll = (type: "submitted" | "received") => {
    navigate(`/my-jobs?tab=proposals${type === "received" ? "&view=received" : ""}`);
  };

  const handleProposalClick = (proposal: any, type: "submitted" | "received") => {
    if (type === "received") {
      navigate(`/lead-details/${proposal.lead_id}`);
    } else {
      navigate("/my-jobs?tab=proposals");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border border-white/20 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Submitted Proposals */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-blue-900">ההצעות שלי</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleViewAll("submitted")} 
            className="text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            צפה בהכל
          </Button>
        </div>
        <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border border-white/20">
          {submittedProposals.length > 0 ? (
            <div className="grid gap-3 p-4">
              {submittedProposals.slice(0, 2).map(proposal => (
                <ProposalPreviewCard 
                  key={proposal.id} 
                  proposal={proposal} 
                  type="submitted" 
                  onClick={() => handleProposalClick(proposal, "submitted")} 
                />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyStateMessage 
                title="אין הצעות שנשלחו" 
                description="טרם שלחת הצעות מחיר ללידים" 
                actionText="חפש לידים" 
                actionPath="/announcements" 
              />
            </div>
          )}
        </div>
      </div>

      {/* Received Proposals */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-blue-900">הצעות שקיבלתי</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleViewAll("received")} 
            className="text-blue-700 border-blue-200 hover:bg-blue-50"
          >
            צפה בהכל
          </Button>
        </div>
        <div className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md rounded-xl overflow-hidden shadow-lg border border-white/20">
          {receivedProposals.length > 0 ? (
            <div className="grid gap-3 p-4">
              {receivedProposals.slice(0, 2).map(proposal => (
                <ProposalPreviewCard 
                  key={proposal.id} 
                  proposal={proposal} 
                  type="received" 
                  onClick={() => handleProposalClick(proposal, "received")} 
                />
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyStateMessage 
                title="אין הצעות שהתקבלו" 
                description="טרם קיבלת הצעות מחיר על הלידים שלך" 
                actionText="פרסם ליד" 
                actionPath="/my-leads/create" 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProposalsPreviewSection;