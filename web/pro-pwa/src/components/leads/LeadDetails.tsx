
import React from "react";
import { Lead } from "@/types/leads";
import CompactDetailsGrid from "./CompactDetailsGrid";

interface LeadDetailsProps {
  lead: Lead;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead }) => {
  return (
    <div className="space-y-3" dir="rtl">
      {/* Description */}
      <div className="p-3 rounded-lg border bg-transparent">
        <p className="text-gray-800 text-sm leading-relaxed font-medium truncate">{lead.description}</p>
      </div>
      
      {/* Compact Details Grid */}
      <CompactDetailsGrid lead={lead} />

      {/* Constraints section - Full details shown here */}
      {lead.constraints && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-md border border-amber-100">
          <div className="flex-1 min-w-0">
            <span className="text-gray-600 text-xs block mb-1">מגבלות ודרישות מיוחדות</span>
            <div className="font-medium text-amber-800 text-sm leading-relaxed truncate">
              {lead.constraints}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetails;
