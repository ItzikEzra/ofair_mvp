
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { israelCities } from "@/data/israelCities";
import { useLocationDetection } from "@/hooks/useLocationDetection";
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

interface CityFilterProps {
  value: string;
  onChange: (city: string, latitude?: number, longitude?: number) => void;
  disabled?: boolean;
}

export const CityFilter = ({ value, onChange, disabled = false }: CityFilterProps) => {
  const [open, setOpen] = useState(false);
  const { geoLoading, geoError, detectLocation } = useLocationDetection();

  const handleLocationDetect = () => {
    detectLocation((city, lat, lng) => {
      onChange(city, lat, lng);
    });
  };

  const handleCitySelect = (city: string) => {
    onChange(city);
    setOpen(false);
  };

  return (
    <div>
      <Label htmlFor="city-filter" className="mb-1 block">עיר</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 justify-between text-right bg-white"
              disabled={disabled}
            >
              {value || "בחר עיר"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command dir="rtl">
              <CommandInput placeholder="חפש עיר..." />
              <CommandList>
                <CommandEmpty>לא נמצאה עיר</CommandEmpty>
                <CommandGroup>
                  {israelCities.map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => handleCitySelect(city)}
                    >
                      {city}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleLocationDetect}
          disabled={geoLoading || disabled}
          title="השתמש במיקום הנוכחי"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {geoError && (
        <p className="text-xs text-red-500 mt-1">{geoError}</p>
      )}
    </div>
  );
};
