
import React from "react";

interface CityDisplaySectionProps {
  extractedCity: string;
}

export const CityDisplaySection = ({ extractedCity }: CityDisplaySectionProps) => {
  if (!extractedCity || extractedCity === "לא צוין" || extractedCity.length < 2) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
          <div className="text-sm font-bold text-amber-800">
            עיר לא זוהתה אוטומטית
          </div>
        </div>
        <div className="text-xs text-amber-700 mt-2 font-medium">
          ⚠️ הזן כתובת מדויקת יותר עם Google Places כדי לזהות עיר אוטומטית
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="text-sm font-bold text-green-800">
          עיר שזוהתה: <span className="text-xl font-extrabold">{extractedCity}</span>
        </div>
      </div>
      <div className="text-xs text-green-700 mt-2 font-medium">
        ✅ העיר נקבעה אוטומטית באמצעות Google Places (מתקדם)
      </div>
    </div>
  );
};
