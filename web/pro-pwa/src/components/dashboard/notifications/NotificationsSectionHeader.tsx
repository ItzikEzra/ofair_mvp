import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
interface NotificationsSectionHeaderProps {
  unreadCount: number;
  onRefresh: () => void;
}
const NotificationsSectionHeader: React.FC<NotificationsSectionHeaderProps> = ({
  unreadCount,
  onRefresh
}) => {
  return <div className="flex justify-between items-center mb-3">
      <h2 className="text-xl font-bold text-ofair-blue">
        התראות אחרונות
        {unreadCount > 0 && <span className="text-ofair-blue"> ({unreadCount})</span>}
      </h2>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRefresh} className="text-ofair-blue">
          <RefreshCw className="h-4 w-4 ml-1" />
          רענן
        </Button>
        <a href="/notifications" className="text-ofair-blue text-sm font-medium">
          הצג הכל
        </a>
      </div>
    </div>;
};
export default NotificationsSectionHeader;