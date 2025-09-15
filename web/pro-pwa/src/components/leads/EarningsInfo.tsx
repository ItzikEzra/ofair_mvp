
import React from "react";
import { formatCurrency } from "@/lib/utils";

interface EarningsInfoProps {
  estimatedPrice: string;
  sharePercentage: number[];
  yourEarnings: number;
  displayPrice: number;
}

const EarningsInfo: React.FC<EarningsInfoProps> = ({
  estimatedPrice,
  sharePercentage,
  yourEarnings,
  displayPrice
}) => {
  const hasPrice = estimatedPrice && parseFloat(estimatedPrice) > 0;
  const fullPrice = parseFloat(estimatedPrice);

  if (!hasPrice) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <h3 className="font-bold text-amber-800 mb-2">אינפורמציה כללית</h3>
        <div className="space-y-2 text-sm text-amber-700">
          <p>• כאשר לא מצוין מחיר, העמלה המקסימלית מוגבלת ל-10%</p>
          <p>• עמלת oFair עומדת על 5% מכלל העסקה</p>
          <p>• בעלי מקצוע יוכלו להציע מחיר בהצעת המחיר שלהם</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
      <h3 className="font-bold text-blue-800 mb-3">סיכום פיננסי</h3>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">מחיר מלא של הפרויקט:</span>
          <span className="font-semibold">{formatCurrency(fullPrice)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">העמלה שלך ({sharePercentage[0]}%):</span>
          <span className="font-semibold text-orange-600">{formatCurrency(yourEarnings)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">בעלי מקצוע יקבלו:</span>
          <span className="font-semibold text-green-600">{formatCurrency(displayPrice)}</span>
        </div>
        <div className="mt-3 pt-2 border-t border-blue-200">
          <p className="text-xs text-blue-600">
            * עמלת oFair: 5% מסכום העבודה שיתקבל
          </p>
        </div>
      </div>
    </div>
  );
};

export default EarningsInfo;
