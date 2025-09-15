
import React from "react";
import { Button } from "@/components/ui/button";
import { BellOff } from "lucide-react";

interface NotificationsEmptyStateProps {
  professionalId: string | null;
  isLoading: boolean;
  error: string | null;
  forceLoaded: boolean;
  onRefresh: () => void;
}

const NotificationsEmptyState: React.FC<NotificationsEmptyStateProps> = ({
  onRefresh
}) => {
  return (
    <div className="p-6 text-center">
      <BellOff className="mx-auto h-8 w-8 text-gray-400 mb-3" />
      <p className="text-gray-600 mb-3">אין התראות חדשות</p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        className="text-sm"
      >
        רענן
      </Button>
    </div>
  );
};

export default NotificationsEmptyState;
