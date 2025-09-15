import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Professional } from "@/types/profile";
import { SecureProfessionalService } from "@/services/secureProfessionalService";
import { SecureProfileService } from "@/services/secureProfileService";
import ProfileHeader from "./ProfileHeader";
import ProfileFormFields from "./ProfileFormFields";
import ProfileActions from "./ProfileActions";
import { useAuth } from "@/contexts/auth/AuthContext";

interface ProfileFormProps {
  onProfileUpdate?: () => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ onProfileUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { professionalData, refreshProfessionalData } = useAuth();
  
  const [profile, setProfile] = useState<Professional>({
    id: "",
    name: "",
    profession: "",
    location: "",
    areas: "",
    about: "",
    phone_number: "",
    email: "",
    working_hours: "",
    languages: []
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        if (!professionalData?.id) {
          console.error("No professional data found in auth context");
          throw new Error("לא נמצאו פרטי מקצוען מחוברים");
        }

        const professionalId = professionalData.id.toString();
        console.log("Fetching profile for professional:", professionalId);

        // Use secure service to fetch own complete profile data
        const { data, error } = await SecureProfileService.getOwnProfile();

        if (error) {
          console.error("Error fetching profile:", error);
          throw error;
        }

        if (data && data !== null && typeof data === 'object' && 'id' in data) {
          console.log("Profile data fetched:", data);
          setProfile({
            id: (data as any).id?.toString() || "",
            name: (data as any).name || "",
            profession: (data as any).profession || "",
            location: (data as any).location || "",
            areas: (data as any).areas || "",
            about: (data as any).about || "",
            phone_number: (data as any).phone_number || "",
            email: (data as any).email || "",
            working_hours: (data as any).working_hours || "",
            languages: (data as any).languages || [],
            user_id: (data as any).user_id,
            specialties: (data as any).specialties,
            rating: (data as any).rating,
            review_count: (data as any).review_count,
            image: (data as any).image,
            created_at: (data as any).created_at,
            updated_at: (data as any).updated_at
          });
        } else {
          console.log("No profile data found");
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast({
          title: "שגיאה בטעינת הפרופיל",
          description: error.message || "אנא נסה שנית מאוחר יותר",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast, professionalData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleAreasChange = (value: string) => {
    setProfile((prev) => ({ ...prev, areas: value }));
  };

  const handleLanguagesChange = (value: string[]) => {
    setProfile((prev) => ({ ...prev, languages: value }));
  };

  const handleWorkingHoursChange = (value: string) => {
    setProfile((prev) => ({ ...prev, working_hours: value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      console.log("Saving profile data:", profile);
      
      const profileData = {
        name: profile.name,
        profession: profile.profession,
        location: profile.location,
        about: profile.about,
        phone_number: profile.phone_number,
        email: profile.email,
        working_hours: profile.working_hours,
        areas: profile.areas,
        languages: profile.languages
      };

      const { data, error } = await SecureProfileService.updateOwnProfile(profileData);

      if (error) {
        console.error("Error saving profile:", error);
        throw error;
      }

      if (data) {
        setProfile({
          ...profile,
          ...data
        });
      }

      // Refresh the auth context with updated data
      await refreshProfessionalData();

      toast({
        title: "פרופיל נשמר בהצלחה",
      });
      
      setIsEditing(false);
      onProfileUpdate?.();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "שגיאה בשמירת הפרופיל",
        description: error.message || "אנא נסה שנית מאוחר יותר",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      handleSave();
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-stone-50 rounded-3xl p-6 shadow-lg border border-slate-100">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-slate-200/40 to-gray-200/40 rounded-full blur-xl"></div>
        
        <div className="relative z-10 flex items-center justify-center h-80">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-gray-100 rounded-2xl flex items-center justify-center">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-t-slate-600 border-r-transparent border-b-transparent border-l-transparent rounded-full"></div>
            </div>
            <p className="text-slate-600 font-medium">טוען פרופיל...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-3xl p-6 shadow-lg border border-blue-100" dir="rtl">
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-200/40 to-indigo-200/40 rounded-full blur-xl"></div>
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br from-purple-200/40 to-pink-200/40 rounded-full blur-xl"></div>
      
      <div className="relative z-10">
        <ProfileHeader 
          isEditing={isEditing} 
          isSaving={isSaving} 
          onToggleEdit={handleToggleEdit} 
        />

        <ProfileFormFields
          profile={profile}
          isEditing={isEditing}
          onChange={handleChange}
          onAreasChange={handleAreasChange}
          onLanguagesChange={handleLanguagesChange}
          onWorkingHoursChange={handleWorkingHoursChange}
        />

        <ProfileActions 
          isEditing={isEditing} 
          isSaving={isSaving} 
          onCancel={handleCancelEdit} 
          onSave={handleSave} 
        />
      </div>
    </div>
  );
};

export default ProfileForm;
