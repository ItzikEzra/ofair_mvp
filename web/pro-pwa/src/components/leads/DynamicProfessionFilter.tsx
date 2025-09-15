
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { professionCategories } from "@/data/professionCategories";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

interface DynamicProfessionFilterProps {
  value: string;
  onChange: (profession: string) => void;
  label?: string;
  placeholder?: string;
  hasError?: boolean;
}

export const DynamicProfessionFilter = ({ 
  value, 
  onChange, 
  label = "מקצוע",
  placeholder = "בחר או הקלד מקצוע",
  hasError = false
}: DynamicProfessionFilterProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  const handleProfessionSelect = (profession: string) => {
    setInputValue(profession);
    onChange(profession);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    onChange(newValue);
  };

  const filteredProfessions = professionCategories.filter(prof =>
    prof.label.toLowerCase().includes(inputValue.toLowerCase()) || 
    inputValue.toLowerCase().includes(prof.label.toLowerCase())
  );

  return (
    <div>
      <Label htmlFor="profession-filter" className="mb-1 block">{label} *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between text-right bg-white border border-input ${hasError ? 'border-red-500' : 'border-gray-300'} hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500`}
          >
            {inputValue || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command dir="rtl">
            <CommandInput 
              placeholder="הקלד מקצוע..." 
              value={inputValue}
              onValueChange={handleInputChange}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <div>לא נמצא מקצוע בשם "{inputValue}"</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      onChange(inputValue);
                      setOpen(false);
                    }}
                  >
                    השתמש ב-"{inputValue}"
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredProfessions.map((profession) => (
                  <CommandItem
                    key={profession.value}
                    value={profession.label}
                    onSelect={() => handleProfessionSelect(profession.label)}
                  >
                    {profession.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
