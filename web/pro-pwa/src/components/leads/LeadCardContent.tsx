
import React from "react";
import { CardContent } from "@/components/ui/card";
import { Lead } from "@/types/leads";
import LeadDetails from "./LeadDetails";

interface LeadCardContentProps {
  lead: Lead;
}

const LeadCardContent: React.FC<LeadCardContentProps> = ({ lead }) => {
  return (
    <CardContent className="pt-0 p-4">
      <LeadDetails lead={lead} />
    </CardContent>
  );
};

export default LeadCardContent;
