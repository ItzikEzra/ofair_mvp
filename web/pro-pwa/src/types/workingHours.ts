
export interface DaySchedule {
  active: boolean;
  start: string;
  end: string;
}

export interface WeeklySchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  sunday: { active: true, start: "07:00", end: "18:00" },
  monday: { active: true, start: "07:00", end: "18:00" },
  tuesday: { active: true, start: "07:00", end: "18:00" },
  wednesday: { active: true, start: "07:00", end: "18:00" },
  thursday: { active: true, start: "07:00", end: "18:00" },
  friday: { active: true, start: "07:00", end: "18:00" },
  saturday: { active: false, start: "07:00", end: "18:00" }
};

export const DAY_NAMES = {
  sunday: "ראשון",
  monday: "שני", 
  tuesday: "שלישי",
  wednesday: "רביעי",
  thursday: "חמישי",
  friday: "שישי",
  saturday: "שבת"
} as const;
