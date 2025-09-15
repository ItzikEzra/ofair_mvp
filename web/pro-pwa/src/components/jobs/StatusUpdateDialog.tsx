
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectType } from "@/types/jobs";

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectType;
  onUpdateStatus: (projectId: string | number, newStatus: string, newProgress: number) => void;
}

const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  open,
  onOpenChange,
  project,
  onUpdateStatus,
}) => {
  const [newStatus, setNewStatus] = useState(project?.status || "");
  const [newProgress, setNewProgress] = useState(project?.progress?.toString() || "0");
  const [isUpdating, setIsUpdating] = useState(false);

  // Update state when project changes
  useEffect(() => {
    if (project) {
      setNewStatus(project.status);
      setNewProgress(project.progress.toString());
    }
  }, [project]);

  const handleUpdateStatus = async () => {
    try {
      setIsUpdating(true);
      
      // Automatically set progress to 100% for completed projects
      const finalProgress = newStatus === "completed" ? 100 : parseInt(newProgress) || 0;
      
      await onUpdateStatus(project.id, newStatus, finalProgress);
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>עדכון סטטוס פרויקט</DialogTitle>
          <DialogDescription>
            עדכן את סטטוס הפרויקט ואת התקדמות העבודה
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>פרויקט</Label>
            <p className="font-medium">{project?.title}</p>
          </div>
          <div>
            <Label htmlFor="status">סטטוס</Label>
            <Select
              value={newStatus}
              onValueChange={(value) => {
                setNewStatus(value);
                // If status changed to completed, set progress to 100%
                if (value === "completed") {
                  setNewProgress("100");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר סטטוס" />
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="not_started">טרם התחיל</SelectItem>
                <SelectItem value="in_progress">בתהליך</SelectItem>
                <SelectItem value="completed">הושלם</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="progress">התקדמות (%)</Label>
            <Input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={newProgress}
              onChange={(e) => setNewProgress(e.target.value)}
              disabled={newStatus === "completed"}
            />
            {newStatus === "completed" && (
              <p className="text-xs text-gray-500 mt-1">
                * הסטטוס "הושלם" קובע את ההתקדמות ל-100% אוטומטית
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            onClick={handleUpdateStatus}
            className="bg-ofair-blue hover:bg-ofair-blue/80"
            disabled={isUpdating}
          >
            {isUpdating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                מעדכן...
              </span>
            ) : (
              "עדכן"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUpdateDialog;
