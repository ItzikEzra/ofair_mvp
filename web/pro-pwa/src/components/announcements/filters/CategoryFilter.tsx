
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
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
import { professionCategories } from "@/data/professionCategories";

interface CategoryFilterProps {
  value: string;
  onChange: (category: string) => void;
  disabled?: boolean;
}

export const CategoryFilter = ({ value, onChange, disabled = false }: CategoryFilterProps) => {
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [categorySearchValue, setCategorySearchValue] = useState("");

  const onCategorySelect = (category: string) => {
    onChange(category === "all" ? "" : category);
    const selectedCategory = professionCategories.find(c => c.value === category);
    setCategorySearchValue(selectedCategory ? selectedCategory.label : category);
    setCategorySearchOpen(false);
  };

  return (
    <div>
      <Label htmlFor="category-filter" className="mb-1 block">תחום מקצועי</Label>
      <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={categorySearchOpen}
            className="w-full justify-between text-right bg-white"
            disabled={disabled}
          >
            {!value || value === "all"
              ? "כל התחומים"
              : professionCategories.find(c => c.value === value)?.label || value}
            <Search size={16} className="ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command dir="rtl">
            <CommandInput 
              placeholder="חפש תחום מקצועי..."
              value={categorySearchValue}
              onValueChange={setCategorySearchValue}
            />
            <CommandList>
              <CommandEmpty>לא נמצאו תחומים מתאימים</CommandEmpty>
              <CommandGroup heading="תחומים מקצועיים">
                <CommandItem 
                  value="כל התחומים"
                  onSelect={() => onCategorySelect("all")}
                >
                  כל התחומים
                </CommandItem>
                {professionCategories
                  .filter(category => 
                    category.label.toLowerCase().includes(categorySearchValue.toLowerCase()) ||
                    category.synonyms.some(syn => 
                      syn.toLowerCase().includes(categorySearchValue.toLowerCase())
                    )
                  )
                  .map((category) => (
                    <CommandItem
                      key={category.value}
                      value={category.value}
                      onSelect={() => onCategorySelect(category.value)}
                    >
                      {category.label}
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
