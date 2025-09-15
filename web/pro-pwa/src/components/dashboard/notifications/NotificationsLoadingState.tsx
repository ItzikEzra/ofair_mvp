
import React from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationsLoadingStateProps {
  onRefresh: () => void;
}

const NotificationsLoadingState: React.FC<NotificationsLoadingStateProps> = ({
  onRefresh
}) => {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">התראות אחרונות</h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onRefresh}
          className="text-ofair-blue"
        >
          <RefreshCw className="h-4 w-4 ml-1" />
          רענן
        </Button>
      </div>
      <div className="bg-white rounded-xl overflow-hidden shadow">
        <div className="flex justify-center items-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-ofair-blue" />
          <span className="mr-2 text-gray-600">טוען התראות...</span>
        </div>
      </div>
    </div>
  );
};

export default NotificationsLoadingState;
