
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DynamicProfessionFilter } from "@/components/leads/DynamicProfessionFilter";

interface BasicLeadInfoFormProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  profession: string;
  setProfession: (value: string) => void;
}

export const BasicLeadInfoForm = ({
  title,
  setTitle,
  description,
  setDescription,
  profession,
  setProfession
}: BasicLeadInfoFormProps) => {
  return (
    <>
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          כותרת הליד *
        </label>
        <Input 
          id="title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          placeholder="לדוגמה: תיקון ברז דולף בחדר רחצה" 
          className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          required 
        />
        <p className="text-xs text-gray-500 mt-1">
          כותרת קצרה ומתארת שתעזור לבעלי מקצוע להבין במהירות מה נדרש
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          תיאור העבודה *
        </label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="תאר בפירוט את העבודה הנדרשת, כולל פרטים טכניים ודרישות מיוחדות..." 
          className="border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          rows={4} 
          required 
        />
        <p className="text-xs text-gray-500 mt-1">
          תיאור מפורט יעזור לקבל הצעות מחיר מדויקות יותר
        </p>
      </div>

      <DynamicProfessionFilter value={profession} onChange={setProfession} />
    </>
  );
};
