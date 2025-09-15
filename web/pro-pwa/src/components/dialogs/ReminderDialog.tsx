
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, isBefore } from "date-fns";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: {
    id: string;
    proposal_id: string;
    proposal_type: string;
    proposal: {
      description: string;
      lead_id?: string;
      request_id?: string;
      scheduled_date?: string;
    };
  } | null;
  onScheduleComplete?: () => void;
}

const ReminderDialog: React.FC<ReminderDialogProps> = ({ 
  open, 
  onOpenChange, 
  reminder, 
  onScheduleComplete 
}) => {
  const { toast } = useToast();
  const [workDate, setWorkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [workTime, setWorkTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [finalAmount, setFinalAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isPastDueWork, setIsPastDueWork] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (reminder?.proposal?.scheduled_date) {
      // Check if the scheduled date is in the past
      const scheduledDate = new Date(reminder.proposal.scheduled_date);
      const today = new Date();
      // Remove time part for proper date comparison
      today.setHours(0, 0, 0, 0);
      
      setIsPastDueWork(isBefore(scheduledDate, today));
      
      // If it's already scheduled, use that date
      setWorkDate(format(scheduledDate, "yyyy-MM-dd"));
    } else {
      setWorkDate(format(new Date(), "yyyy-MM-dd"));
      setIsPastDueWork(false);
    }
  }, [reminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reminder?.proposal_id) {
      toast({
        title: "נתונים חסרים",
        description: "מידע חסר עבור התזכורת",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (isPastDueWork) {
        // Complete the work with payment details
        if (!finalAmount || isNaN(parseFloat(finalAmount)) || parseFloat(finalAmount) <= 0) {
          toast({
            title: "סכום לא תקין",
            description: "יש להזין סכום תשלום תקין",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("update-work-completion", {
          body: {
            proposalId: reminder.proposal_id,
            proposalType: reminder.proposal_type,
            finalAmount: parseFloat(finalAmount),
            paymentMethod,
            notes
          }
        });

        if (error) {
          throw new Error(error.message);
        }

        toast({
          title: "העבודה הושלמה בהצלחה",
          description: "פרטי התשלום עודכנו"
        });
      } else {
        // Schedule the work
        if (!workDate) {
          toast({
            title: "נתונים חסרים",
            description: "יש להזין תאריך לפחות",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }
        
        const { data, error } = await supabase.functions.invoke("update-proposal-scheduling", {
          body: {
            proposalId: reminder.proposal_id,
            proposalType: reminder.proposal_type,
            workDate,
            workTime
          }
        });
        
        if (error) {
          throw new Error(error.message);
        }
        
        toast({
          title: "התזמון נשמר בהצלחה",
          description: "העבודה נוספה לפרויקטים שלך"
        });
      }
      
      setSuccess(true);
      
    } catch (err) {
      console.error("Error handling reminder:", err);
      toast({
        title: "שגיאה בשמירת הנתונים",
        description: "אירעה שגיאה בעת שמירת הנתונים",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleClose = () => {
    if (success && onScheduleComplete) {
      onScheduleComplete();
    }
    onOpenChange(false);
    // Reset the form state after closing
    setSuccess(false);
    setFinalAmount("");
    setNotes("");
    setPaymentMethod("cash");
  };

  const reminderDescription = reminder?.proposal?.description || "";
  const shortDescription = reminderDescription.length > 100 
    ? `${reminderDescription.substring(0, 100)}...` 
    : reminderDescription;

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <div className="text-center p-4">
            <div className="text-green-600 mb-4">
              <CheckCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="font-bold text-lg mb-2">
              {isPastDueWork ? "העבודה הושלמה בהצלחה" : "התזמון נקבע בהצלחה"}
            </h3>
            <p className="text-gray-600 mb-4">
              {isPastDueWork ? "פרטי התשלום עודכנו והעבודה הושלמה" : "העבודה תוזמנה בהצלחה"}
            </p>
            <Button onClick={handleClose}>סגור</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            {isPastDueWork ? "סיום עבודה ותשלום" : "קביעת מועד לעבודה"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-blue-50 p-4 mb-4 rounded-md">
            <p className="text-blue-800 text-sm">
              {shortDescription}
            </p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              {isPastDueWork ? (
                // Payment form for past-due work
                <>
                  <div className="space-y-2">
                    <Label htmlFor="finalAmount">סכום סופי שהתקבל (₪)</Label>
                    <Input
                      id="finalAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      placeholder="הכנס סכום"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>אמצעי תשלום</Label>
                    <RadioGroup 
                      value={paymentMethod} 
                      onValueChange={setPaymentMethod}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash">מזומן</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="check" id="check" />
                        <Label htmlFor="check">צ'ק</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="credit" id="credit" />
                        <Label htmlFor="credit">כרטיס אשראי</Label>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <RadioGroupItem value="bank" id="bank" />
                        <Label htmlFor="bank">העברה בנקאית</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">הערות (אופציונלי)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="הערות לגבי התשלום או העבודה..."
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                // Scheduling form for future work
                <>
                  <div className="space-y-2">
                    <Label htmlFor="workDate">תאריך עבודה</Label>
                    <div className="relative">
                      <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="workDate"
                        type="date"
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workTime">שעת עבודה (אופציונלי)</Label>
                    <div className="relative">
                      <Clock size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        id="workTime"
                        type="time"
                        value={workTime}
                        onChange={(e) => setWorkTime(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  {isPastDueWork ? "ביטול" : "דחה לפעם הבאה"}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? "שומר..." 
                    : (isPastDueWork ? "סיים עבודה" : "קבע תאריך")
                  }
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
