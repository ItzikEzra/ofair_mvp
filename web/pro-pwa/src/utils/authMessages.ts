
export const getAuthErrorMessage = (error: any) => {
  console.error("Error in authentication:", error);
  return {
    title: "שגיאה בתהליך ההתחברות",
    description: "אירעה שגיאה בעת תהליך ההתחברות, אנא נסו שנית"
  };
};

export const getInvalidPhoneMessage = () => ({
  title: "מספר טלפון לא תקין",
  description: "אנא הכנס מספר טלפון תקין"
});

export const getEmailUnsupportedMessage = () => ({
  title: "שגיאת התחברות",
  description: "כניסה עם מייל אינה נתמכת כרגע, אנא השתמש במספר טלפון"
});

export const getProfessionalNotFoundMessage = () => ({
  title: "משתמש לא קיים",
  description: "לא נמצא בעל מקצוע עם מספר הטלפון הזה. יש להירשם במערכת."
});

export const getSystemErrorMessage = () => ({
  title: "שגיאת מערכת",
  description: "אירעה שגיאה בבדיקת הפרטים, אנא נסו שנית מאוחר יותר"
});

