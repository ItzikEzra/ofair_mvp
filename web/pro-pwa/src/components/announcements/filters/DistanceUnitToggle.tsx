import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";
import { useDistancePreferences, DistanceUnit } from "@/hooks/useDistancePreferences";

interface DistanceUnitToggleProps {
  className?: string;
}

export const DistanceUnitToggle: React.FC<DistanceUnitToggleProps> = ({ className }) => {
  const { preferences, updateUnit } = useDistancePreferences();

  const handleUnitChange = (unit: DistanceUnit) => {
    updateUnit(unit);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Label className="text-xs text-gray-600 flex items-center gap-1">
        <Ruler className="h-3 w-3" />
        יחידת מרחק:
      </Label>
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        <Button
          variant={preferences.unit === 'km' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleUnitChange('km')}
          className="rounded-none text-xs px-2 py-1 h-6"
        >
          ק״מ
        </Button>
        <Button
          variant={preferences.unit === 'm' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => handleUnitChange('m')}
          className="rounded-none text-xs px-2 py-1 h-6 border-r border-gray-200"
        >
          מטר
        </Button>
      </div>
    </div>
  );
};