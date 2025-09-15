
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDownIcon } from "lucide-react";

export type SortOption = 'newest' | 'oldest' | 'price_low' | 'price_high' | 'rating_high' | 'rating_low';

interface SortDropdownProps {
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ sortBy, onSortChange }) => {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <span className="text-sm text-gray-600">מיון לפי:</span>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-48 flex-row-reverse">
          <SelectValue />
          <ChevronDownIcon className="h-4 w-4 opacity-50 mr-2" />
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

export default SortDropdown;
