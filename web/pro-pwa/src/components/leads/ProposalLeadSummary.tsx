
import React from "react";

interface ProposalLeadSummaryProps {
  leadTitle: string;
  budget: number;
  notes?: string;
  sharePercentage?: number;
}

const ProposalLeadSummary: React.FC<ProposalLeadSummaryProps> = ({
  leadTitle,
  budget,
  notes,
  sharePercentage = 0
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate what the professional will receive (budget minus commission)
  const professionalReceives = budget && sharePercentage > 0 
    ? budget - (budget * sharePercentage / 100) 
    : budget;

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4 shadow-sm w-full">
      <h3 className="font-bold text-lg">{leadTitle}</h3>
      {budget > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-sm text-gray-600">
            מחיר מלא של הפרויקט: {formatCurrency(budget)}
          </div>
          {sharePercentage > 0 && (
            <>
              <div className="text-xs text-gray-500">
                עמלה ({sharePercentage}%): {formatCurrency(budget * sharePercentage / 100)}
              </div>
              <div className="text-sm font-medium text-green-600">
                המחיר שתקבל: {formatCurrency(professionalReceives || 0)}
              </div>
            </>
          )}
        </div>
      )}
      {notes && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-md mt-3 text-sm">
          <strong>הערות:</strong> {notes}
        </div>
      )}
    </div>
  );
};

export default ProposalLeadSummary;
