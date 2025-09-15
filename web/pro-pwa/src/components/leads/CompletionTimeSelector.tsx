import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
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

interface CompletionTimeSelectorProps {
  completionTime: string;
  setCompletionTime: (time: string) => void;
  isRequired?: boolean;
  label?: string;
}

const timeOptions = [
  "תוך יום",
  "2-3 ימים", 
  "שבוע",
  "2-3 שבועות",
  "חודש",
  "2-3 חודשים",
  "לפי תיאום"
];

export const CompletionTimeSelector = ({ 
  completionTime, 
  setCompletionTime, 
  isRequired = true,
  label = "זמן אספקה משוער"
}: CompletionTimeSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(completionTime);

  const handleTimeSelect = (time: string) => {
    setInputValue(time);
    setCompletionTime(time);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue);
    setCompletionTime(newValue);
  };

  const filteredOptions = timeOptions.filter(option =>
    option.includes(inputValue) || inputValue.includes(option)
  );

  return (
    <div>
      <Label className="mb-1 block">{label}{isRequired && " *"}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between text-right bg-white"
          >
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-gray-500" />
              <span>{inputValue || "בחר זמן אספקה"}</span>
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command dir="rtl">
            <CommandInput 
              placeholder="הקלד זמן אספקה..." 
              value={inputValue}
              onValueChange={handleInputChange}
            />
            <CommandList>
              <CommandEmpty>
                <div className="p-2">
                  <div>לא נמצא זמן בשם "{inputValue}"</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => {
                      setCompletionTime(inputValue);
                      setOpen(false);
                    }}
                  >
                    השתמש ב-"{inputValue}"
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleTimeSelect(option)}
                  >
                    {option}
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

export default CompletionTimeSelector;