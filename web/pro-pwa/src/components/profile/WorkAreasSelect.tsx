
import React from "react";
import MultiSelect from "@/components/ui/multi-select";
import { useWorkAreas } from "@/hooks/useWorkAreas";

interface WorkAreasSelectProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}

const WorkAreasSelect: React.FC<WorkAreasSelectProps> = ({
  value,
  onChange,
  isEditing,
}) => {
  const { workAreas, isLoading, error } = useWorkAreas();

  // Convert string to array for multi-select
  const selectedAreas = value ? value.split(',').map(s => s.trim()) : [];

  const handleChange = (newValue: string[]) => {
    onChange(newValue.join(', '));
  };

  const getDisplayValue = () => {
    if (!value) return "לא צוין";
    return selectedAreas.join(', ');
  };

  if (isEditing) {
    if (isLoading) {
      return (
        <div className="p-2 bg-gray-50 rounded text-gray-400">
          טוען אזורי עבודה...
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-2 bg-red-50 rounded text-red-500">
          {error}
        </div>
      );
    }

    return (
      <MultiSelect
        options={workAreas}
        value={selectedAreas}
        onChange={handleChange}
        placeholder="בחר אזורי עבודה..."
        className="w-full"
      />
    );
  }

  return (
    <div className={`p-2 bg-gray-50 rounded ${!value ? 'text-gray-400' : ''} break-words`}>
      {getDisplayValue()}
    </div>
  );
};

export default WorkAreasSelect;
