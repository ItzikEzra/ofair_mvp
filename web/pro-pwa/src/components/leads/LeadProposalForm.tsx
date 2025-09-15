import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import LowerPriceOption from "./LowerPriceOption";
import CompletionTimeSelect from "./CompletionTimeSelect";
import { getAuthToken } from "@/utils/storageUtils";
interface LeadProposalFormProps {
  leadId: string;
  leadTitle: string;
  leadBudget: number;
  sharePercentage: number;
  onClose: () => void;
}
const LeadProposalForm: React.FC<LeadProposalFormProps> = ({
  leadId,
  leadTitle,
  leadBudget,
  sharePercentage,
  onClose
}) => {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLowerPriceWilling, setIsLowerPriceWilling] = useState(false);
  const [lowerPrice, setLowerPrice] = useState("");
  const {
    toast
  } = useToast();
  const {
    professionalId
  } = useProfessionalId();
  const hasBudget = leadBudget && leadBudget > 0;

  // Calculate correct financial breakdown with lead provider payment
  const getFinancialBreakdown = () => {
    if (!hasBudget) return null;
    const totalBudget = leadBudget;
    const leadProviderAmount = totalBudget * (sharePercentage / 100);
    const ofairCommission = totalBudget * 0.05; // Always 5% for oFair
    const yourEarnings = totalBudget - leadProviderAmount - ofairCommission;
    return {
      totalBudget,
      leadProviderGets: leadProviderAmount,
      yourEarnings: yourEarnings,
      ofairCommission: ofairCommission
    };
  };
  const breakdown = getFinancialBreakdown();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Price is optional for leads without budget
    if (!description) {
      toast({
        title: "שגיאה",
        description: "יש למלא תיאור",
        variant: "destructive"
      });
      return;
    }
    if (!professionalId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא פרופיל בעל מקצוע",
        variant: "destructive"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      console.log("Submitting proposal with data:", {
        professionalId,
        leadId,
        price: hasBudget ? leadBudget : (price ? parseFloat(price) : null),
        description,
        estimatedCompletion,
        sharePercentage,
        lowerPriceOption: isLowerPriceWilling ? {
          willing: true,
          price: lowerPrice
        } : undefined
      });
      
      // Get auth token for secure submission
      const authToken = getAuthToken();
      
      // Check if user is authenticated
      if (!authToken && !professionalId) {
        toast({
          title: "נדרשת אימות",
          description: "אנא התחבר מחדש כדי לשלוח הצעת מחיר",
          variant: "destructive"
        });
        window.location.href = '/auth';
        return;
      }
      
      // Try secure RPC function first
      let { data, error } = await supabase.rpc('submit_proposal_secure', {
        p_lead_id: leadId,
        p_price: hasBudget ? leadBudget : (price ? parseFloat(price) : null),
        p_description: description,
        p_estimated_completion: estimatedCompletion || null,
        p_sample_image_url: null,
        p_lower_price_willing: isLowerPriceWilling,
        p_lower_price_value: isLowerPriceWilling && lowerPrice ? parseFloat(lowerPrice) : null,
        token_param: authToken
      });
      
      // If RPC fails, fallback to edge function
      if (error) {
        console.log('RPC failed, trying edge function:', error);
        const response = await supabase.functions.invoke('submit-proposal', {
          body: {
            professionalId,
            announcementId: leadId,
            announcementType: 'lead',
            price: hasBudget ? leadBudget : (price ? parseFloat(price) : null),
            description,
            estimatedCompletion,
            lowerPriceOption: isLowerPriceWilling ? {
              willing: true,
              price: lowerPrice
            } : undefined
          }
        });
        data = response.data;
        error = response.error;
      }
      if (error) {
        console.error("Error submitting proposal:", error);
        const errorMessage = error.message || "אירעה שגיאה בשליחת ההצעה";
        
        // Check for specific error cases
        if (errorMessage.includes("already submitted") || errorMessage.includes("כבר שלחת")) {
          toast({
            title: "הצעה קיימת",
            description: "כבר שלחת הצעת מחיר עבור ליד זה",
            variant: "destructive"
          });
        } else if (errorMessage.includes("Authentication required") || errorMessage.includes("אימות")) {
          toast({
            title: "נדרשת אימות",
            description: "אנא התחבר מחדש כדי לשלוח הצעת מחיר",
            variant: "destructive"
          });
          window.location.href = '/auth';
        } else {
          toast({
            title: "שגיאה בשליחת הצעת המחיר",
            description: errorMessage,
            variant: "destructive"
          });
        }
        return;
      }
      console.log("Proposal submitted successfully:", data);
      toast({
        title: "הצעת המחיר נשלחה בהצלחה!",
        description: "ההצעה שלך נשלחה בהצלחה למפרסם הליד"
      });
      onClose();
      
      // Trigger custom event to notify about new proposal
      const event = new CustomEvent('proposalSubmitted', { 
        detail: { proposalId: data, type: 'lead' } 
      });
      window.dispatchEvent(event);
    } catch (err) {
      console.error("Failed to submit proposal:", err);
      toast({
        title: "שגיאה",
        description: "אירעה שגיאה בלתי צפויה",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="p-4 max-w-md mx-auto" dir="rtl">
      {/* Lead details summary */}
      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <h3 className="font-bold">{leadTitle}</h3>
        {hasBudget && breakdown ? <div className="space-y-2 text-sm mt-3">
            <div className="bg-white p-3 rounded-md border">
              <h4 className="font-semibold mb-2 text-gray-800">פירוט פיננסי:</h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-ofair-blue">סכום כולל שישולם הלקוח:</span>
                  <span className="font-semibold">{formatCurrency(breakdown.totalBudget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">הרווח שלי (נטו):</span>
                  <span className="font-semibold text-green-600">{formatCurrency(breakdown.yourEarnings)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">תשלום לנותן הליד ({sharePercentage}%):</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(breakdown.leadProviderGets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">עמלה oFair (5%):</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(breakdown.ofairCommission)}</span>
                </div>
              </div>
            </div>
          </div> : <div className="text-sm text-amber-600 mt-2">
            ללא תקציב מוגדר - עמלת oFair: 5%
          </div>}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {/* Only show price input for leads without budget */}
          {!hasBudget && <div className="space-y-1">
              <Label htmlFor="price">מחיר מוצע (₪) (אופציונלי)</Label>
              <Input id="price" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="הזן מחיר (אופציונלי)" />
            </div>}

          <div className="space-y-1">
            <Label htmlFor="description">פרטי ההצעה *</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="תאר את הצעתך, כולל פרטים על השירות שתספק" className="min-h-[100px]" required />
          </div>

          <CompletionTimeSelect value={estimatedCompletion} onChange={setEstimatedCompletion} />

          {hasBudget && <LowerPriceOption isWilling={isLowerPriceWilling} setIsWilling={setIsLowerPriceWilling} lowerPrice={lowerPrice} setPrice={setLowerPrice} originalPrice={leadBudget} />}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-ofair-blue hover:bg-ofair-blue/80">
              {isSubmitting ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  שולח...
                </> : <>
                  <Receipt className="mr-2 h-4 w-4" />
                  שלח הצעת מחיר
                </>}
            </Button>
          </div>
        </div>
      </form>
    </div>;
};
export default LeadProposalForm;