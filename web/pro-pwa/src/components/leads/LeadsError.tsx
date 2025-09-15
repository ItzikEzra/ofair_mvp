
import React from "react";
import { Button } from "@/components/ui/button";

interface LeadsErrorProps {
  errorMessage: string;
  onRetry: () => void;
}

const LeadsError: React.FC<LeadsErrorProps> = ({ errorMessage, onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
      <p className="text-red-700">{errorMessage}</p>
      <Button variant="outline" onClick={onRetry} className="mt-2">
        נסה שנית
      </Button>
    </div>
  );
};

export default LeadsError;
