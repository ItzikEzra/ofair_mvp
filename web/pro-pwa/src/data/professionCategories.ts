
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
    value: "leak_detection",
    label: "מאתר נזילות",
    synonyms: ["איתור נזילות", "גילוי נזילות", "חיפוש נזילות", "טכנאי נזילות", "מציאת נזילה"]
  },
  {
    value: "masonry",
    label: "אבן ובנייה",
    synonyms: ["אבנים", "בונה", "קיר אבן", "חציבה", "עבודות אבן"]
  },
  {
    value: "demolition",
    label: "הריסות",
    synonyms: ["הריסה", "פירוק", "הריסת קירות", "פינוי פסולת", "הריסת מבנים"]
  },
  {
    value: "excavation",
    label: "חפירות",
    synonyms: ["עבודות עפר", "חפירה", "מחפר", "עפר ועפר", "עבודות עפר ובטון"]
  },
  {
    value: "fencing",
    label: "גדרות",
    synonyms: ["גדר", "גידור", "הקמת גדרות", "גדרות מתכת", "סורגים"]
  },
  {
    value: "upholstery",
    label: "ריפוד",
    synonyms: ["ריפוד רהיטים", "רפד", "ריפוד כיסאות", "חידוש ריפוד"]
  },
  {
    value: "appliance_repair",
    label: "תיקון מוצרי חשמל",
    synonyms: ["תיקון מקרר", "תיקון מכונת כביסה", "תיקון מדיח", "תיקון תנור", "תיקון מיקרוגל"]
  },
  {
    value: "photography",
    label: "צילום",
    synonyms: ["צלם", "צילום אירועים", "צילום תדמית", "עריכת וידאו", "צילום מוצרים"]
  },
  {
    value: "entertainment",
    label: "בידור",
    synonyms: ["די.ג'יי", "דיגיי", "זמר", "מוזיקה", "אמן", "הופעות"]
  },
  {
    value: "catering",
    label: "קייטרינג",
    synonyms: ["אספקת מזון", "מסעדן", "שירותי מזון", "בישול לאירועים"]
  },
  {
    value: "beauty",
    label: "יופי וקוסמטיקה",
    synonyms: ["איפור", "מעצבת שיער", "עיצוב גבות", "מניקוריסטית", "קוסמטיקאית"]
  },
  {
    value: "tutoring",
    label: "שיעורים פרטיים",
    synonyms: ["מורה פרטי", "הוראה", "שיעורי עזר", "מורה פרטית", "חינוך"]
  },
  {
    value: "translation",
    label: "תרגום",
    synonyms: ["מתרגם", "תרגום מסמכים", "תרגום בכתב", "שירותי תרגום"]
  },
  {
    value: "storage",
    label: "אחסון",
    synonyms: ["מחסן", "שירותי אחסון", "אחסנה", "מיני סטור"]
  },
  {
    value: "waste_removal",
    label: "פינוי פסולת",
    synonyms: ["פינוי הריסות", "פינוי זבל", "גרוטאות", "פינוי חומרי בנייה"]
  },
  {
    value: "veterinary",
    label: "וטרינר",
    synonyms: ["רופא וטרינר", "טיפול בחיות", "בעלי חיים", "מרפאה וטרינרית"]
  },
  {
    value: "landscaping",
    label: "אדריכלות נוף",
    synonyms: ["עיצוב נוף", "גינון מקצועי", "תכנון נוף", "אדריכל נוף"]
  },
  {
    value: "delivery",
    label: "שליחויות",
    synonyms: ["שליח", "משלוחים", "מסירה", "שירותי שליחות"]
  },
  {
    value: "event_planning",
    label: "ארגון אירועים",
    synonyms: ["מארגנת אירועים", "תכנון חתונות", "אירועים עסקיים", "אירועי חברה"]
  },
  {
    value: "legal",
    label: "שירותים משפטיים",
    synonyms: ["עורך דין", "ייעוץ משפטי", "נוטריון", "מתווך"]
  },
  {
    value: "accounting",
    label: "רואה חשבון",
    synonyms: ["הנהלת חשבונות", "ייעוץ כלכלי", "דוחות כספיים", "מס"]
  },
  {
    value: "fitness",
    label: "כושר ואימונים",
    synonyms: ["מאמן כושר", "מדריך ספורט", "יוגה", "פילאטיס", "אימון אישי"]
  },
  {
    value: "massage",
    label: "עיסוי",
    synonyms: ["מעסה", "עיסוי רפואי", "עיסוי שוודי", "עיסוי ספורטיבי"]
  },
  {
    value: "therapy",
    label: "טיפול ורפואה משלימה",
    synonyms: ["פיזיותרפיה", "טיפול טבעי", "רפואה אלטרנטיבית", "דיקור"]
  },
  {
    value: "consultation",
    label: "ייעוץ מקצועי",
    synonyms: ["יועץ", "ייעוץ עסקי", "ייעוץ פיננסי", "ייעוץ טכנולוגי"]
  },
  {
    value: "software",
    label: "פיתוח תוכנה",
    synonyms: ["מתכנת", "פיתוח אפליקציות", "פיתוח אתרים", "פיתוח מערכות"]
  },
  {
    value: "marketing",
    label: "שיווק ופרסום",
    synonyms: ["ניהול קמפיינים", "שיווק דיגיטלי", "פרסום", "ייעוץ שיווקי"]
  },
  {
    value: "design",
    label: "עיצוב גרפי",
    synonyms: ["מעצב גרפי", "עיצוב לוגו", "עיצוב אתרים", "עיצוב חומרי פרסום"]
  }
];

export const getCategoryByValue = (value: string): ProfessionCategory | undefined => {
  return professionCategories.find(category => category.value === value);
};

export const getCategoryByLabel = (label: string): ProfessionCategory | undefined => {
  return professionCategories.find(category => category.label === label);
};

// Find category by keyword, including searching in synonyms
export const findCategoryByKeyword = (keyword: string): ProfessionCategory | undefined => {
  const normalizedKeyword = keyword.trim().toLowerCase();
  
  // First try exact matches
  const exactMatch = professionCategories.find(
    category => 
      category.label.toLowerCase() === normalizedKeyword || 
      category.synonyms.some(syn => syn.toLowerCase() === normalizedKeyword)
  );
  
  if (exactMatch) return exactMatch;
  
  // Then try partial matches
  return professionCategories.find(
    category => 
      category.label.toLowerCase().includes(normalizedKeyword) || 
      category.synonyms.some(syn => syn.toLowerCase().includes(normalizedKeyword))
  );
};
