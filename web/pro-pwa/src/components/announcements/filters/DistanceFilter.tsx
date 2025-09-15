
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";

// Distance options in km
const DISTANCES = [
  { value: "5", label: "5 ק״מ" },
  { value: "10", label: "10 ק״מ" },
  { value: "25", label: "25 ק״מ" },
  { value: "50", label: "50 ק״מ" },
  { value: "100", label: "100 ק״מ" }
];

interface DistanceFilterProps {
  value: string;
  onChange: (distance: string) => void;
}

export const DistanceFilter = ({ value, onChange }: DistanceFilterProps) => {
  return (
    <div>
      <Label htmlFor="distance-filter" className="mb-1 block">מרחק</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between text-right bg-white"
          >
            {DISTANCES.find(d => d.value === value)?.label || "בחר מרחק"}
            <ChevronDown size={16} className="ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command dir="rtl">
            <CommandList>
              <CommandGroup>
                {DISTANCES.map((distance) => (
                  <CommandItem
                    key={distance.value}
                    value={distance.value}
                    onSelect={() => onChange(distance.value)}
                  >
                    {distance.label}
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
