
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Bell, User, Shield } from "lucide-react";
import NotificationPreferencesSection from "@/components/settings/NotificationPreferencesSection";
import MainLayout from "@/components/layout/MainLayout";

const Settings = () => {
  return (
    <MainLayout title="הגדרות">
      <div className="min-h-screen">
        <div className="space-y-8 p-6">

          {/* העדפות התראות ופרסומים */}
          <NotificationPreferencesSection />

          <Separator className="my-8 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />

          {/* אזורי התראות */}
          <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-2xl shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                  <Bell size={24} className="text-white" />
                </div>
                אזורי התראות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                <p className="text-sm text-gray-700 font-medium mb-2">
                  📍 הגדרות מיקום אוטומטיות
                </p>
                <p className="text-sm text-gray-600">
                  אזורי התראות מוגדרים אוטומטית בהתאם לנתונים שלך בפרופיל
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/50">
                <p className="text-sm text-gray-700 font-medium mb-2">
                  ⚙️ עדכון הגדרות
                </p>
                <p className="text-sm text-gray-600">
                  לשינוי אזורים, עדכן את הפרופיל שלך
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-8 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />

          {/* הגדרות פרופיל */}
          <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-2xl shadow-purple-500/10 hover:shadow-purple-500/20 transition-all duration-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <User size={24} className="text-white" />
                </div>
                הגדרות פרופיל
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100/50">
                <p className="text-gray-700 font-medium">
                  🔧 מרכז הפרופיל המלא
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  להגדרות הפרופיל המלאות, עבור לדף הפרופיל
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator className="my-8 bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />

          {/* הגדרות אבטחה */}
          <Card className="rounded-3xl border-0 bg-white/80 backdrop-blur-sm shadow-2xl shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all duration-500">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl font-bold">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Shield size={24} className="text-white" />
                </div>
                אבטחה ופרטיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-100/50">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    הנתונים שלך מוגנים בהצפנה מתקדמת
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100/50">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    מידע הלקוחות נשמר בביטחון מלא
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100/50">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-gray-700">
                    אפשרות לייצא או למחוק את הנתונים שלך
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
