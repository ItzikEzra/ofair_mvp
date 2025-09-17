
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth/AuthContext";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";
import { useStorageBuckets } from "@/hooks/useStorageBuckets";

const SubmitRequest = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { professionalData } = useAuth();
  
  // Initialize storage buckets
  useStorageBuckets();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [timing, setTiming] = useState("");
  const [constraints, setConstraints] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageUploaded = (fileUrl: string) => {
    setMediaUrls(prev => [...prev, fileUrl]);
    console.log("Image uploaded:", fileUrl);
  };

  const handleRemoveImage = (fileUrl: string) => {
    setMediaUrls(prev => prev.filter(url => url !== fileUrl));
    console.log("Image removed:", fileUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!professionalData) {
      toast({
        title: "שגיאה",
        description: "יש להתחבר למערכת כדי לשלוח בקשה",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    if (!title || !description || !location) {
      toast({
        title: "שגיאה",
        description: "יש למלא את כל השדות הנדרשים",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Submitting request with media URLs:", mediaUrls);
      
      const requestData = {
        user_id: professionalData.id,
        title,
        description,
        location,
        category: category || null,
        timing: timing || null,
        constraints: constraints || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null
      };

      const { error } = await supabase.functions.invoke('submit-request', {
        body: requestData
      });

      if (error) {
        throw error;
      }

      toast({
        title: "הבקשה נשלחה בהצלחה!",
        description: "הבקשה שלך פורסמה בלוח המודעות"
      });

      navigate("/announcements");
    } catch (error) {
      console.error("Error submitting request:", error);
      toast({
        title: "שגיאה בשליחת הבקשה",
        description: "אירעה שגיאה בפרסום הבקשה. נסה שנית מאוחר יותר.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout title="הגש בקשה">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-32 left-1/4 w-72 h-72 bg-gradient-to-br from-green-400/15 to-emerald-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 right-1/3 w-56 h-56 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-2/3 left-16 w-40 h-40 bg-gradient-to-br from-orange-400/15 to-red-400/15 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-2xl mx-auto p-4" dir="rtl">
        <Card className="border-0 shadow-2xl shadow-green-500/10 bg-white/90 backdrop-blur-sm rounded-3xl">
          <CardHeader className="pt-8 px-8">
            <CardTitle className="text-2xl font-bold text-gray-800">פרסום בקשה חדשה</CardTitle>
            <p className="text-sm text-gray-600 leading-relaxed">
              פרסם בקשה לשירות והמתן להצעות מחיר מבעלי מקצוע.
            </p>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  כותרת הבקשה *
                </label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="לדוגמה: צביעת דירה 3 חדרים"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  תיאור הבקשה *
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="תאר בפירוט את השירות הנדרש..."
                  rows={4}
                  required
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium mb-1">
                  מיקום *
                </label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="עיר או אזור"
                  required
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-1">
                  קטגוריה
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construction">בנייה ושיפוצים</SelectItem>
                    <SelectItem value="plumbing">אינסטלציה</SelectItem>
                    <SelectItem value="electrical">חשמל</SelectItem>
                    <SelectItem value="painting">צביעה</SelectItem>
                    <SelectItem value="cleaning">ניקיון</SelectItem>
                    <SelectItem value="gardening">גינון</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="timing" className="block text-sm font-medium mb-1">
                  לוחות זמנים רצויים
                </label>
                <Input
                  id="timing"
                  value={timing}
                  onChange={(e) => setTiming(e.target.value)}
                  placeholder="לדוגמה: תוך שבועיים, דחוף, גמיש בזמנים..."
                />
              </div>

              <div>
                <MultipleImageUpload 
                  onImageUploaded={handleImageUploaded}
                  bucketName="request-media"
                  label="תמונות וסרטונים רלוונטיים (עד 5 קבצים)"
                  currentImages={mediaUrls}
                  onRemoveImage={handleRemoveImage}
                  maxImages={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  תמונות וסרטונים עוזרים לבעלי מקצוע להבין טוב יותר את הבקשה
                </p>
              </div>

              <div>
                <label htmlFor="constraints" className="block text-sm font-medium mb-1">
                  מגבלות או דרישות מיוחדות
                </label>
                <Textarea
                  id="constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="לדוגמה: העבודה חייבת להתבצע בסוף השבוע, יש צורך בחומרים מיוחדים..."
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-4 rounded-2xl shadow-2xl shadow-green-500/25 font-medium transition-all duration-300 transform hover:scale-[1.02]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    מפרסם בקשה...
                  </>
                ) : (
                  "פרסם בקשה"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default SubmitRequest;
