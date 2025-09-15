
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProposalDescriptionInputProps {
  description: string;
  setDescription: (description: string) => void;
  label?: string;
  placeholder?: string;
  isRequired?: boolean;
}

const ProposalDescriptionInput: React.FC<ProposalDescriptionInputProps> = ({ 
  description, 
  setDescription,
  label = "פרטי ההצעה",
  placeholder = "תאר את הצעתך, כולל פרטים על השירות שתספק",
  isRequired = true
}) => {
  return (
    <div className="space-y-1">
      <Label htmlFor="description">{label}{isRequired && " *"}</Label>
      <Textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={placeholder}
        className="min-h-[100px]"
        required={isRequired}
      />
    </div>
  );
};

export default ProposalDescriptionInput;
