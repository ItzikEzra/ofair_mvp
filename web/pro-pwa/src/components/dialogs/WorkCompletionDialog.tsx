
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";

interface WorkCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workTitle: string;
  proposalId?: string;
  referralId?: string;
  proposalType: 'proposal' | 'quote' | 'referral';
  onComplete: () => void;
}

const WorkCompletionDialog: React.FC<WorkCompletionDialogProps> = ({
  open,
  onOpenChange,
  workTitle,
  proposalId,
  referralId,
  proposalType,
  onComplete
}) => {
  const [status, setStatus] = useState<'completed' | 'delayed' | 'issues'>('completed');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { professionalId } = useProfessionalId();

  const handleSubmit = async () => {
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
      // Save work completion data to database
      const { error: insertError } = await supabase
        .from('work_completions')
        .insert({
          professional_id: professionalId as any,
          referral_id: referralId ? (referralId as any) : null,
          proposal_id: proposalId ? (proposalId as any) : null,
          proposal_type: proposalType as any,
          work_title: workTitle,
          status: status as any,
          notes: notes || null
        } as any);

      if (insertError) {
        console.error("Error saving work completion:", insertError);
        toast({
          title: "שגיאה בשמירת הנתונים",
          description: "לא ניתן לשמור את פרטי השלמת העבודה",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "טופס נשלח בהצלחה",
        description: "פרטי השלמת העבודה נשמרו במערכת"
      });

      onComplete();
      onOpenChange(false);
      
      // Reset form
      setStatus('completed');
      setNotes('');
    } catch (error) {
      console.error("Unexpected error saving work completion:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשלוח את הטופס כרגע",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'delayed':
        return <Clock className="text-yellow-500" size={20} />;
      case 'issues':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (statusValue: string) => {
    switch (statusValue) {
      case 'completed':
        return 'העבודה הושלמה בהצלחה';
      case 'delayed':
        return 'העבודה מתעכבת';
      case 'issues':
        return 'יש בעיות עם העבודה';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">טופס השלמת עבודה</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-gray-600">שם העבודה</Label>
            <p className="text-lg font-semibold">{workTitle}</p>
          </div>

          <div>
            <Label className="text-base font-medium mb-4 block">סטטוס העבודה</Label>
            <RadioGroup
              value={status}
              onValueChange={(value) => setStatus(value as any)}
              className="space-y-3"
            >
              {['completed', 'delayed', 'issues'].map((statusValue) => (
                <Card key={statusValue} className="p-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value={statusValue} id={statusValue} />
                    <Label
                      htmlFor={statusValue}
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                    >
                      {getStatusIcon(statusValue)}
                      <span>{getStatusLabel(statusValue)}</span>
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
              placeholder="תוכל להוסיף כאן פרטים נוספים על ביצוע העבודה..."
              className="mt-2"
              rows={4}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'שולח...' : 'שלח טופס'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkCompletionDialog;
