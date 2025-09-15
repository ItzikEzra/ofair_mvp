
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export const createTestReferral = async () => {
  try {
    console.log("[TEST_REFERRAL] Creating test referral...");
    
    const { data, error } = await supabase.functions.invoke('test-referral', {
      body: { professionalId: 'cce2c316-9fb2-4fa6-88a5-38f9bb46a382' }
    });

    if (error) {
      console.error("[TEST_REFERRAL] Error:", error);
      toast({
        title: "שגיאה ביצירת פנייה בדיקה",
        description: "לא ניתן ליצור פנייה לבדיקה",
        variant: "destructive"
      });
      return;
    }

    console.log("[TEST_REFERRAL] Success:", data);
    toast({
      title: "פנייה בדיקה נוצרה",
      description: "נוצרה פנייה ישירה לבדיקה בהצלחה",
    });
  } catch (err) {
    console.error("[TEST_REFERRAL] Unexpected error:", err);
    toast({
      title: "שגיאה",
      description: "אירעה שגיאה בלתי צפויה",
      variant: "destructive"
    });
  }
};
