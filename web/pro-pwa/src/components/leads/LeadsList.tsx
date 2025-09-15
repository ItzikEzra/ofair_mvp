
import React from "react";
import { Lead } from "@/types/leads";
import MyLeadCard from "@/components/leads/MyLeadCard";

interface LeadsListProps {
  leads: Lead[];
  onLeadChange?: () => void;
}

const LeadsList: React.FC<LeadsListProps> = ({ leads, onLeadChange }) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      {leads.map((lead) => (
        <MyLeadCard 
          key={lead.id} 
          lead={lead}
          onStatusChange={() => {
            console.log("Lead status changed, refreshing list");
            if (onLeadChange) {
              onLeadChange();
            }
          }}
        />
      ))}
    </div>
  );
};

export default LeadsList;
