
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CompletionTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const CompletionTimeSelect: React.FC<CompletionTimeSelectProps> = ({
  value,
  onChange
}) => {
  const timeOptions = [
    { value: "יום עבודה", label: "יום עבודה" },
    { value: "2-3 ימי עבודה", label: "2-3 ימי עבודה" },
    { value: "שבוע", label: "שבוע" },
    { value: "שבועיים", label: "שבועיים" },
    { value: "חודש", label: "חודש" },
    { value: "חודש וחצי", label: "חודש וחצי" },
    { value: "חודשיים", label: "חודשיים" },
    { value: "3 חודשים", label: "3 חודשים" },
    { value: "יותר מ-3 חודשים", label: "יותר מ-3 חודשים" }
  ];

  return (
    <div className="space-y-1">
      <Label htmlFor="completion-time">זמן אספקה משוער (אופציונלי)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger dir="rtl">
          <SelectValue placeholder="בחר זמן אספקה משוער" />
        </SelectTrigger>
        <SelectContent dir="rtl">
          {timeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CompletionTimeSelect;
