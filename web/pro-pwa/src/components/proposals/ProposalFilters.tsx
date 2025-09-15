import React from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface ProposalFilters {
  type: 'all' | 'lead' | 'request';
  status: 'all' | 'pending' | 'accepted' | 'rejected' | 'completed';
  dateFrom?: Date;
  dateTo?: Date;
}

interface ProposalFiltersProps {
  filters: ProposalFilters;
  onFiltersChange: (filters: ProposalFilters) => void;
  onClearFilters: () => void;
  proposalCounts: {
    total: number;
    lead: number;
    request: number;
    pending: number;
    accepted: number;
    rejected: number;
    completed: number;
  };
}

const ProposalFiltersComponent: React.FC<ProposalFiltersProps> = ({
  filters,
  onFiltersChange,
  onClearFilters,
  proposalCounts
}) => {
  const hasActiveFilters = filters.type !== 'all' || filters.status !== 'all' || filters.dateFrom || filters.dateTo;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4" dir="rtl">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="font-medium text-gray-700">סינון הצעות מחיר</span>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="mr-auto flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" />
            נקה סינונים
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* סוג הצעה */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            סוג הצעה
          </label>
          <Select
            value={filters.type}
            onValueChange={(value: 'all' | 'lead' | 'request') => 
              onFiltersChange({ ...filters, type: value })
            }
            dir="rtl"
          >
            <SelectTrigger dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">הכל ({proposalCounts.total})</SelectItem>
              <SelectItem value="lead">מליד ({proposalCounts.lead})</SelectItem>
              <SelectItem value="request">מבקשה ({proposalCounts.request})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* סטטוס */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            סטטוס
          </label>
          <Select
            value={filters.status}
            onValueChange={(value: 'all' | 'pending' | 'accepted' | 'rejected' | 'completed') => 
              onFiltersChange({ ...filters, status: value })
            }
            dir="rtl"
          >
            <SelectTrigger dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all">הכל ({proposalCounts.total})</SelectItem>
              <SelectItem value="pending">ממתין ({proposalCounts.pending})</SelectItem>
              <SelectItem value="accepted">מאושר ({proposalCounts.accepted})</SelectItem>
              <SelectItem value="rejected">נדחה ({proposalCounts.rejected})</SelectItem>
              <SelectItem value="completed">הושלם ({proposalCounts.completed})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* תאריך התחלה */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            מתאריך
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {filters.dateFrom ? (
                  format(filters.dateFrom, "dd/MM/yyyy", { locale: he })
                ) : (
                  <span>בחר תאריך</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* תאריך סיום */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            עד תאריך
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-right font-normal",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {filters.dateTo ? (
                  format(filters.dateTo, "dd/MM/yyyy", { locale: he })
                ) : (
                  <span>בחר תאריך</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default ProposalFiltersComponent;