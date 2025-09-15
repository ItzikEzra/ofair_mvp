
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { BellOff } from "lucide-react";

const NotificationsEmptyState: React.FC = () => {
  return (
    <Card>
      <CardContent className="text-center py-12">
        <BellOff className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          אין התראות חדשות
        </h3>
        <p className="text-gray-500">
          כל ההתראות יופיעו כאן כשיהיו
        </p>
      </CardContent>
    </Card>
  );
};

export default NotificationsEmptyState;
