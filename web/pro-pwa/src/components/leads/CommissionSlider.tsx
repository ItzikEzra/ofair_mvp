
import React from "react";
import { Slider } from "@/components/ui/slider";

interface CommissionSliderProps {
  sharePercentage: number[];
  setSharePercentage: (value: number[]) => void;
  maxValue?: number;
  disabled?: boolean;
}

const CommissionSlider: React.FC<CommissionSliderProps> = ({
  sharePercentage,
  setSharePercentage,
  maxValue = 30,
  disabled = false
}) => {
  const handleValueChange = (value: number[]) => {
    if (value.length === 1 && value[0] >= 0 && value[0] <= maxValue) {
      setSharePercentage(value);
    }
  };

  const currentValue = sharePercentage[0] || 0;

  return (
    <div className="mb-6" dir="ltr">
      <div className="flex justify-between items-center mb-2" dir="rtl">
        <label className="block text-sm font-medium">אחוז עמלה לנותן הליד</label>
        <span className={`font-semibold ${disabled ? 'text-gray-500' : 'text-ofair-blue'}`}>
          {currentValue}%
        </span>
      </div>
      
      <Slider 
        value={sharePercentage} 
        onValueChange={handleValueChange} 
        max={maxValue}
        min={0}
        step={1}
        className={`mb-2 ${disabled ? 'opacity-50' : ''}`}
        disabled={disabled}
      />
      
      <div className="flex justify-between text-xs text-gray-500" dir="ltr">
        <span>0%</span>
        <span className="mx-auto">{Math.floor(maxValue/2)}%</span>
        <span>{maxValue}%</span>
      </div>
      
      <div className="text-sm text-gray-500 mt-2 text-center" dir="rtl">
        קבע את אחוז העמלה שתרצה לקבל על הליד הזה
      </div>
      
      <div className="bg-blue-50 p-3 rounded-md text-sm mt-3" dir="rtl">
        <div className="space-y-1">
          <div>• <strong>עמלת oFair:</strong> 5% (קבוע)</div>
          <div>• <strong>העמלה שלך:</strong> {currentValue}%</div>
          <div>• <strong>מה שיישאר לבעל המקצוע:</strong> {95 - currentValue}%</div>
        </div>
      </div>
    </div>
  );
};

export default CommissionSlider;
