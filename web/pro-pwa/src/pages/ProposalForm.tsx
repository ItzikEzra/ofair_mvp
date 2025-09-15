
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Receipt, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "react-router-dom";

const ProposalForm = () => {
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedCompletion, setEstimatedCompletion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const location = useLocation();
  
  // Parse query parameters
  const query = React.useMemo(() => new URLSearchParams(location.search), [location]);
  const announcementType = query.get("type") as 'lead' | 'request' || 'lead';
  const announcementTitle = query.get("title") || "הצעת מחיר";
  const announcementBudget = parseFloat(query.get("budget") || "0");

  // Listen for messages from the parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Make sure message comes from our app domain
      if (event.origin !== window.location.origin) return;
      
      // Handle proposal response
      if (event.data && event.data.type === 'proposal-response') {
        setIsSubmitting(false);
        setSuccess(event.data.success);
        if (!event.data.success) {
          setErrorMessage("אירעה שגיאה בשליחת ההצעה. נסה שנית מאוחר יותר.");
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!price || !description) {
      setErrorMessage("יש למלא מחיר ותיאור");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    // Send message to parent window
    window.parent.postMessage({
      type: 'proposal-submission',
      price,
      description,
      completionDate: estimatedCompletion
    }, '*');
  };

  if (success === true) {
    return (
      <div className="text-center p-6" dir="rtl">
        <div className="text-green-600 text-xl mb-3">✓</div>
        <h3 className="font-bold text-lg mb-2">ההצעה נשלחה בהצלחה</h3>
        <p className="text-gray-600 mb-4">ההצעה שלך נשלחה למפרסם</p>
      </div>
    );
  }

  return (
    <div className="p-4" dir="rtl">
      {/* Announcement details summary */}
      <div className="bg-gray-50 p-3 rounded-md mb-4">
        <h3 className="font-bold">{announcementTitle}</h3>
        {announcementBudget > 0 && (
          <div className="text-sm text-gray-500">
            תקציב מוצע: {formatCurrency(announcementBudget)}
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="bg-red-50 text-red-700 p-2 rounded mb-3 text-sm">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="price">מחיר מוצע (₪)</Label>
            <Input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="הזן מחיר"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">פרטי ההצעה</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את הצעתך, כולל פרטים על השירות שתספק"
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="estimatedCompletion">זמן אספקה משוער (אופציונלי)</Label>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <Input
                id="estimatedCompletion"
                value={estimatedCompletion}
                onChange={(e) => setEstimatedCompletion(e.target.value)}
                placeholder="לדוגמה: 3 ימי עבודה"
                className="pr-10"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-ofair-blue hover:bg-ofair-blue/80"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Receipt className="mr-2 h-4 w-4" />
                שלח הצעת מחיר
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProposalForm;
