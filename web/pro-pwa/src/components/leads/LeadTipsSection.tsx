
import React from "react";

export const LeadTipsSection = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-medium text-blue-800 mb-2">💡 טיפים לליד מוצלח</h3>
      <ul className="text-sm text-blue-700 space-y-1">
        <li>• תאר בפירוט את העבודה הנדרשת</li>
        <li>• צרף תמונות או סרטונים אם יש - זה מאוד עוזר</li>
        <li>• ציין את לוח הזמנים הרצוי</li>
        <li>• ציין אם יש דרישות מיוחדות לחומרים או כלים</li>
        <li>• מלא כתובת מדויקת - העיר תקבע אוטומטית</li>
      </ul>
    </div>
  );
};
