import React from "react";
const DailyTip = () => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/90 via-indigo-600/90 to-purple-600/90 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/20">
      <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-white/20 to-white/10 rounded-full blur-xl" />
      <div className="absolute -bottom-3 -left-3 w-16 h-16 bg-gradient-to-tr from-white/15 to-white/5 rounded-full blur-xl" />
      
      <div className="relative z-10">
        <h3 className="font-bold mb-3 text-white text-lg">טיפ מקצועי</h3>
        <p className="text-white/90 text-sm leading-relaxed">
          שים לב! שליחת תמונות של עבודות קודמות מגדילה את הסיכוי לזכות בפרויקט ב-60%
        </p>
      </div>
    </div>
  );
};
export default DailyTip;