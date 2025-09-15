
import { useNavigate } from "react-router-dom";

export const useNotificationsNavigation = () => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    console.log("[NOTIFICATIONS SECTION DEBUG] Notification clicked:", notification.id);
    
    // Navigate based on notification type and related_id
    const { type, related_id } = notification;
    
    if (type === "new_direct_inquiry" && related_id) {
      navigate(`/my-jobs?tab=inquiries&id=${related_id}`);
    } else if (type === "new_proposal" && related_id) {
      // הצעות מחיר שהתקבלו עבור הלידים שלי - מוביל לליד הרלוונטי
      navigate(`/my-leads?id=${related_id}`);
    } else if (type === "proposal_accepted" && related_id) {
      navigate(`/my-jobs?tab=proposals&id=${related_id}`);
    } else if (type === "new_lead_in_area" && related_id) {
      navigate(`/leads?id=${related_id}`);
    } else {
      // Fallback navigation
      if (type === "new_direct_inquiry") {
        navigate("/my-jobs?tab=inquiries");
      } else if (type === "new_proposal") {
        // הצעות מחיר חדשות - מוביל ללידים שלי
        navigate("/my-leads");
      } else if (type === "proposal_accepted") {
        navigate("/my-jobs?tab=proposals");
      } else {
        navigate("/my-jobs");
      }
    }
  };

  const handleDialogNavigation = (notificationType: string) => {
    if (notificationType === 'new_direct_inquiry') {
      navigate("/my-jobs?tab=inquiries");
    } else if (notificationType === 'new_proposal') {
      // הצעות מחיר חדשות - מוביל ללידים שלי
      navigate("/my-leads");
    } else {
      navigate("/my-jobs?tab=proposals");
    }
  };

  return {
    handleNotificationClick,
    handleDialogNavigation
  };
};
