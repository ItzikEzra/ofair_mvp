
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuoteSubmissionFormProps {
  requestTitle: string;
  onSubmit: (price: string, description: string, estimatedTime: string) => Promise<boolean>;
  onClose: () => void;
}

const QuoteSubmissionForm: React.FC<QuoteSubmissionFormProps> = ({
  requestTitle,
  onSubmit,
  onClose,
}) => {
  const navigate = useNavigate();
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return;
    }
    
    if (!description.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Submit quote - uses the onSubmit callback that should send the correct parameters
    const success = await onSubmit(price, description, estimatedTime);
    
    if (success) {
      // Navigate to My Jobs page with proposals tab active
      setTimeout(() => {
        navigate("/my-jobs?tab=proposals");
      }, 1000);
      
      onClose();
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div>
        <Label htmlFor="project-title">בקשה</Label>
        <Input id="project-title" value={requestTitle} disabled />
      </div>
      
      <div>
        <Label htmlFor="price">המחיר שלך (₪)</Label>
        <Input
          id="price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="הזן מחיר"
        />
      </div>
      
      <div>
        <Label htmlFor="description">תיאור ההצעה</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תאר את ההצעה שלך..."
          rows={4}
        />
      </div>
      
      <div>
        <Label htmlFor="estimated-time">זמן ביצוע משוער</Label>
        <Input
          id="estimated-time"
          value={estimatedTime}
          onChange={(e) => setEstimatedTime(e.target.value)}
          placeholder="לדוגמה: 3 שעות / 2 ימי עבודה"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          ביטול
        </Button>
        <Button type="submit" className="bg-ofair-blue hover:bg-ofair-blue/80" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              שולח...
            </>
          ) : (
            "שלח הצעה"
          )}
        </Button>
      </div>
    </form>
  );
};

export default QuoteSubmissionForm;
