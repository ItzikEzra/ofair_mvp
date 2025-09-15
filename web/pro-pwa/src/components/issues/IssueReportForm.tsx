import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Bug, UserX } from "lucide-react";
import { useIssueReports, CreateIssueReportData } from "@/hooks/useIssueReports";
import { useToast } from "@/hooks/use-toast";

interface IssueReportFormProps {
  onSuccess?: () => void;
}

const IssueReportForm: React.FC<IssueReportFormProps> = ({ onSuccess }) => {
  const [issueType, setIssueType] = useState<'app_bug' | 'user_behavior'>('app_bug');
  const [description, setDescription] = useState('');
  const { createIssue, isLoading } = useIssueReports();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס פירוט לבעיה",
        variant: "destructive",
      });
      return;
    }

    try {
      const issueData: CreateIssueReportData = {
        issue_type: issueType,
        description: description.trim(),
      };

      createIssue(issueData);
      
      // Reset form
      setDescription('');
      setIssueType('app_bug');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "שגיאה בשליחת הפנייה",
        description: "אנא נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-right text-lg font-bold text-primary">
          דווח על בעיה חדשה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
          {/* Issue Type Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium text-right block">
              סוג הבעיה
            </Label>
          <RadioGroup
            value={issueType}
            onValueChange={(value) => setIssueType(value as 'app_bug' | 'user_behavior')}
            className="grid gap-4"
            dir="rtl"
          >
            <div className="flex items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="app_bug" id="app_bug" className="ml-3" />
              <div className="flex items-center gap-3 flex-1">
                <Bug className="h-5 w-5 text-orange-500" />
                <div className="text-right">
                  <Label htmlFor="app_bug" className="text-base font-medium cursor-pointer">
                    תקלה באפליקציה
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    דווח על בעיות טכניות, שגיאות או תקלות באפליקציה
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="user_behavior" id="user_behavior" className="ml-3" />
              <div className="flex items-center gap-3 flex-1">
                <UserX className="h-5 w-5 text-red-500" />
                <div className="text-right">
                  <Label htmlFor="user_behavior" className="text-base font-medium cursor-pointer">
                    התנהגות לא נאותה של משתמש
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    דווח על משתמשים שמתנהגים בצורה לא מתאימה או מפירים את התקנות
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label htmlFor="description" className="text-base font-medium text-right block">
              פירוט הבעיה
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                issueType === 'app_bug' 
                  ? "אנא פרט את התקלה - מה קרה? מתי זה קרה? איזה שגיאה הופיעה?" 
                  : "אנא פרט על ההתנהגות הלא נאותה - מה קרה? מי היה מעורב? מתי זה קרה?"
              }
              rows={6}
              className="text-right resize-none"
              dir="rtl"
              required
            />
            <p className="text-sm text-muted-foreground text-right">
              ככל שתפרט יותר, כך נוכל לטפל בבעיה מהר יותר ובצורה יעילה יותר
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <Button 
              type="submit" 
              disabled={isLoading || !description.trim()}
              className="w-full max-w-sm bg-primary hover:bg-primary/90 text-white font-medium"
              dir="rtl"
            >
              {isLoading ? "שולח..." : "שלח דיווח"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default IssueReportForm;