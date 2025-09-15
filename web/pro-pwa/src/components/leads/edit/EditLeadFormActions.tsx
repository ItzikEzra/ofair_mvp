
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import DeleteLeadConfirmation from "./DeleteLeadConfirmation";
import { Lead } from "@/types/leads";

interface EditLeadFormActionsProps {
  lead: Lead;
  isSubmitting: boolean;
  isDeleting: boolean;
  setIsDeleting: (value: boolean) => void;
  onSave: () => void;
  onClose: () => void;
  onLeadUpdated: () => void;
}

const EditLeadFormActions: React.FC<EditLeadFormActionsProps> = ({
  lead,
  isSubmitting,
  isDeleting,
  setIsDeleting,
  onSave,
  onClose,
  onLeadUpdated
}) => {
  return (
    <div className="flex gap-3 pt-4 border-t">
      <DeleteLeadConfirmation
        lead={lead}
        isDeleting={isDeleting}
        setIsDeleting={setIsDeleting}
        onLeadUpdated={onLeadUpdated}
        onClose={onClose}
        disabled={isSubmitting}
      />
      
      <Button
        onClick={onClose}
        variant="outline"
        disabled={isSubmitting || isDeleting}
        className="flex-1"
      >
        ביטול
      </Button>
      
      <Button
        onClick={onSave}
        disabled={isSubmitting || isDeleting}
        className="flex-1 bg-ofair-blue hover:bg-ofair-blue/80"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            שומר...
          </>
        ) : (
          "שמור שינויים"
        )}
      </Button>
    </div>
  );
};

export default EditLeadFormActions;
