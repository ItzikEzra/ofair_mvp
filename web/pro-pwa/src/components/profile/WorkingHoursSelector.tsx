
import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { WeeklySchedule, DAY_NAMES, DEFAULT_WEEKLY_SCHEDULE } from "@/types/workingHours";

interface WorkingHoursSelectorProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}

const WorkingHoursSelector: React.FC<WorkingHoursSelectorProps> = ({
  value,
  onChange,
  isEditing
}) => {
  const parseSchedule = (scheduleString: string): WeeklySchedule => {
    try {
      if (!scheduleString) return DEFAULT_WEEKLY_SCHEDULE;
      return JSON.parse(scheduleString);
    } catch {
      return DEFAULT_WEEKLY_SCHEDULE;
    }
  };

  const schedule = parseSchedule(value);

  const updateSchedule = (day: keyof WeeklySchedule, field: 'active' | 'start' | 'end', newValue: boolean | string) => {
    const newSchedule = {
      ...schedule,
      [day]: {
        ...schedule[day],
        [field]: newValue
      }
    };
    onChange(JSON.stringify(newSchedule));
  };

  const formatScheduleForDisplay = (schedule: WeeklySchedule): string => {
    const activeDays = Object.entries(schedule)
      .filter(([_, daySchedule]) => daySchedule.active)
      .map(([day, daySchedule]) => 
        `${DAY_NAMES[day as keyof typeof DAY_NAMES]}: ${daySchedule.start}-${daySchedule.end}`
      );
    
    return activeDays.length > 0 ? activeDays.join(', ') : 'לא נקבע';
  };

  if (!isEditing) {
    return (
      <div className="text-gray-900 break-words">
        {formatScheduleForDisplay(schedule)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(schedule).map(([day, daySchedule]) => (
        <div key={day} className="flex flex-col space-y-2 p-4 border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-foreground">
              {DAY_NAMES[day as keyof typeof DAY_NAMES]}
            </Label>
            <Switch
              checked={daySchedule.active}
              onCheckedChange={(checked) => updateSchedule(day as keyof WeeklySchedule, 'active', checked)}
            />
          </div>
          
          {daySchedule.active && (
            <div className="flex items-center justify-center space-x-2 pt-2">
              <input
                type="time"
                value={daySchedule.start}
                onChange={(e) => updateSchedule(day as keyof WeeklySchedule, 'start', e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              />
              <span className="text-sm text-muted-foreground px-2">עד</span>
              <input
                type="time"
                value={daySchedule.end}
                onChange={(e) => updateSchedule(day as keyof WeeklySchedule, 'end', e.target.value)}
                className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default WorkingHoursSelector;
