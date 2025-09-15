import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
interface EnhancedCommissionSliderProps {
  sharePercentage: number[];
  setSharePercentage: (value: number[]) => void;
  maxValue?: number;
  disabled?: boolean;
  hasError?: boolean;
  estimatedPrice?: string;
}
const EnhancedCommissionSlider: React.FC<EnhancedCommissionSliderProps> = ({
  sharePercentage,
  setSharePercentage,
  maxValue,
  disabled = false,
  hasError = false,
  estimatedPrice
}) => {
  const [inputValue, setInputValue] = useState(sharePercentage[0]?.toString() || "0");

  // Calculate dynamic max value based on estimated price (same logic as SubmitLead)
  const hasPrice = estimatedPrice && parseFloat(estimatedPrice) > 0;
  const dynamicMaxValue = maxValue || (hasPrice ? 30 : 10);
  useEffect(() => {
    setInputValue(sharePercentage[0]?.toString() || "0");
  }, [sharePercentage]);

  // Auto-adjust commission when max value changes
  useEffect(() => {
    if (sharePercentage[0] > dynamicMaxValue) {
      setSharePercentage([dynamicMaxValue]);
    }
  }, [dynamicMaxValue, sharePercentage, setSharePercentage]);
  const handleSliderChange = (value: number[]) => {
    if (value.length === 1 && value[0] >= 0 && value[0] <= dynamicMaxValue) {
      setSharePercentage(value);
      setInputValue(value[0].toString());
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= dynamicMaxValue) {
      setSharePercentage([numValue]);
    }
  };
  const handleInputBlur = () => {
    const numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < 0 || numValue > dynamicMaxValue) {
      setInputValue(sharePercentage[0]?.toString() || "0");
    }
  };
  return <div className="mb-6">
      <div className="flex justify-between items-center mb-2" dir="rtl">
        <label className="block text-sm font-medium">אחוז עמלה</label>
        <div className="flex items-center gap-2">
          <Input type="number" value={inputValue} onChange={handleInputChange} onBlur={handleInputBlur} min={0} max={dynamicMaxValue} className={`w-16 h-8 text-center ${hasError ? 'border-red-500' : ''} ${disabled ? 'opacity-50' : ''}`} disabled={disabled} />
          <span className={`font-semibold ${disabled ? 'text-gray-500' : hasError ? 'text-red-500' : 'text-ofair-blue'}`}>
            %
          </span>
        </div>
      </div>
      
      <div dir="ltr">
        <Slider value={sharePercentage} onValueChange={handleSliderChange} max={dynamicMaxValue} min={0} step={1} className={`mb-2 ${disabled ? 'opacity-50' : ''} ${hasError ? '[&_[role=slider]]:border-red-500' : ''}`} disabled={disabled} />
      </div>
      
      <div className="flex justify-between text-xs text-gray-500" dir="ltr">
        <span>0%</span>
        <span className="mx-auto">{Math.floor(dynamicMaxValue / 2)}%</span>
        <span>{dynamicMaxValue}%</span>
      </div>
      
      <div className="text-sm text-gray-500 mt-2 text-center" dir="rtl">
        קבע את אחוז העמלה שתרצה לקבל על הליד הזה
      </div>

      <div className="bg-blue-50 p-3 rounded-md text-sm mt-3" dir="rtl">
        <div className="space-y-1">
          <div>• <strong>עמלת oFair:</strong> 5% (קבוע)</div>
          <div>• <strong>העמלה שלך:</strong> {sharePercentage[0] || 0}%</div>
          <div>• <strong>מה שיישאר לבעל המקצוע:</strong> {95 - (sharePercentage[0] || 0)}%</div>
          {hasPrice ? <div className="text-green-600 font-medium">• מחיר מוערך צוין - מקסימום 30%</div> : <div className="text-orange-600 font-medium">• אין מחיר סגור - מקסימום 10%</div>}
        </div>
      </div>
    </div>;
};
export default EnhancedCommissionSlider;