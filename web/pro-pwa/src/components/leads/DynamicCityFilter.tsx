
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

interface DynamicCityFilterProps {
  value: string;
  onChange: (city: string, latitude?: number, longitude?: number) => void;
  label?: string;
  placeholder?: string;
  hasError?: boolean;
}

export const DynamicCityFilter = ({ 
  value, 
  onChange, 
  label = "עיר",
  placeholder = "בחר או הקלד עיר",
  hasError = false
}: DynamicCityFilterProps) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const { geoLoading, geoError, detectLocation } = useLocationDetection();

  // Improved city extraction function
  const extractCityFromAddress = (address: string): string => {
    console.log("Extracting city from full address:", address);
    
    // Remove common prefixes and clean the address
    const cleanAddress = address.replace(/^(\d+\s+)/, '').trim();
    
    // Split by comma and try different extraction methods
    const parts = cleanAddress.split(',').map(part => part.trim());
    
    // Method 1: Look for known Israeli city patterns
    const israeliCityPattern = /(תל אביב|ירושלים|חיפה|באר שבע|פתח תקווה|נתניה|אשדוד|ראשון לציון|הרצליה|רמת גן|בני ברק|חולון|בת ים|רמלה|לוד|מודיעין|כפר סבא|רעננה|גבעתיים|קרית אונו)/i;
    
    for (const part of parts) {
      const cityMatch = part.match(israeliCityPattern);
      if (cityMatch) {
        console.log("Found Israeli city:", cityMatch[1]);
        return cityMatch[1];
      }
    }
    
    // Method 2: Check if any part matches our cities list
    for (const part of parts) {
      const normalizedPart = part.trim();
      const matchingCity = israelCities.find(city => 
        city.includes(normalizedPart) || normalizedPart.includes(city)
      );
      if (matchingCity) {
        console.log("Found matching city from list:", matchingCity);
        return matchingCity;
      }
    }
    
    // Method 3: Take the last meaningful part (usually the city)
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      // Skip if it's "Israel" or postal code
      if (!lastPart.match(/israel|ישראל|\d{5,7}/i) && lastPart.length > 2) {
        console.log("Using last part as city:", lastPart);
        return lastPart;
      }
      
      // Try second to last
      if (parts.length >= 3) {
        const secondToLast = parts[parts.length - 2];
        if (!secondToLast.match(/israel|ישראל|\d{5,7}/i) && secondToLast.length > 2) {
          console.log("Using second to last part as city:", secondToLast);
          return secondToLast;
        }
      }
    }
    
    // Fallback: return the first part that looks like a city
    const firstMeaningfulPart = parts.find(part => 
      !part.match(/^\d+/) && part.length > 2 && !part.match(/רחוב|street|st\./i)
    );
    
    if (firstMeaningfulPart) {
      console.log("Using first meaningful part as city:", firstMeaningfulPart);
      return firstMeaningfulPart;
    }
    
    // Last fallback: return the original address
    console.log("Could not extract city, using original address");
    return address;
  };

  const handleLocationDetect = () => {
    detectLocation((addressOrCity, lat, lng) => {
      console.log("Location detected:", { addressOrCity, lat, lng });
      
      // If the detected location looks like a full address, extract the city
      let cityToUse = addressOrCity;
      if (addressOrCity.includes(',') || addressOrCity.length > 20) {
        cityToUse = extractCityFromAddress(addressOrCity);
        console.log("Extracted city from detected address:", cityToUse);
      }
      
      setInputValue(cityToUse);
      onChange(cityToUse, lat, lng);
    });
  };

  const handleCitySelect = (city: string) => {
    console.log("City selected:", city);
    setInputValue(city);
    onChange(city);
    setOpen(false);
  };

  const handleInputChange = (newValue: string) => {
    console.log("Input changed:", newValue);
    setInputValue(newValue);
    onChange(newValue);
  };

  const filteredCities = israelCities.filter(city =>
    city.includes(inputValue) || inputValue.includes(city)
  );

  return (
    <div>
      <Label htmlFor="city-filter" className="mb-1 block">{label} *</Label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={`flex-1 justify-between text-right bg-white ${hasError ? 'border-red-500' : ''}`}
            >
              {inputValue || placeholder}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command dir="rtl">
              <CommandInput 
                placeholder="הקלד עיר..." 
                value={inputValue}
                onValueChange={handleInputChange}
              />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2">
                    <div>לא נמצאה עיר בשם "{inputValue}"</div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        console.log("Using custom city:", inputValue);
                        onChange(inputValue);
                        setOpen(false);
                      }}
                    >
                      השתמש ב-"{inputValue}"
                    </Button>
                  </div>
                </CommandEmpty>
                <CommandGroup>
                  {filteredCities.map((city) => (
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
          disabled={geoLoading}
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
