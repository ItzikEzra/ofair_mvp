
import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyLeadsListProps {
  activeTab: string;
}

const EmptyLeadsList: React.FC<EmptyLeadsListProps> = ({ activeTab }) => {
  const getMessage = () => {
    if (activeTab === "all") return "אין לידים להצגה";
    if (activeTab === "active") return "אין לידים פעילים להצגה";
    if (activeTab === "completed") return "אין לידים שהושלמו להצגה";
    return "אין לידים שבוטלו להצגה";
  };

  return (
    <div className="bg-white rounded-xl p-6 text-center shadow-md">
      <p className="text-gray-500 mb-4">{getMessage()}</p>
      <Button
        onClick={() => window.location.href = "/submit-lead"}
        className="bg-ofair-blue hover:bg-ofair-blue/80"
      >
        פרסם ליד חדש
      </Button>
    </div>
  );
};

export default EmptyLeadsList;
