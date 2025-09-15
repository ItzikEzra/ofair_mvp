import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ProjectType } from "@/types/jobs";
import { useToast } from "@/hooks/use-toast";

interface UpdateProjectStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectType;
  onUpdate: (updatedProject: ProjectType) => Promise<boolean>;
}

const UpdateProjectStatusDialog: React.FC<UpdateProjectStatusDialogProps> = ({
  isOpen,
  onClose,
  project,
  onUpdate
}) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ProjectType['status']>(project.status);
  const [progress, setProgress] = useState([project.progress]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const updatedProject: ProjectType = {
      ...project,
      status,
      progress: progress[0]
    };
    
    const success = await onUpdate(updatedProject);
    
    if (success) {
      toast({
        title: "סטטוס עודכן בהצלחה",
        description: "הפרויקט עודכן במערכת"
      });
      onClose();
    } else {
      toast({
        title: "שגיאה בעדכון סטטוס",
        description: "לא ניתן לעדכן את הפרויקט",
        variant: "destructive"
      });
    }
    
    setIsSubmitting(false);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'פעיל';
      case 'in_progress': return 'בביצוע';
      case 'completed': return 'הושלם';
      case 'on_hold': return 'מושהה';
      case 'not_started': return 'טרם התחיל';
      default: return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>עדכון סטטוס פרויקט</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium">פרויקט: {project.title}</Label>
            <p className="text-sm text-gray-600">לקוח: {project.client}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">סטטוס</Label>
            <Select value={status} onValueChange={(value: ProjectType['status']) => setStatus(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">טרם התחיל</SelectItem>
                <SelectItem value="active">פעיל</SelectItem>
                <SelectItem value="in_progress">בביצוע</SelectItem>
                <SelectItem value="on_hold">מושהה</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label htmlFor="progress">אחוז השלמה</Label>
              <span className="text-sm font-bold text-blue-600">{progress[0]}%</span>
            </div>
            <Slider
              value={progress}
              onValueChange={setProgress}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "מעדכן..." : "עדכן סטטוס"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateProjectStatusDialog;