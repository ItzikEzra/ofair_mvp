
export interface ProfessionCategory {
  value: string;
  label: string;
  synonyms: string[];
}

export const professionCategories: ProfessionCategory[] = [
  {
    value: "electrician",
    label: "חשמלאי",
    synonyms: ["חשמל", "תיקוני חשמל", "עבודות חשמל", "התקנת חשמל", "תאורה"]
  },
  {
    value: "plumber",
    label: "אינסטלטור",
    synonyms: ["אינסטלציה", "צנרת", "שרברב", "שרברבות", "תיקוני צנרת", "ביוב"]
  },
  {
    value: "carpenter",
    label: "נגר",
    synonyms: ["נגרות", "עבודות עץ", "רהיטים", "ארונות", "מטבחים", "דלתות עץ"]
  },
  {
    value: "painter",
    label: "צבע",
    synonyms: ["צביעה", "צבעות", "שיפוץ קירות", "סיוד", "צביעת דירה"]
  },
  {
    value: "cleaner",
    label: "ניקיון",
    synonyms: ["עובד ניקיון", "ניקוי", "חברת ניקיון", "ניקיון בתים", "ניקיון משרדים"]
  },
  {
    value: "gardener",
    label: "גנן",
    synonyms: ["גינון", "טיפול בגינה", "עיצוב גינות", "השקיה", "דשא", "צמחייה"]
  },
  {
    value: "locksmith",
    label: "מנעולן",
    synonyms: ["מנעולים", "פריצת דלתות", "מנעולנות", "החלפת מנעולים"]
  },
  {
    value: "construction",
    label: "בנייה",
    synonyms: ["קבלן בניין", "עבודות בניה", "שיפוץ מבנים", "קבלן שלד"]
  },
  {
    value: "technician",
    label: "טכנאי",
    synonyms: ["תיקונים", "טכנאי מחשבים", "טכנאי מכשירי חשמל", "טכנאי מזגנים"]
  },
  {
    value: "handyman",
    label: "שיפוצים",
    synonyms: ["איש תחזוקה", "עבודות תחזוקה", "בעל מקצוע", "תיקונים כלליים", "סתת"]
  },
  {
    value: "air_conditioning",
    label: "מיזוג אוויר",
    synonyms: ["מזגנים", "התקנת מזגנים", "תיקון מזגנים", "טכנאי מזגנים", "קירור", "מערכות מיזוג"]
  },
  {
    value: "tiler",
    label: "רצף",
    synonyms: ["ריצוף", "חיפוי", "קרמיקה", "אריחים", "חיפוי קירות", "עבודות ריצוף"]
  },
  {
    value: "architect",
    label: "אדריכל",
    synonyms: ["תכנון בתים", "עיצוב פנים", "תכנון אדריכלי", "תוכניות בנייה"]
  },
  {
    value: "welder",
    label: "רתך",
    synonyms: ["ריתוך", "סורגים", "עבודות מתכת", "גדרות", "מסגרות"]
  },
  {
    value: "exterminator",
    label: "מדביר",
    synonyms: ["הדברה", "טיפול במזיקים", "חרקים", "הדברת מזיקים"]
  },
  {
    value: "moving",
    label: "הובלות",
    synonyms: ["מובילים", "העברת דירה", "הובלה", "הובלת רהיטים", "מעבר דירה"]
  },
  {
    value: "security",
    label: "מאבטח",
    synonyms: ["אבטחה", "שמירה", "אבטחת אירועים", "שומר"]
  },
  {
    value: "electricalappliances",
    label: "מכשירי חשמל",
    synonyms: ["תיקון מכשירי חשמל", "טכנאי מקררים", "תיקון מכונות כביסה", "טכנאי חשמל ביתי"]
  },
  {
    value: "pool",
    label: "בריכות שחייה",
    synonyms: ["תחזוקת בריכות", "בנית בריכות", "טיפול במי בריכה", "ניקוי בריכות"]
  },
  {
    value: "roofing",
    label: "גגות",
    synonyms: ["איטום גגות", "תיקון גגות", "גגות רעפים", "זיפות"]
  },
  {
    value: "flooring",
    label: "פרקט",
    synonyms: ["רצפת עץ", "התקנת פרקט", "ליטוש פרקט", "שיפוץ רצפה"]
  },
  {
    value: "sewage",
    label: "ביוב",
    synonyms: ["תיקון ביוב", "פתיחת סתימות", "ניקוז", "ביובית", "צנרת ביוב"]
  },
  {
    value: "solar",
    label: "אנרגיה סולארית",
    synonyms: ["התקנת פאנלים סולאריים", "דוד שמש", "תיקון דוד שמש", "קולטי שמש"]
  },
  {
    value: "computers",
    label: "מחשבים",
    synonyms: ["טכנאי מחשבים", "תיקון מחשבים", "התקנת תוכנה", "שדרוג מחשב"]
  },
  {
    value: "communication",
    label: "תקשורת",
    synonyms: ["התקנת רשתות", "טלפוניה", "אינטרנט", "כבלים", "תשתיות תקשורת"]
  },
  {
    value: "kitchen",
    label: "מטבחים",
    synonyms: ["שיש", "התקנת מטבחים", "תכנון מטבח", "ארונות מטבח"]
  },
  {
    value: "automotive",
    label: "רכב",
    synonyms: ["מוסך", "טיפול רכב", "תיקוני רכב", "חשמלאי רכב", "פנצ'ריה"]
  },
  {
    value: "glazing",
    label: "זגגות",
    synonyms: ["זכוכית", "חלונות", "תריסים", "אלומיניום", "סורגים"]
  },
  {
    value: "drywall",
    label: "גבס",
    synonyms: ["קירות גבס", "תקרות גבס", "חלוקת חדרים", "עבודות גבס"]
  },
  {
    value: "insulation",
    label: "בידוד",
    synonyms: ["איטום", "בידוד תרמי", "איטום קירות", "בידוד רטיבות"]
  },
  {
    value: "renovation",
    label: "שיפוצים כלליים",
    synonyms: ["שיפוץ דירה", "שיפוץ כללי", "קבלן שיפוצים"]
  },
  {
    value: "other",
    label: "אחר",
    synonyms: []
  }
];
