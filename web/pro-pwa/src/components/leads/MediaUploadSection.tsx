
import React from "react";
import { MultipleImageUpload } from "@/components/ui/multiple-image-upload";

interface MediaUploadSectionProps {
  mediaUrls: string[];
  onImageUploaded: (fileUrl: string) => void;
  onRemoveImage: (fileUrl: string) => void;
}

export const MediaUploadSection = ({
  mediaUrls,
  onImageUploaded,
  onRemoveImage
}: MediaUploadSectionProps) => {
  return (
    <div>
      <MultipleImageUpload 
        onImageUploaded={onImageUploaded} 
        bucketName="lead-images" 
        label="תמונות וסרטונים רלוונטיים (עד 5 קבצים)" 
        currentImages={mediaUrls} 
        onRemoveImage={onRemoveImage} 
        maxImages={5} 
      />
      <p className="text-xs text-gray-500 mt-1">
        תמונות וסרטונים עוזרים לבעלי מקצוע להבין טוב יותר את העבודה הנדרשת
      </p>
    </div>
  );
};
