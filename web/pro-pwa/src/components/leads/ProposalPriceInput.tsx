
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProposalPriceInputProps {
  price: string;
  setPrice: (price: string) => void;
  isRequired?: boolean;
  label?: string;
}

const ProposalPriceInput: React.FC<ProposalPriceInputProps> = ({
  price,
  setPrice,
  isRequired = true,
  label = "מחיר מוצע (₪)"
}) => {
  return (
    <div className="space-y-1">
      <Label htmlFor="price">{label}{isRequired && " *"}</Label>
      <Input
        id="price"
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="הזן מחיר"
        required={isRequired}
      />
    </div>
  );
};

export default ProposalPriceInput;
