
import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface NotificationsErrorStateProps {
  error: string;
  onRefresh: () => void;
}

const NotificationsErrorState: React.FC<NotificationsErrorStateProps> = ({
  error,
  onRefresh
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-center bg-red-50 border border-red-100 rounded-lg p-6 max-w-md">
        <p className="text-red-800 mb-4">{error}</p>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="ml-2 h-4 w-4" />
          נסה שנית
        </Button>
      </div>
    </div>
  );
};

export default NotificationsErrorState;
