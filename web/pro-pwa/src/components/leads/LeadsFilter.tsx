
import React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadsFilterProps {
  activeTab: string;
  onValueChange: (value: string) => void;
}

const LeadsFilter: React.FC<LeadsFilterProps> = ({ activeTab, onValueChange }) => {
  return (
    <Tabs value={activeTab} onValueChange={onValueChange} className="w-full" dir="rtl">
      <TabsList className="grid grid-cols-5 mb-4 w-full">
        <TabsTrigger value="active">פעילים</TabsTrigger>
        <TabsTrigger value="approved">אושרו</TabsTrigger>
        <TabsTrigger value="completed">הושלמו</TabsTrigger>
        <TabsTrigger value="cancelled">בוטלו</TabsTrigger>
        <TabsTrigger value="all">הכל</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default LeadsFilter;
