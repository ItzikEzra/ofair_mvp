import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCheck, Trash2, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
interface NotificationsHeaderProps {
  unreadCount: number;
  notificationsCount: number;
  isLoading: boolean;
  isMarkingAllAsRead: boolean;
  isDeletingAll: boolean;
  onMarkAllAsRead: () => void;
  onDeleteAll: () => void;
  onRefresh: () => void;
}
const NotificationsHeader: React.FC<NotificationsHeaderProps> = ({
  unreadCount,
  notificationsCount,
  isLoading,
  isMarkingAllAsRead,
  isDeletingAll,
  onMarkAllAsRead,
  onDeleteAll,
  onRefresh
}) => {
  return <div className="mb-6 space-y-4">
      {/* Title Section */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-right">ההתראות שלי</h2>
        {unreadCount > 0 && <p className="text-sm text-gray-600 mt-1 text-right">
            {unreadCount} התראות חדשות
          </p>}
      </div>
      
      {/* Actions Section */}
      <div className="flex flex-wrap justify-center gap-2">
        {notificationsCount > 0 && <>
            {unreadCount > 0 && <Button variant="outline" size="sm" onClick={onMarkAllAsRead} disabled={isMarkingAllAsRead}>
                <CheckCheck className={`ml-2 h-4 w-4 ${isMarkingAllAsRead ? 'animate-spin' : ''}`} />
                {isMarkingAllAsRead ? 'מסמן...' : 'סמן הכל כנקרא'}
              </Button>}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeletingAll}>
                  <Trash2 className="ml-2 h-4 w-4" />
                  {isDeletingAll ? 'מוחק...' : 'מחק הכל'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
                  <AlertDialogDescription>
                    פעולה זו תמחק את כל ההתראות לצמיתות. לא ניתן לבטל פעולה זו.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ביטול</AlertDialogCancel>
                  <AlertDialogAction onClick={onDeleteAll} className="bg-red-600 hover:bg-red-700">
                    מחק הכל
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>}
        <Button variant="outline" onClick={onRefresh} disabled={isLoading} size="sm">
          <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>
    </div>;
};
export default NotificationsHeader;