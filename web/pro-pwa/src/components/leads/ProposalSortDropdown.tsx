
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";

export type ProposalSortOption = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating_high' | 'rating_low';

interface ProposalSortDropdownProps {
  sortBy: ProposalSortOption;
  onSortChange: (value: ProposalSortOption) => void;
}

const ProposalSortDropdown: React.FC<ProposalSortDropdownProps> = ({
  sortBy,
  onSortChange
}) => {
  return (
    <div className="flex items-center gap-2 mb-4" dir="rtl">
      <span className="text-sm text-gray-600">מיון לפי:</span>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-48 flex-row-reverse">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">זמן הגשה (חדש לישן)</SelectItem>
          <SelectItem value="oldest">זמן הגשה (ישן לחדש)</SelectItem>
          <SelectItem value="price_low">מחיר (נמוך לגבוה)</SelectItem>
          <SelectItem value="price_high">מחיר (גבוה לנמוך)</SelectItem>
          <SelectItem value="rating_high">דירוג (גבוה לנמוך)</SelectItem>
          <SelectItem value="rating_low">דירוג (נמוך לגבוה)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ProposalSortDropdown;
