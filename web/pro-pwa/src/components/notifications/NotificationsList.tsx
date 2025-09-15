import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, CheckCheck, Calendar, DollarSign, MessageSquare, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import type { Notification } from "@/types/notifications";
interface NotificationsListProps {
  notifications: Notification[];
  markingAsRead: Set<string>;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: string, event: React.MouseEvent) => void;
}
const NotificationsList: React.FC<NotificationsListProps> = ({
  notifications,
  markingAsRead,
  onNotificationClick,
  onMarkAsRead
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "proposal_accepted":
        return <CheckCheck size={20} className="text-green-500" />;
      case "reminder":
        return <Calendar size={20} className="text-blue-500" />;
      case "commission":
        return <DollarSign size={20} className="text-yellow-500" />;
      case "payment":
        return <DollarSign size={20} className="text-green-500" />;
      case "lead_status":
        return <MessageSquare size={20} className="text-purple-500" />;
      case "new_direct_inquiry":
        return <Phone size={20} className="text-ofair-blue" />;
      case "new_proposal":
        return <Bell size={20} className="text-ofair-turquoise" />;
      case "new_lead_in_area":
        return <Bell size={20} className="text-orange-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "new_direct_inquiry":
        return "פנייה ישירה";
      case "new_proposal":
        return "הצעת מחיר";
      case "new_lead_in_area":
        return "ליד באזור";
      case "proposal_accepted":
        return "הצעה התקבלה";
      case "reminder":
        return "תזכורת";
      case "commission":
        return "עמלה";
      case "payment":
        return "תשלום";
      case "lead_status":
        return "עדכון ליד";
      default:
        return "כללי";
    }
  };
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: he
      });
    } catch {
      return 'זמן לא ידוע';
    }
  };
  return <div className="space-y-4">
      {notifications.map(notification => {
      const isMarking = markingAsRead.has(notification.id);
      return <Card key={notification.id} className={`transition-all hover:shadow-md cursor-pointer ${!notification.is_read ? 'border-blue-200 bg-blue-50' : ''}`} onClick={() => onNotificationClick(notification)}>
            <CardContent className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1 ml-3">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-grow min-w-0">
                  {/* Header with title, type badge and new badge */}
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <h3 className={`text-lg font-medium ${!notification.is_read ? "font-bold" : ""} text-gray-900`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs px-2 py-1 bg-amber-100 bg-blue-100 rounded-full text-blue-600">
                      {getTypeLabel(notification.type)}
                    </span>
                    {!notification.is_read && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                        חדש
                      </span>}
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-700 mb-4">{notification.description}</p>
                  
                  {/* Client details */}
                  {notification.client_details && <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <h4 className="font-medium mb-2">פרטי הלקוח:</h4>
                      <div className="text-sm space-y-1">
                        {notification.client_details.name && <div><span className="font-medium">שם:</span> {notification.client_details.name}</div>}
                        {notification.client_details.phone && <div><span className="font-medium">טלפון:</span> {notification.client_details.phone}</div>}
                        {notification.client_details.workDate && <div><span className="font-medium">תאריך עבודה:</span> {notification.client_details.workDate}</div>}
                        {notification.client_details.workTime && <div><span className="font-medium">שעת עבודה:</span> {notification.client_details.workTime}</div>}
                      </div>
                    </div>}
                  
                  {/* Footer with time and action button */}
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(notification.created_at)}
                    </div>
                    <div>
                      {!notification.is_read && <Button variant="outline" size="sm" onClick={e => onMarkAsRead(notification.id, e)} disabled={isMarking}>
                          {isMarking ? 'מסמן...' : 'סמן כנקרא'}
                        </Button>}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>;
    })}
    </div>;
};
export default NotificationsList;