import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
interface ProposalButtonProps {
  onOpenProposalDialog: () => void;
  isSubmitting: boolean;
  isCheckingAuth: boolean;
  className?: string;
}
const ProposalButton = ({
  onOpenProposalDialog,
  isSubmitting,
  isCheckingAuth,
  className = ""
}: ProposalButtonProps) => {
  return <Button className={`w-full glass-button-secondary hover:shadow-lg hover:shadow-ofair-turquoise/25 mt-3 ${className}`} onClick={onOpenProposalDialog} disabled={isSubmitting || isCheckingAuth} variant="secondary">
      {isCheckingAuth ? <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          בודק...
        </> : isSubmitting ? <>
          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          שולח...
        </> : <>
          <span className="relative z-10">הגש הצעה</span>
          <div className="absolute inset-0 bg-gradient-to-r from-ofair-turquoise/20 to-ofair-turquoise/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-blue-500"></div>
        </>}
    </Button>;
};
export default ProposalButton;