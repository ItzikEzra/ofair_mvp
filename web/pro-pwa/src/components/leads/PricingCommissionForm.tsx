
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EnhancedCommissionSlider from "@/components/leads/EnhancedCommissionSlider";
import EarningsInfo from "@/components/leads/EarningsInfo";

interface PricingCommissionFormProps {
  agreedPrice: string;
  setAgreedPrice: (value: string) => void;
  constraints: string;
  setConstraints: (value: string) => void;
  sharePercentage: number[];
  setSharePercentage: (value: number[]) => void;
}

export const PricingCommissionForm = ({
  agreedPrice,
  setAgreedPrice,
  constraints,
  setConstraints,
  sharePercentage,
  setSharePercentage
}: PricingCommissionFormProps) => {
  // Fix commission logic: max 30% with price, max 10% without price
  const maxCommission = agreedPrice && parseFloat(agreedPrice) > 0 ? 30 : 10;
  const yourEarnings = agreedPrice ? parseFloat(agreedPrice) * (sharePercentage[0] / 100) : 0;
  const displayPrice = agreedPrice ? parseFloat(agreedPrice) - yourEarnings : 0;

  return (
    <>
      <div>
        <label htmlFor="agreedPrice" className="block text-sm font-medium mb-1">
          סכום שסגרת עם הלקוח (₪)
        </label>
        <Input 
          id="agreedPrice" 
          type="number" 
          value={agreedPrice} 
          onChange={e => setAgreedPrice(e.target.value)} 
          placeholder="הזן את הסכום שסגרת עם הלקוח" 
          className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          הזן את הסכום המדויק שסיכמת עם הלקוח לעבודה. אם לא סיכמתם על סכום - השאר ריק
        </p>
      </div>

      <EnhancedCommissionSlider 
        sharePercentage={sharePercentage} 
        setSharePercentage={setSharePercentage} 
        maxValue={maxCommission} 
      />

      <EarningsInfo 
        estimatedPrice={agreedPrice} 
        sharePercentage={sharePercentage} 
        yourEarnings={yourEarnings} 
        displayPrice={displayPrice} 
      />

      <div>
        <label htmlFor="constraints" className="block text-sm font-medium mb-1">
          מגבלות או דרישות מיוחדות
        </label>
        <Textarea 
          id="constraints" 
          value={constraints} 
          onChange={e => setConstraints(e.target.value)} 
          placeholder="לדוגמה: העבודה חייבת להתבצע בסוף השבוע, יש צורך בחומרים מיוחדים, כלים מיוחדים נדרשים..." 
          className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          rows={3} 
        />
        <p className="text-xs text-gray-500 mt-1">
          ציין מגבלות זמן, דרישות לחומרים או כלים מיוחדים, או כל דבר חשוב שבעל המקצוע צריך לדעת
        </p>
      </div>
    </>
  );
};
