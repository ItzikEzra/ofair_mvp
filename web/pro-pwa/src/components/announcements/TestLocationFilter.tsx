
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TestLocationFilter = () => {
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTestingFilter, setIsTestingFilter] = useState(false);
  const { toast } = useToast();

  const getUserLocation = () => {
    setIsGettingLocation(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setIsGettingLocation(false);
          toast({
            title: "מיקום התקבל בהצלחה",
            description: `קואורדינטות: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
          });
        },
        (error) => {
          setIsGettingLocation(false);
          toast({
            title: "שגיאה בקבלת מיקום",
            description: error.message,
            variant: "destructive"
          });
        }
      );
    } else {
      setIsGettingLocation(false);
      toast({
        title: "לא נתמך",
        description: "הדפדפן שלך לא תומך בקבלת מיקום",
        variant: "destructive"
      });
    }
  };

  const testLocationFilter = async (distance: number) => {
    if (!userLocation) {
      toast({
        title: "שגיאה",
        description: "קודם צריך לקבל מיקום",
        variant: "destructive"
      });
      return;
    }

    setIsTestingFilter(true);
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const filters = {
        city: "",
        distance: distance,
        category: "",
        latitude: userLocation.lat,
        longitude: userLocation.lng
      };

      console.log("Testing filter with:", filters);

      const { data, error } = await supabase.functions.invoke('get-active-leads', {
        body: { filters }
      });

      if (error) {
        throw error;
      }

      console.log("Filter test results:", data);
      setTestResults(data || []);
      
      toast({
        title: "בדיקה הושלמה",
        description: `נמצאו ${data?.length || 0} לידים בטווח ${distance} ק"מ`,
      });
    } catch (error) {
      console.error("Filter test failed:", error);
      toast({
        title: "שגיאה בבדיקה",
        description: "אירעה שגיאה בבדיקת הפילטר",
        variant: "destructive"
      });
    } finally {
      setIsTestingFilter(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>בדיקת פילטר מיקום</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Get User Location */}
        <div className="space-y-2">
          <Button 
            onClick={getUserLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מקבל מיקום...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                קבל מיקום נוכחי
              </>
            )}
          </Button>
          
          {userLocation && (
            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
              מיקום נוכחי: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          )}
        </div>

        {/* Test Distance Filters */}
        {userLocation && (
          <div className="space-y-2">
            <h4 className="font-medium">בדוק פילטרים לפי מרחק:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[5, 10, 25, 50].map((distance) => (
                <Button
                  key={distance}
                  variant="outline"
                  onClick={() => testLocationFilter(distance)}
                  disabled={isTestingFilter}
                  size="sm"
                >
                  {distance} ק"מ
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">תוצאות הבדיקה:</h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {testResults.map((lead, index) => (
                <div key={index} className="text-sm border rounded p-2">
                  <div className="font-medium">{lead.title}</div>
                  <div className="text-gray-600">{lead.location}</div>
                  {lead.distance && (
                    <div className="text-blue-600">מרחק: {lead.distance.toFixed(2)} ק"מ</div>
                  )}
                  {lead.latitude && lead.longitude && (
                    <div className="text-xs text-gray-500">
                      קואורדינטות: {lead.latitude.toFixed(4)}, {lead.longitude.toFixed(4)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {testResults.length === 0 && userLocation && !isTestingFilter && (
          <div className="text-center text-gray-500 py-4">
            לחץ על אחד מכפתורי המרחק כדי לבדוק את הפילטר
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestLocationFilter;
