
import React from "react";
import { Loader2 } from "lucide-react";

const LeadsLoading: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-ofair-blue" />
        <p className="text-gray-600">טוען לידים...</p>
      </div>
    </div>
  );
};

export default LeadsLoading;
