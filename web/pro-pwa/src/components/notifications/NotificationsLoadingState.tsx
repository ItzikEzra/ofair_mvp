
import React from "react";
import { RefreshCw } from "lucide-react";

const NotificationsLoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-ofair-blue" />
        <p className="text-gray-600">טוען התראות...</p>
      </div>
    </div>
  );
};

export default NotificationsLoadingState;
