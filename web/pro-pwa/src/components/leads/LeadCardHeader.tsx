
import React from "react";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Bell, Edit, Lock } from "lucide-react";
import { Lead } from "@/types/leads";
import LeadStatusBadge from "./LeadStatusBadge";

interface LeadCardHeaderProps {
  lead: Lead;
  hasProposals: boolean;
  canEdit: boolean;
  onEditClick: () => void;
}

const LeadCardHeader: React.FC<LeadCardHeaderProps> = ({
  lead,
  hasProposals,
  canEdit,
  onEditClick
}) => {
  return (
    <CardHeader className="flex flex-col pb-3 p-4 bg-gradient-to-l from-blue-50 to-white" dir="rtl">
      {/* Top row: Title and action buttons */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xl font-bold text-right text-gray-800 flex-1 min-w-0 truncate">
          {lead.title}
        </h3>
        <div className="flex items-center gap-2 flex-shrink-0 mr-3">
          {canEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditClick}
              className="h-9 w-9 p-0 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
              title="ערוך ליד"
            >
              <Edit size={16} className="text-gray-600" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="h-9 w-9 p-0 opacity-50"
              title={hasProposals ? "לא ניתן לערוך - יש הצעות מחיר קיימות" : "טוען..."}
            >
              <Lock size={16} />
            </Button>
          )}
          <LeadStatusBadge status={lead.status} />
        </div>
      </div>
      
      {/* Bottom row: Location and notifications on the right */}
      <div className="flex items-center justify-end text-sm text-gray-600">
        <div className="flex items-center gap-3">
          {hasProposals && (
            <Bell size={16} className="text-ofair-blue animate-bounce" aria-label="יש הצעות חדשות" />
          )}
          <div className="flex items-center">
            <MapPin size={16} className="ml-2 text-blue-600" />
            <span className="font-medium">{lead.location}</span>
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

export default LeadCardHeader;
