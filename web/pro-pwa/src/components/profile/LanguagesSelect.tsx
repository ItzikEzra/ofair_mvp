
import React from "react";
import MultiSelect from "@/components/ui/multi-select";

const LANGUAGES = [
  { value: "hebrew", label: "עברית" },
  { value: "arabic", label: "ערבית" },
  { value: "english", label: "אנגלית" },
  { value: "russian", label: "רוסית" },
  { value: "french", label: "צרפתית" },
  { value: "spanish", label: "ספרדית" },
  { value: "german", label: "גרמנית" },
  { value: "amharic", label: "אמהרית" },
  { value: "tigrinya", label: "תיגרינית" },
  { value: "romanian", label: "רומנית" },
];

interface LanguagesSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  isEditing: boolean;
}

const LanguagesSelect: React.FC<LanguagesSelectProps> = ({
  value,
  onChange,
  isEditing,
}) => {
  const getDisplayValue = () => {
    if (!value || value.length === 0) return "לא צוין";
    return value.map(lang => {
      const option = LANGUAGES.find(opt => opt.value === lang);
      return option ? option.label : lang;
    }).join(', ');
  };

  if (isEditing) {
    return (
      <MultiSelect
        options={LANGUAGES}
        value={value || []}
        onChange={onChange}
        placeholder="בחר שפות..."
        className="w-full"
      />
    );
  }

  return (
    <p className={`p-2 bg-gray-50 rounded ${(!value || value.length === 0) ? 'text-gray-400' : ''}`}>
      {getDisplayValue()}
    </p>
  );
};

export default LanguagesSelect;
