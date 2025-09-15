/**
 * Hebrew Lead Categories for Israeli Market
 * Comprehensive list of service categories in Hebrew with English fallbacks
 */

export interface Category {
  id: string;
  name: string;
  name_he: string;
  description?: string;
  icon?: string;
  subcategories?: Category[];
}

export const HEBREW_CATEGORIES: Category[] = [
  {
    id: "construction",
    name: "Construction",
    name_he: "בנייה ושיפוצים",
    icon: "🏗️",
    subcategories: [
      { id: "general_contractor", name: "General Contractor", name_he: "קבלן כללי" },
      { id: "renovation", name: "Renovation", name_he: "שיפוצים" },
      { id: "painting", name: "Painting", name_he: "צביעה" },
      { id: "flooring", name: "Flooring", name_he: "ריצוף וחיפוי" },
      { id: "plumbing", name: "Plumbing", name_he: "אינסטלציה" },
      { id: "electrical", name: "Electrical", name_he: "חשמל" },
      { id: "carpentry", name: "Carpentry", name_he: "נגרות" },
      { id: "roofing", name: "Roofing", name_he: "גגות" }
    ]
  },
  {
    id: "home_services",
    name: "Home Services",
    name_he: "שירותי בית",
    icon: "🏠",
    subcategories: [
      { id: "cleaning", name: "Cleaning", name_he: "ניקיון" },
      { id: "maintenance", name: "Maintenance", name_he: "תחזוקה" },
      { id: "gardening", name: "Gardening", name_he: "גינון" },
      { id: "pest_control", name: "Pest Control", name_he: "הדברה" },
      { id: "locksmith", name: "Locksmith", name_he: "מנעולנות" },
      { id: "appliance_repair", name: "Appliance Repair", name_he: "תיקון מכשירי חשמל" }
    ]
  },
  {
    id: "automotive",
    name: "Automotive",
    name_he: "רכב ותחבורה",
    icon: "🚗",
    subcategories: [
      { id: "mechanic", name: "Mechanic", name_he: "מכונאי" },
      { id: "car_wash", name: "Car Wash", name_he: "שטיפת רכב" },
      { id: "towing", name: "Towing", name_he: "גרירה" },
      { id: "driving_instructor", name: "Driving Instructor", name_he: "מורה נהיגה" },
      { id: "car_rental", name: "Car Rental", name_he: "השכרת רכב" }
    ]
  },
  {
    id: "health_beauty",
    name: "Health & Beauty",
    name_he: "בריאות ויופי",
    icon: "💅",
    subcategories: [
      { id: "hairdresser", name: "Hairdresser", name_he: "מעצב שיער" },
      { id: "makeup_artist", name: "Makeup Artist", name_he: "מאפרת" },
      { id: "massage", name: "Massage", name_he: "עיסוי" },
      { id: "personal_trainer", name: "Personal Trainer", name_he: "מאמן אישי" },
      { id: "physiotherapy", name: "Physiotherapy", name_he: "פיזיותרפיה" },
      { id: "nutrition", name: "Nutrition", name_he: "תזונה" }
    ]
  },
  {
    id: "events",
    name: "Events",
    name_he: "אירועים וחגיגות",
    icon: "🎉",
    subcategories: [
      { id: "wedding_planner", name: "Wedding Planner", name_he: "מתכנן חתונות" },
      { id: "photographer", name: "Photographer", name_he: "צלם" },
      { id: "videographer", name: "Videographer", name_he: "צלם וידאו" },
      { id: "catering", name: "Catering", name_he: "קייטרינג" },
      { id: "dj", name: "DJ", name_he: "דיג'יי" },
      { id: "flowers", name: "Flowers", name_he: "פרחים" },
      { id: "venue", name: "Venue", name_he: "אולמות" }
    ]
  },
  {
    id: "education",
    name: "Education",
    name_he: "חינוך והוראה",
    icon: "📚",
    subcategories: [
      { id: "private_tutor", name: "Private Tutor", name_he: "מורה פרטי" },
      { id: "language_teacher", name: "Language Teacher", name_he: "מורה שפות" },
      { id: "music_teacher", name: "Music Teacher", name_he: "מורה מוזיקה" },
      { id: "childcare", name: "Childcare", name_he: "בייביסיטר" },
      { id: "exam_prep", name: "Exam Preparation", name_he: "הכנה לבחינות" }
    ]
  },
  {
    id: "technology",
    name: "Technology",
    name_he: "טכנולוגיה ומחשבים",
    icon: "💻",
    subcategories: [
      { id: "computer_repair", name: "Computer Repair", name_he: "תיקון מחשבים" },
      { id: "web_development", name: "Web Development", name_he: "פיתוח אתרים" },
      { id: "graphic_design", name: "Graphic Design", name_he: "עיצוב גרפי" },
      { id: "it_support", name: "IT Support", name_he: "תמיכה טכנית" },
      { id: "social_media", name: "Social Media", name_he: "ניהול רשתות חברתיות" }
    ]
  },
  {
    id: "professional_services",
    name: "Professional Services",
    name_he: "שירותים מקצועיים",
    icon: "💼",
    subcategories: [
      { id: "lawyer", name: "Lawyer", name_he: "עורך דין" },
      { id: "accountant", name: "Accountant", name_he: "רואה חשבון" },
      { id: "real_estate", name: "Real Estate", name_he: "נדלן" },
      { id: "insurance", name: "Insurance", name_he: "ביטוח" },
      { id: "financial_advisor", name: "Financial Advisor", name_he: "יועץ פיננסי" },
      { id: "business_consultant", name: "Business Consultant", name_he: "יעוץ עסקי" }
    ]
  },
  {
    id: "food_beverage",
    name: "Food & Beverage",
    name_he: "מזון ומשקאות",
    icon: "🍽️",
    subcategories: [
      { id: "chef", name: "Private Chef", name_he: "שף פרטי" },
      { id: "bartender", name: "Bartender", name_he: "ברמן" },
      { id: "food_delivery", name: "Food Delivery", name_he: "משלוח אוכל" },
      { id: "meal_prep", name: "Meal Preparation", name_he: "הכנת ארוחות" }
    ]
  },
  {
    id: "transportation",
    name: "Transportation",
    name_he: "הסעות ומשלוחים",
    icon: "🚚",
    subcategories: [
      { id: "moving", name: "Moving Services", name_he: "הובלות" },
      { id: "delivery", name: "Delivery", name_he: "משלוחים" },
      { id: "taxi", name: "Taxi", name_he: "מונית" },
      { id: "courier", name: "Courier", name_he: "שליח" }
    ]
  }
];

export const getCategoryById = (id: string): Category | undefined => {
  for (const category of HEBREW_CATEGORIES) {
    if (category.id === id) return category;

    if (category.subcategories) {
      const subcategory = category.subcategories.find(sub => sub.id === id);
      if (subcategory) return subcategory;
    }
  }
  return undefined;
};

export const getCategoryNameInHebrew = (id: string): string => {
  const category = getCategoryById(id);
  return category?.name_he || category?.name || id;
};

export const getAllCategories = (): Category[] => {
  const allCategories: Category[] = [];

  for (const category of HEBREW_CATEGORIES) {
    allCategories.push(category);
    if (category.subcategories) {
      allCategories.push(...category.subcategories);
    }
  }

  return allCategories;
};

export const searchCategories = (query: string): Category[] => {
  const normalizedQuery = query.toLowerCase();
  const results: Category[] = [];

  for (const category of HEBREW_CATEGORIES) {
    // Check main category
    if (
      category.name.toLowerCase().includes(normalizedQuery) ||
      category.name_he.includes(query)
    ) {
      results.push(category);
    }

    // Check subcategories
    if (category.subcategories) {
      for (const subcategory of category.subcategories) {
        if (
          subcategory.name.toLowerCase().includes(normalizedQuery) ||
          subcategory.name_he.includes(query)
        ) {
          results.push(subcategory);
        }
      }
    }
  }

  return results;
};