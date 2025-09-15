
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface LowerPriceOptionProps {
  isWilling: boolean;
  setIsWilling: (willing: boolean) => void;
  lowerPrice: string;
  setPrice: (price: string) => void;
  originalPrice: number;
}

const LowerPriceOption: React.FC<LowerPriceOptionProps> = ({
  isWilling,
  setIsWilling,
  lowerPrice,
  setPrice,
  originalPrice
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="lower-price" className="text-sm">
          אני מוכן להציע במחיר נמוך יותר{" "}
          <span className="text-xs text-gray-500">(יכול לשפר את הסיכויים לקבלת ההצעה)</span>
        </Label>
        <Switch
          checked={isWilling}
          onCheckedChange={setIsWilling}
          id="lower-price"
        />
      </div>
      
      {isWilling && (
        <div className="space-y-1 pr-4">
          <Label htmlFor="lower-price-value" className="text-sm">המחיר הנמוך ביותר שתהיה מוכן לקבל (₪)</Label>
          <Input
            id="lower-price-value"
            type="number"
            value={lowerPrice}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="הכנס מחיר מינימלי"
          />
        </div>
      )}
    </div>
  );
};

export default LowerPriceOption;
