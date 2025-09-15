
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "lucide-react";

interface CompletionDateInputProps {
  completionDate: string;
  setCompletionDate: (date: string) => void;
  isRequired?: boolean;
  label?: string;
}

const CompletionDateInput: React.FC<CompletionDateInputProps> = ({
  completionDate,
  setCompletionDate,
  isRequired = true,
  label = "זמן אספקה משוער"
}) => {
  console.log("CompletionDateInput rendered:", { completionDate, isRequired });
  
  return (
    <div className="space-y-1">
      <Label htmlFor="completionDate">{label}{isRequired && " *"}</Label>
      <div className="relative">
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <Input
          id="completionDate"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
          placeholder="לדוגמה: 3 ימי עבודה"
          className="pr-10"
          required={isRequired}
        />
      </div>
    </div>
  );
};

export default CompletionDateInput;
