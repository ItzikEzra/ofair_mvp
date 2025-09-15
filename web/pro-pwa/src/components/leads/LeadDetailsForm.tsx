
import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { professionCategories } from "@/data/professionCategories";
import { israelCities } from "@/data/israelCities";

interface LeadDetailsFormProps {
  title?: string;
  setTitle?: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  profession: string;
  setProfession: (value: string) => void;
  estimatedPrice: string;
  setEstimatedPrice: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  constraints?: string;
  setConstraints?: (value: string) => void;
  workDate?: string;
  setWorkDate?: (value: string) => void;
  workTime?: string;
  setWorkTime?: (value: string) => void;
  hasErrors?: {
    title?: boolean;
    description?: boolean;
    city?: boolean;
    profession?: boolean;
  };
}

const LeadDetailsForm: React.FC<LeadDetailsFormProps> = ({
  title,
  setTitle,
  description,
  setDescription,
  city,
  setCity,
  profession,
  setProfession,
  estimatedPrice,
  setEstimatedPrice,
  notes,
  setNotes,
  constraints,
  setConstraints,
  workDate,
  setWorkDate,
  workTime,
  setWorkTime,
  hasErrors = {}
}) => {
  return (
    <>
      {title !== undefined && setTitle && (
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium mb-1">כותרת הליד *</label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת הליד..."
            className={hasErrors.title ? 'border-red-500' : ''}
          />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-medium mb-1">תיאור העבודה *</label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תאר את העבודה שאתה מציע..."
          rows={4}
          className={hasErrors.description ? 'border-red-500' : ''}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium mb-1">עיר *</label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className={hasErrors.city ? 'border-red-500' : ''}>
              <SelectValue placeholder="בחר עיר" />
            </SelectTrigger>
            <SelectContent>
              {israelCities.map((cityName) => (
                <SelectItem key={cityName} value={cityName}>
                  {cityName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label htmlFor="profession" className="block text-sm font-medium mb-1">מקצוע *</label>
          <Select value={profession} onValueChange={setProfession}>
            <SelectTrigger className={hasErrors.profession ? 'border-red-500' : ''}>
              <SelectValue placeholder="בחר מקצוע" />
            </SelectTrigger>
            <SelectContent>
              {professionCategories.map((category) => (
                <SelectItem key={category.value} value={category.label}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="estimatedPrice" className="block text-sm font-medium mb-1">מחיר משוער (אופציונלי)</label>
        <Input
          id="estimatedPrice"
          type="number"
          value={estimatedPrice}
          onChange={(e) => setEstimatedPrice(e.target.value)}
          placeholder="מחיר משוער..."
        />
      </div>

      {workDate !== undefined && setWorkDate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="workDate" className="block text-sm font-medium mb-1">תאריך עבודה</label>
            <Input
              id="workDate"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />
          </div>
          
          {workTime !== undefined && setWorkTime && (
            <div>
              <label htmlFor="workTime" className="block text-sm font-medium mb-1">שעת עבודה</label>
              <Input
                id="workTime"
                type="time"
                value={workTime}
                onChange={(e) => setWorkTime(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {constraints !== undefined && setConstraints && (
        <div className="mb-4">
          <label htmlFor="constraints" className="block text-sm font-medium mb-1">מגבלות</label>
          <Textarea
            id="constraints"
            value={constraints}
            onChange={(e) => setConstraints(e.target.value)}
            placeholder="מגבלות או דרישות מיוחדות..."
            rows={2}
          />
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium mb-1">הערות נוספות</label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="הערות נוספות לגבי העבודה..."
          rows={3}
        />
      </div>
    </>
  );
};

export default LeadDetailsForm;
