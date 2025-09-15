
import React from "react";
import { TestTube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createTestReferral } from "./testReferralUtils";
import { useToast } from "@/hooks/use-toast";

const DirectInquiriesEmptyState: React.FC = () => {
  const { toast } = useToast();

  const handleCreateTestReferral = async () => {
    try {
      await createTestReferral();
      toast({
        title: "פנייה נוצרה בהצלחה!",
        description: "פנייה לבדיקה נוצרה - תקבל התראה תוך כמה שניות",
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "לא ניתן ליצור פנייה לבדיקה",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-center p-8 bg-white rounded-xl shadow-md">
      <p className="text-gray-500">אין פניות ישירות בינתיים</p>
      <p className="text-sm text-gray-400 mt-2">פניות ישירות חדשות יופיעו כאן</p>
      
      <div className="mt-4">
        <Button
          onClick={handleCreateTestReferral}
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
        >
          <TestTube size={16} className="mr-1" />
          צור פנייה לבדיקה
        </Button>
      </div>
    </div>
  );
};

export default DirectInquiriesEmptyState;
