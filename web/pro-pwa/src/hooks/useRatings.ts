import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessionalId } from "@/hooks/useProfessionalId";
import { useToast } from "@/hooks/use-toast";
import { getAuthToken } from "@/utils/storageUtils";
import { useAuth } from "@/contexts/auth/AuthContext";

export interface Rating {
  id: string;
  customer_initials: string; // Only initials, not full name for security
  created_at: string;
  recommendation: string | null;
  rating_overall: number;
  rating_cleanliness: number;
  rating_communication: number;
  rating_quality: number;
  rating_timing: number;
  rating_value: number;
}

export interface RatingsData {
  overall: number;
  service: number;
  communication: number;
  cleanliness: number;
  timeliness: number;
  reviewCount: number;
  reviews: Rating[];
}

export function useRatings() {
  const { professionalId } = useProfessionalId();
  const { professionalData, refreshProfessionalData } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingsData, setRatingsData] = useState<RatingsData | null>(null);

  useEffect(() => {
    const fetchRatings = async () => {
      if (!professionalId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get the OTP auth token
        const authToken = getAuthToken();
        console.log('=== RATINGS DEBUG ===');
        console.log('Professional ID from hook:', professionalId);
        console.log('Auth token available for ratings:', !!authToken);
        
        if (!professionalId) {
          console.error("No professional ID found for ratings");
          throw new Error("לא נמצא פרופיל מקצועי למשיכת דירוגים");
        }

        if (!authToken) {
          console.error("No auth token found for ratings");
          throw new Error("אנא התחבר למערכת לצפייה בדירוגים");
        }

        // Use secure function call through edge function that only returns professional's own ratings with masked customer data
        const { data: ratings, error: ratingsError } = await supabase.functions.invoke('get-my-professional-ratings', {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });

        if (ratingsError) {
          console.error("Error fetching ratings:", ratingsError);
          throw new Error("לא ניתן לטעון את נתוני הדירוגים");
        }

        console.log("Ratings found:", Array.isArray(ratings) ? ratings.length : 0);

        // If no ratings found, use empty defaults
        if (!ratings || !Array.isArray(ratings) || ratings.length === 0) {
          setRatingsData({
            overall: 0,
            service: 0,
            communication: 0,
            cleanliness: 0,
            timeliness: 0,
            reviewCount: 0,
            reviews: []
          });
          setIsLoading(false);
          return;
        }

        // Calculate averages
        const calculateAverage = (key: string) => {
          const sum = ratings.reduce((acc: number, rating: any) => {
            const value = Number(rating[key] || 0);
            return acc + value;
          }, 0);
          return sum / ratings.length;
        };

        // Create the formatted data structure
        const formattedData: RatingsData = {
          overall: calculateAverage("rating_overall"),
          service: calculateAverage("rating_quality"), // Map quality to service
          communication: calculateAverage("rating_communication"),
          cleanliness: calculateAverage("rating_cleanliness"),
          timeliness: calculateAverage("rating_timing"),
          reviewCount: ratings.length,
          reviews: ratings.map((rating: any) => ({
            id: rating.id,
            customer_initials: rating.customer_initials, // Use masked customer data
            created_at: rating.created_at,
            recommendation: rating.recommendation,
            rating_overall: Number(rating.rating_overall),
            rating_cleanliness: Number(rating.rating_cleanliness),
            rating_communication: Number(rating.rating_communication),
            rating_quality: Number(rating.rating_quality),
            rating_timing: Number(rating.rating_timing),
            rating_value: Number(rating.rating_value),
          })),
        };

        // Update the professional's rating in the database if it differs
        if (professionalData?.rating !== formattedData.overall) {
          console.log(`Updating professional rating from ${professionalData?.rating} to ${formattedData.overall}`);
          try {
            const { error: updateError } = await supabase.functions.invoke('update-professional-profile', {
              body: { 
                updates: { 
                  rating: formattedData.overall,
                  review_count: formattedData.reviewCount
                } 
              },
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });
            
            if (updateError) {
              console.error("Error updating professional rating:", updateError);
            } else {
              console.log("Professional rating updated successfully");
              // Refresh the auth context data to update dashboard
              try {
                await refreshProfessionalData();
                console.log("Professional data refreshed in auth context");
              } catch (refreshError) {
                console.error("Error refreshing professional data:", refreshError);
              }
            }
          } catch (updateErr) {
            console.error("Error calling update-professional-profile:", updateErr);
          }
        }

        setRatingsData(formattedData);

      } catch (err: any) {
        console.error("Error in useRatings:", err);
        setError(err.message || "אירעה שגיאה בטעינת הדירוגים");
        toast({
          title: "שגיאה בטעינת הדירוגים",
          description: err.message || "אירעה שגיאה בטעינת הדירוגים",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [professionalId, toast]);

  return { ratingsData, isLoading, error };
}