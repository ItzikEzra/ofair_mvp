
import React from "react";
import { ProposalType } from "@/types/jobs";
import { formatCurrency } from "@/lib/utils";

interface ProposalPriceProps {
  proposal: ProposalType;
}

export const ProposalPrice: React.FC<ProposalPriceProps> = ({ proposal }) => {
  // Return the original price (not net earnings)
  const getOriginalPrice = (price: number) => {
    return price; // Show original price, not after commission
  };

  // Improved price rendering for both lead proposals and request quotes
  const renderPrice = () => {
    console.log("[PROPOSAL_CARD] Rendering price for:", proposal.price);
    
    // If proposal is completed and has a final amount, show that instead
    if (proposal.status === 'completed' && proposal.final_amount) {
      console.log("[PROPOSAL_CARD] Using final amount for completed proposal:", proposal.final_amount);
      return formatCurrency(proposal.final_amount);
    }
    
    const priceValue = proposal.price;
    
    // Handle null/undefined prices (common for requests where price isn't set yet)
    if (priceValue === null || priceValue === undefined) {
      console.log("[PROPOSAL_CARD] Price is null/undefined, showing request message");
      if (proposal.type === 'request') {
        return "הוגשה הצעה - ממתין לאישור";
      }
      return "רווח יקבע מול הלקוח";
    }
    
    // Convert to string for string comparisons
    const priceStr = String(priceValue);
    
    if (priceStr === "" || priceStr === "0") {
      console.log("[PROPOSAL_CARD] Price is empty/zero string, showing fallback");
      return "רווח יקבע מול הלקוח";
    }
    
    // Handle numeric prices - show net earnings
    if (typeof priceValue === 'number') {
      console.log("[PROPOSAL_CARD] Price is number:", priceValue);
      if (priceValue === 0) {
        return "רווח יקבע מול הלקוח";
      }
      const originalPrice = getOriginalPrice(priceValue);
      return formatCurrency(originalPrice);
    }
    
    // Handle string prices that can be parsed
    const numericPrice = parseFloat(priceStr);
    if (!isNaN(numericPrice) && numericPrice > 0) {
      console.log("[PROPOSAL_CARD] Price parsed as number:", numericPrice);
      const originalPrice = getOriginalPrice(numericPrice);
      return formatCurrency(originalPrice);
    }
    
    // Special handling for empty string prices on requests
    if (priceStr === "" && proposal.type === 'request') {
      return "הוגשה הצעה - ממתין לאישור";
    }
    
    // Fallback for any other case
    console.log("[PROPOSAL_CARD] Price fallback case");
    return "רווח יקבע מול הלקוח";
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-gray-500 text-sm">סכום ההצעה:</span>
        <span className="text-ofair-blue font-bold">
          {renderPrice()}
        </span>
      </div>
    </div>
  );
};
