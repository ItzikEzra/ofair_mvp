
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface WorkScheduleFormProps {
  workDate: string;
  setWorkDate: (value: string) => void;
  workTime: string;
  setWorkTime: (value: string) => void;
}

const WorkScheduleForm: React.FC<WorkScheduleFormProps> = ({
  workDate,
  setWorkDate,
  workTime,
  setWorkTime,
}) => {
  // Format date when displaying it in the UI
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      return format(new Date(dateString), "yyyy-MM-dd");
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
      <h3 className="font-medium mb-4">זמני עבודה</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="workDate" className="block text-sm font-medium mb-1">תאריך עבודה</Label>
          <div className="relative">
            <Calendar
              size={16}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <Input
              id="workDate"
              type="date"
              value={formatDate(workDate)}
              onChange={(e) => setWorkDate(e.target.value)}
              className="pr-10 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="workTime" className="block text-sm font-medium mb-1">שעה (אופציונלי)</Label>
          <div className="relative">
            <Clock
              size={16}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <Input
              id="workTime"
              type="time"
              value={workTime}
              onChange={(e) => setWorkTime(e.target.value)}
              placeholder="HH:MM"
              className="pr-10 border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkScheduleForm;
