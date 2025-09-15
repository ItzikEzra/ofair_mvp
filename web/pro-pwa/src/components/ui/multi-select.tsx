
import React, { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface MultiSelectProps {
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  dir?: "ltr" | "rtl";
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "בחר אפשרויות...",
  className = "",
  dir = "rtl",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange(newValue);
  };

  const removeItem = (optionValue: string) => {
    onChange(value.filter(v => v !== optionValue));
  };

  const getSelectedLabels = () => {
    return value.map(v => options.find(opt => opt.value === v)?.label).filter(Boolean);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.multi-select-container')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`relative multi-select-container ${className}`} dir={dir}>
      <div
        className="min-h-[40px] border border-gray-300 rounded px-3 py-2 cursor-pointer bg-white flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1">
          {value.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {getSelectedLabels().map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-2 py-1 rounded"
                >
                  {label}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      const optionValue = options.find(opt => opt.label === label)?.value;
                      if (optionValue) removeItem(optionValue);
                    }}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center ${
                value.includes(option.value) ? 'bg-blue-50 text-blue-700' : ''
              }`}
              onClick={() => {
                handleToggle(option.value);
                // Don't close immediately to allow multiple selections
              }}
            >
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => {}}
                className="ml-2"
              />
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelect;
