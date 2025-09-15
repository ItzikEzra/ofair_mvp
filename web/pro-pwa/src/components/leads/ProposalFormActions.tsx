
import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt } from "lucide-react";

interface ProposalFormActionsProps {
  onClose: () => void;
  isSubmitting: boolean;
  submitText?: string;
}

const ProposalFormActions: React.FC<ProposalFormActionsProps> = ({
  onClose,
  isSubmitting,
  submitText = "שלח הצעת מחיר"
}) => {
  console.log("ProposalFormActions rendered:", { isSubmitting });
  
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={onClose}
        type="button"
        disabled={isSubmitting}
        className="w-1/3"
      >
        ביטול
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-ofair-blue hover:bg-ofair-blue/80 w-2/3"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            שולח...
          </>
        ) : (
          <>
            <Receipt className="mr-2 h-4 w-4" />
            {submitText}
          </>
        )}
      </Button>
    </div>
  );
};

export default ProposalFormActions;
