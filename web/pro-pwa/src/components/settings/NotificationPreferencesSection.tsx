import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

const NotificationPreferencesSection = () => {
  const [preferences, setPreferences] = useState({
    // העדפות פרסומים
    marketingEmails: false,
    promotionalSms: false,
    newFeatureAlerts: true,
    
    // דרך קבלת התראות
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: false,
    
    // סוגי התראות
    leadNotifications: true,
    proposalNotifications: true,
    paymentNotifications: true,
    workReminders: true,
  });

  const handleToggle = (key: string) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  return (
    <Card className="border-0 shadow-2xl shadow-purple-500/10 bg-white/80 backdrop-blur-sm rounded-3xl">
      <CardHeader className="pt-6 px-6">
        <CardTitle className="flex items-center gap-3 text-gray-800">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Bell size={20} className="text-white" />
          </div>
          העדפות התראות ופרסומים
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          בחר איך תרצה לקבל התראות ופרסומים
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* דרך קבלת התראות */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <MessageSquare size={16} />
            דרך קבלת התראות
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-blue-600" />
                <Label htmlFor="email-notifications" className="text-sm">
                  התראות במייל
                </Label>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.emailNotifications}
                onCheckedChange={() => handleToggle('emailNotifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone size={16} className="text-green-600" />
                <Label htmlFor="sms-notifications" className="text-sm">
                  התראות בSMS
                </Label>
              </div>
              <Switch
                id="sms-notifications"
                checked={preferences.smsNotifications}
                onCheckedChange={() => handleToggle('smsNotifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-green-500" />
                <Label htmlFor="whatsapp-notifications" className="text-sm">
                  התראות בוואטסאפ
                </Label>
              </div>
              <Switch
                id="whatsapp-notifications"
                checked={preferences.whatsappNotifications}
                onCheckedChange={() => handleToggle('whatsappNotifications')}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* סוגי התראות */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Bell size={16} />
            סוגי התראות
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="lead-notifications" className="text-sm">
                התראות על לידים חדשים
              </Label>
              <Switch
                id="lead-notifications"
                checked={preferences.leadNotifications}
                onCheckedChange={() => handleToggle('leadNotifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="proposal-notifications" className="text-sm">
                התראות על הצעות מחיר
              </Label>
              <Switch
                id="proposal-notifications"
                checked={preferences.proposalNotifications}
                onCheckedChange={() => handleToggle('proposalNotifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="payment-notifications" className="text-sm">
                התראות על תשלומים
              </Label>
              <Switch
                id="payment-notifications"
                checked={preferences.paymentNotifications}
                onCheckedChange={() => handleToggle('paymentNotifications')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="work-reminders" className="text-sm">
                תזכורות השלמת עבודה
              </Label>
              <Switch
                id="work-reminders"
                checked={preferences.workReminders}
                onCheckedChange={() => handleToggle('workReminders')}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* העדפות פרסומים */}
        <div className="space-y-4">
          <h3 className="font-medium flex items-center gap-2">
            <Mail size={16} />
            העדפות פרסומים
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing-emails" className="text-sm">
                קבלת מיילים שיווקיים
              </Label>
              <Switch
                id="marketing-emails"
                checked={preferences.marketingEmails}
                onCheckedChange={() => handleToggle('marketingEmails')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="promotional-sms" className="text-sm">
                קבלת SMS פרסומיים
              </Label>
              <Switch
                id="promotional-sms"
                checked={preferences.promotionalSms}
                onCheckedChange={() => handleToggle('promotionalSms')}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="new-feature-alerts" className="text-sm">
                עדכונים על תכונות חדשות
              </Label>
              <Switch
                id="new-feature-alerts"
                checked={preferences.newFeatureAlerts}
                onCheckedChange={() => handleToggle('newFeatureAlerts')}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-sm text-blue-800">
            <strong>שים לב:</strong> התראות חשובות כמו תשלומים ועדכוני מערכת יישלחו תמיד כדי להבטיח שלא תפספס מידע חשוב.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesSection;