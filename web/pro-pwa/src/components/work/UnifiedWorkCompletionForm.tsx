
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { getAuthToken } from "@/utils/storageUtils";

interface UnifiedWorkCompletionFormProps {
  workTitle: string;
  proposalId: string;
  proposalType: 'proposal' | 'quote' | 'referral' | 'lead' | 'request';
  onComplete: () => void;
  onClose: () => void;
}

const UnifiedWorkCompletionForm: React.FC<UnifiedWorkCompletionFormProps> = ({
  workTitle,
  proposalId,
  proposalType,
  onComplete,
  onClose
}) => {
  const [finalAmount, setFinalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canComplete, setCanComplete] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [leadSharePercentage, setLeadSharePercentage] = useState(0);
  const [originalPrice, setOriginalPrice] = useState<number | null>(null);
  const [priceChanged, setPriceChanged] = useState(false);
  const { toast } = useToast();
  const { professionalId, isLoading: isProfessionalIdLoading } = useProfessionalId();

  const paymentMethods = [
    { value: "cash", label: "מזומן" },
    { value: "ofair_credit", label: "אשראי דרך OFAIR" },
    { value: "bank_transfer", label: "העברה בנקאית" },
    { value: "check", label: "המחאה" },
    { value: "other", label: "אחר" }
  ];

  useEffect(() => {
    const checkIfCanComplete = async () => {
      console.log("[UNIFIED_WORK_COMPLETION] Checking permissions for:", { workTitle, proposalId, proposalType });
      console.log("[UNIFIED_WORK_COMPLETION] Current professional ID:", professionalId);
      
      if (isProfessionalIdLoading) {
        console.log("[UNIFIED_WORK_COMPLETION] Still loading professional ID...");
        return;
      }
      
      if (!professionalId) {
        console.error("[UNIFIED_WORK_COMPLETION] No professional ID available");
        setErrorMessage("לא ניתן לזהות את פרופיל בעל המקצוע");
        setCanComplete(false);
        return;
      }
      
      try {
        // For referrals, check directly in referrals table
        if (proposalType === 'referral') {
          console.log('[UNIFIED_WORK_COMPLETION] Checking referral:', { proposalId, professionalId });
          
          // Use direct query without relying on auth.uid() since we're using OTP auth
          const { data, error } = await supabase
            .from('referrals')
            .select('professional_id, status')
            .eq('id', proposalId)
            .eq('professional_id', professionalId) // Add explicit professional filter
            .maybeSingle();

          console.log('[UNIFIED_WORK_COMPLETION] Referral query result:', { data, error });

          if (error || !data) {
            console.error('[UNIFIED_WORK_COMPLETION] Referral not found or access denied:', error);
            setErrorMessage("הפנייה לא נמצאה או שאין לך הרשאה לגשת אליה");
            setCanComplete(false);
            return;
          }

          const referralData = data as any;
          console.log('[UNIFIED_WORK_COMPLETION] Professional comparison:', {
            referralProfessionalId: referralData.professional_id,
            currentProfessionalId: professionalId,
            professionalIdType: typeof professionalId,
            referralProfessionalIdType: typeof referralData.professional_id,
            isEqual: referralData.professional_id === professionalId
          });
          
          const isOwner = referralData.professional_id === professionalId;
          if (!isOwner) {
            console.error('[UNIFIED_WORK_COMPLETION] Professional ID mismatch');
            setErrorMessage("רק בעל המקצוע שביצע את העבודה יכול לסמן השלמה");
            setCanComplete(false);
            return;
          }

          setCanComplete(true);
          return;
        }

        // For proposals/quotes, check the appropriate table based on proposalType
        const validStatuses = ['accepted', 'approved', 'waiting_for_rating', 'scheduled'];
        
        if (proposalType === 'proposal' || proposalType === 'lead') {
          console.log(`[UNIFIED_WORK_COMPLETION] Checking proposals table for proposal ${proposalId}`);
          
          const { data: proposalData, error: proposalError } = await supabase
            .from('proposals')
            .select('professional_id, status, lead_id, price')
            .eq('id', proposalId)
            .maybeSingle();

          if (proposalError || !proposalData) {
            console.error(`[UNIFIED_WORK_COMPLETION] Error fetching from proposals:`, proposalError);
            setErrorMessage("ההצעה לא נמצאה");
            setCanComplete(false);
            return;
          }

          const isOwner = proposalData.professional_id === professionalId;
          const isValidStatus = validStatuses.includes(proposalData.status);

          console.log(`[UNIFIED_WORK_COMPLETION] Status check:`, { 
            status: proposalData.status,
            isValidStatus,
            isOwner
          });

          if (!isOwner) {
            setErrorMessage("רק בעל המקצוע שביצע את העבודה יכול לסמן השלמה");
            setCanComplete(false);
            return;
          }

          if (!isValidStatus) {
            setErrorMessage(`ניתן לסמן השלמת עבודה רק להצעות מאושרות. סטטוס נוכחי: ${proposalData.status}`);
            setCanComplete(false);
            return;
          }

          // Set original price from proposal
          if (proposalData.price) {
            const price = parseFloat(proposalData.price.toString());
            setOriginalPrice(price);
            setFinalAmount(price.toString());
          }

          // If this is a lead proposal, get the lead's share percentage
          if (proposalData.lead_id) {
            const { data: leadData } = await supabase
              .from('leads')
              .select('share_percentage')
              .eq('id', proposalData.lead_id)
              .maybeSingle();
            
            if (leadData?.share_percentage) {
              setLeadSharePercentage(leadData.share_percentage);
            }
          }

          console.log(`[UNIFIED_WORK_COMPLETION] Permission check passed for proposals`);
        } else if (proposalType === 'quote' || proposalType === 'request') {
          console.log(`[UNIFIED_WORK_COMPLETION] Checking quotes table for quote ${proposalId}`);
          
          const { data: quoteData, error: quoteError } = await supabase
            .from('quotes')
            .select('professional_id, status, request_status, price')
            .eq('id', proposalId)
            .maybeSingle();

          if (quoteError || !quoteData) {
            console.error(`[UNIFIED_WORK_COMPLETION] Error fetching from quotes:`, quoteError);
            setErrorMessage("ההצעה לא נמצאה");
            setCanComplete(false);
            return;
          }

          const isOwner = quoteData.professional_id === professionalId;
          // For quotes, check both status and request_status
          const isValidStatus = validStatuses.includes(quoteData.status) || 
                               validStatuses.includes(quoteData.request_status) ||
                               quoteData.request_status === 'approved';

          console.log(`[UNIFIED_WORK_COMPLETION] Status check:`, { 
            status: quoteData.status,
            request_status: quoteData.request_status,
            isValidStatus,
            isOwner
          });

          if (!isOwner) {
            setErrorMessage("רק בעל המקצוע שביצע את העבודה יכול לסמן השלמה");
            setCanComplete(false);
            return;
          }

          if (!isValidStatus) {
            setErrorMessage(`ניתן לסמן השלמת עבודה רק להצעות מאושרות. סטטוס נוכחי: ${quoteData.status}`);
            setCanComplete(false);
            return;
          }

          // Set original price from quote
          if (quoteData.price) {
            const price = parseFloat(quoteData.price.toString());
            setOriginalPrice(price);
            setFinalAmount(price.toString());
          }

          console.log(`[UNIFIED_WORK_COMPLETION] Permission check passed for quotes`);
        } else {
          setErrorMessage("סוג הצעה לא חוקי");
          setCanComplete(false);
          return;
        }
        setCanComplete(true);
      } catch (error) {
        console.error("[UNIFIED_WORK_COMPLETION] Error checking permissions:", error);
        setErrorMessage("שגיאה בבדיקת הרשאות");
        setCanComplete(false);
      }
    };

    checkIfCanComplete();
  }, [proposalId, proposalType, professionalId, isProfessionalIdLoading]);

  // Check if price changed
  useEffect(() => {
    if (originalPrice && finalAmount) {
      const currentAmount = parseFloat(finalAmount);
      setPriceChanged(Math.abs(currentAmount - originalPrice) > 0.01);
    }
  }, [finalAmount, originalPrice]);

  const handleSubmit = async () => {
    if (!canComplete) {
      toast({
        title: "אין הרשאה",
        description: errorMessage || "לא ניתן לבצע פעולה זו",
        variant: "destructive"
      });
      return;
    }

    if (!finalAmount || isNaN(parseFloat(finalAmount)) || parseFloat(finalAmount) <= 0) {
      toast({
        title: "שגיאה",
        description: "יש להזין סכום תשלום תקין",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!professionalId) {
        throw new Error("לא ניתן לזהות את פרופיל בעל המקצוע");
      }

      if (proposalType === 'referral') {
        // For referrals, save directly to work_completions
        const { error: insertError } = await supabase
          .from('work_completions')
          .insert({
            professional_id: professionalId as any,
            referral_id: proposalId as any,
            proposal_type: 'referral' as any,
            work_title: workTitle,
            status: 'completed' as any,
            notes: notes || null,
            final_amount: parseFloat(finalAmount),
            payment_method: paymentMethod
          } as any);

        if (insertError) {
          throw insertError;
        }

        // Update referral status
        await supabase
          .from('referrals')
          .update({ status: 'completed', completed_work: true })
          .eq('id', proposalId as any);

      } else {
        // For proposals and quotes, use the edge function
        console.log(`[UNIFIED_WORK_COMPLETION] Calling edge function with:`, {
          proposalId,
          proposalType,
          finalAmount: parseFloat(finalAmount),
          paymentMethod,
          notes
        });
        
        // Get OTP auth token for the edge function call
        const authToken = getAuthToken();
        if (!authToken) {
          throw new Error("אסימון אימות לא נמצא. נא להיכנס מחדש למערכת.");
        }
        
        // Call edge function with OTP token in authorization header
        const response = await fetch(`https://erlfsougrkzbgonumhoa.supabase.co/functions/v1/update-work-completion`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybGZzb3Vncmt6YmdvbnVtaG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE5NjMyMjIsImV4cCI6MjA1NzUzOTIyMn0.TRDZlAhYRDavo4ICaEgb9EKryo4qRJDoyhlz5udr8p8',
          },
          body: JSON.stringify({
            proposalId,
            proposalType,
            finalAmount: parseFloat(finalAmount),
            paymentMethod,
            notes
          })
        });
        
        const result = await response.json();

        console.log(`[UNIFIED_WORK_COMPLETION] Edge function response:`, result);
        
        if (!response.ok || !result?.success) {
          console.error(`[UNIFIED_WORK_COMPLETION] Edge function error:`, result);
          throw new Error(result?.error || "שגיאה בעדכון השלמת העבודה");
        }
      }

      toast({
        title: "העבודה הושלמה בהצלחה!",
        description: "פרטי התשלום נשמרו"
      });

      // Trigger refresh of dashboard and payments data
      window.dispatchEvent(new CustomEvent('workCompleted', { 
        detail: { professionalId, proposalType } 
      }));

      onComplete();
      onClose();
    } catch (error: any) {
      console.error("Error completing work:", error);
      toast({
        title: "שגיאה בהשלמת העבודה",
        description: error.message || "אירעה שגיאה בעדכון סטטוס העבודה",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (canComplete === null) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
        <p className="text-gray-600">בודק הרשאות...</p>
      </div>
    );
  }

  // Show error state
  if (canComplete === false) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <div className="mb-4">
          <AlertCircle className="h-12 w-12 mx-auto mb-2 text-red-500" />
          <h3 className="text-lg font-bold mb-2 text-red-600">לא ניתן לבצע פעולה זו</h3>
          <p className="text-gray-700">{errorMessage}</p>
        </div>
        <Button onClick={onClose} variant="outline" className="w-full">
          סגור
        </Button>
      </div>
    );
  }

  // Show form
  return (
    <div className="p-6 max-w-md mx-auto" dir="rtl">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2 text-center">סיום עבודה</h3>
        <Card className="p-3 bg-blue-50">
          <p className="font-medium text-blue-900">{workTitle}</p>
        </Card>
      </div>

      <div className="space-y-6">
        <div>
          <Label htmlFor="final-amount" className="text-base font-medium">
            סכום תשלום סופי (₪) *
          </Label>
          <Input
            id="final-amount"
            type="number"
            value={finalAmount}
            onChange={(e) => setFinalAmount(e.target.value)}
            placeholder="הזן את הסכום שהתקבל"
            required
            min="1"
            step="0.01"
            className="mt-2"
          />
          {priceChanged && originalPrice && (
            <p className="text-amber-600 text-sm mt-1">
              💡 הסכום השתנה מהמחיר המקורי (₪{originalPrice.toFixed(2)}) - נא לעדכן
            </p>
          )}
        </div>

        <div>
          <Label className="text-base font-medium mb-4 block">אמצעי תשלום *</Label>
          <RadioGroup
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            className="space-y-3"
            dir="rtl"
          >
            {paymentMethods.map((method) => (
              <Card key={method.value} className="p-3">
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={method.value} id={method.value} />
                  <Label
                    htmlFor={method.value}
                    className="flex-1 cursor-pointer font-medium text-right"
                  >
                    {method.label}
                  </Label>
                </div>
              </Card>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="notes" className="text-base font-medium">
            הערות נוספות (אופציונלי)
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="תוכל להוסיף כאן פרטים נוספים על ביצוע העבודה או התשלום..."
            className="mt-2"
            rows={4}
          />
        </div>

        {finalAmount && (
          <Card className="p-4 bg-green-50">
            <h4 className="font-medium mb-2 text-green-800">סיכום תשלום</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>סכום מלא:</span>
                <span className="font-medium">₪{parseFloat(finalAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>עמלת OFAIR ({(proposalType === 'proposal' || proposalType === 'lead') ? '5%' : '10%'}):</span>
                <span className="font-medium">-₪{(parseFloat(finalAmount) * ((proposalType === 'proposal' || proposalType === 'lead') ? 0.05 : 0.10)).toFixed(2)}</span>
              </div>
              {(proposalType === 'proposal' || proposalType === 'lead') && leadSharePercentage > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>עמלת שיתוף הליד ({leadSharePercentage}%):</span>
                  <span className="font-medium">-₪{(parseFloat(finalAmount) * (leadSharePercentage / 100)).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-1 flex justify-between font-bold text-green-700">
                <span>הרווח שלך:</span>
                <span>₪{(() => {
                  const amount = parseFloat(finalAmount);
                  const ofairCommission = amount * ((proposalType === 'proposal' || proposalType === 'lead') ? 0.05 : 0.10);
                  const leadShareCommission = (proposalType === 'proposal' || proposalType === 'lead') && leadSharePercentage > 0 
                    ? amount * (leadSharePercentage / 100) 
                    : 0;
                  return (amount - ofairCommission - leadShareCommission).toFixed(2);
                })()}</span>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                מעדכן...
              </>
            ) : (
              <>
                <CheckCircle className="ml-2 h-4 w-4" />
                סיים עבודה
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnifiedWorkCompletionForm;
