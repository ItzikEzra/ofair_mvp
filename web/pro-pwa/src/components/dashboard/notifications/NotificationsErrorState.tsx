
import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NotificationsErrorStateProps {
  error: string;
  onRefresh: () => void;
}

const NotificationsErrorState: React.FC<NotificationsErrorStateProps> = ({
  error,
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
        <div className="flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-700 mb-4 text-center">{error}</p>
          <Button 
            onClick={onRefresh} 
            variant="outline"
            size="sm"
          >
            נסה שנית
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationsErrorState;
