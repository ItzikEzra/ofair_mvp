
import React from "react";
import { Professional } from "@/types/profile";
import ProfileSection from "./ProfileSection";
import WorkAreasSelect from "./WorkAreasSelect";
import LanguagesSelect from "./LanguagesSelect";
import WorkingHoursSelector from "./WorkingHoursSelector";

interface ProfileFormFieldsProps {
  profile: Professional;
  isEditing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onAreasChange: (value: string) => void;
  onLanguagesChange: (value: string[]) => void;
  onWorkingHoursChange: (value: string) => void;
}

const ProfileFormFields: React.FC<ProfileFormFieldsProps> = ({
  profile,
  isEditing,
  onChange,
  onAreasChange,
  onLanguagesChange,
  onWorkingHoursChange
}) => {
  return (
    <div className="space-y-6">
      <ProfileSection
        label="שם מלא" 
        name="name" 
        value={profile.name} 
        isEditing={isEditing} 
        onChange={onChange} 
      />
      
      <ProfileSection 
        label="מקצוע" 
        name="profession" 
        value={profile.profession} 
        isEditing={isEditing} 
        onChange={onChange} 
      />
      
      <ProfileSection 
        label="אזור מגורים" 
        name="location" 
        value={profile.location || ""} 
        isEditing={isEditing} 
        onChange={onChange} 
      />
      
      <ProfileSection 
        label="אזורי עבודה"
        isEditing={isEditing}
        customComponent={
          <WorkAreasSelect
            value={profile.areas || ""}
            onChange={onAreasChange}
            isEditing={isEditing}
          />
        }
      />

      <ProfileSection 
        label="שפות"
        isEditing={isEditing}
        customComponent={
          <LanguagesSelect
            value={profile.languages || []}
            onChange={onLanguagesChange}
            isEditing={isEditing}
          />
        }
      />

      <ProfileSection 
        label="שעות עבודה"
        isEditing={isEditing}
        customComponent={
          <WorkingHoursSelector
            value={profile.working_hours || ""}
            onChange={onWorkingHoursChange}
            isEditing={isEditing}
          />
        }
      />
      
      <ProfileSection 
        label="אודות" 
        name="about" 
        value={profile.about || ""} 
        isEditing={isEditing} 
        isTextarea={true}
        onChange={onChange} 
      />
      
      <ProfileSection 
        label="טלפון" 
        name="phone_number" 
        value={profile.phone_number || ""} 
        isEditing={isEditing} 
        dir="ltr"
        onChange={onChange} 
      />
      
      <ProfileSection 
        label="אימייל" 
        name="email" 
        value={profile.email || ""} 
        isEditing={isEditing} 
        dir="ltr"
        onChange={onChange} 
      />
    </div>
  );
};

export default ProfileFormFields;
