
import React from "react";
import { Calendar, Clock, DollarSign, Users, AlertTriangle, MapPin } from "lucide-react";
import { Lead } from "@/types/leads";
import { formatCurrency } from "@/lib/utils";

interface CompactDetailsGridProps {
  lead: Lead;
  showConstraintsIndicator?: boolean;
}

const CompactDetailsGrid: React.FC<CompactDetailsGridProps> = ({ 
  lead, 
  showConstraintsIndicator = true 
}) => {
  // Calculate commission breakdown
  const calculateCommission = () => {
    if (!lead.budget) return null;
    const totalBudget = lead.budget;
    const sharePercentage = lead.share_percentage || 0;
    const myCommission = totalBudget * (sharePercentage / 100);
    return {
      totalAmount: totalBudget,
      myCommission: myCommission
    };
  };

  const commission = calculateCommission();

  return (
    <div className="grid grid-cols-2 gap-2 text-sm" dir="rtl">
      {/* Budget - always first if exists */}
      {commission && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md border border-green-100">
          <DollarSign size={14} className="text-green-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-green-800 text-xs truncate">
              {formatCurrency(commission.myCommission)}
            </div>
            <div className="text-xs text-green-600">העמלה שלי</div>
          </div>
        </div>
      )}

      {/* Work Date */}
      {lead.work_date && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-100">
          <Calendar size={14} className="text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-blue-800 text-xs truncate">
              {new Date(lead.work_date).toLocaleDateString('he-IL')}
            </div>
            <div className="text-xs text-blue-600">תאריך</div>
          </div>
        </div>
      )}

      {/* Work Time */}
      {lead.work_time && (
        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-md border border-purple-100">
          <Clock size={14} className="text-purple-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-purple-800 text-xs truncate">
              {lead.work_time}
            </div>
            <div className="text-xs text-purple-600">שעה</div>
          </div>
        </div>
      )}

      {/* Profession */}
      {lead.profession && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-md border border-orange-100">
          <Users size={14} className="text-orange-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-orange-800 text-xs truncate">
              {lead.profession}
            </div>
            <div className="text-xs text-orange-600">תחום</div>
          </div>
        </div>
      )}

      {/* Constraints Indicator */}
      {lead.constraints && showConstraintsIndicator && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md border border-amber-100">
          <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-amber-800 text-xs">
              יש מגבלות
            </div>
            <div className="text-xs text-amber-600">דרישות מיוחדות</div>
          </div>
        </div>
      )}

      {/* No Budget Indicator */}
      {!lead.budget && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
          <DollarSign size={14} className="text-gray-500 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-600 text-xs">
              ללא תקציב
            </div>
            <div className="text-xs text-gray-500">לא צוין</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompactDetailsGrid;
