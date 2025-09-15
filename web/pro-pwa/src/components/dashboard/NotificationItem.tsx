import React from "react";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";
import { Bell, CheckCircle, Calendar, DollarSign, MessageSquare, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ExpandableText from "@/components/ui/ExpandableText";

interface NotificationItemProps {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  isRead: boolean;
  type?: string;
  relatedId?: string;
  relatedType?: string;
  isNew?: boolean;
  markAsRead?: (id: string) => void;
  onShowDetails?: (id: string) => void;
  onRead?: () => void;
  onDelete?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  description,
  createdAt,
  isRead,
  type = "general",
  relatedId,
  relatedType,
  isNew = false,
  markAsRead,
  onShowDetails,
  onRead,
  onDelete
}) => {
  const getIcon = () => {
    switch (type) {
      case "proposal_accepted":
        return <CheckCircle size={20} className="text-green-500" />;
      case "reminder":
        return <Calendar size={20} className="text-blue-500" />;
      case "commission":
        return <DollarSign size={20} className="text-yellow-500" />;
      case "payment":
        return <DollarSign size={20} className="text-green-500" />;
      case "lead_status":
        return <MessageSquare size={20} className="text-purple-500" />;
      case "new_direct_inquiry":
        return <MessageSquare size={20} className="text-ofair-blue" />;
      case "new_proposal":
        return <Bell size={20} className="text-ofair-turquoise" />;
      case "new_lead_in_area":
        return <Bell size={20} className="text-orange-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getTypeLabel = () => {
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

  const formattedTime = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: he,
  });

  const handleClick = () => {
    if (onShowDetails) {
      onShowDetails(id);
    } else if (onRead) {
      onRead();
    }
  };

  return (
    <div
      className={`p-4 flex items-start border-b border-gray-100 last:border-b-0 ${
        !isRead ? "bg-blue-50" : ""
      } hover:bg-gray-50 transition-colors cursor-pointer`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0 mt-1 ml-3">{getIcon()}</div>
      <div className="flex-grow min-w-0">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 className={`text-sm font-medium ${!isRead ? "font-bold" : ""} text-gray-900`}>
                {title}
              </h3>
              {isNew && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                  חדש
                </span>
              )}
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                {getTypeLabel()}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse ml-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 size={14} />
                <span className="sr-only">מחק</span>
              </Button>
            )}
            {!isRead && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onRead?.();
                }}
              >
                <X size={14} />
                <span className="sr-only">סמן כנקרא</span>
              </Button>
            )}
          </div>
        </div>
        
        <ExpandableText 
          text={description}
          wordLimit={10}
          className="text-sm text-gray-600 mb-2"
          showButtonInline={false}
        />
        
        <div className="text-xs text-gray-500">
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;
