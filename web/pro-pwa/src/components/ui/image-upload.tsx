
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Image } from "lucide-react";
import { uploadImage } from "@/utils/imageUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  bucketName: string;
  label?: string;
  currentImage?: string | null;
  className?: string;
}

export function ImageUpload({
  onImageUploaded,
  bucketName,
  label = "העלאת תמונה",
  currentImage = null,
  className = "",
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(currentImage);
  const [error, setError] = useState<string | null>(null);
  const { isLoggedIn } = useAuth();
  
  // Update preview when currentImage changes
  useEffect(() => {
    if (currentImage) {
      setPreviewImage(currentImage);
    }
  }, [currentImage]);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Check if user is authenticated using global auth context
      if (!isLoggedIn) {
        console.error("Authentication check failed - user not logged in");
        setError("יש להתחבר למערכת כדי להעלות תמונה");
        toast.error("יש להתחבר למערכת כדי להעלות תמונה");
        setIsUploading(false);
        return;
      }
      
      console.log("User is authenticated, proceeding with file validation");
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("הקובץ גדול מדי (מקסימום 5MB)");
        toast.error("הקובץ גדול מדי (מקסימום 5MB)");
        setIsUploading(false);
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError("יש להעלות קובץ תמונה בלבד");
        toast.error("יש להעלות קובץ תמונה בלבד");
        setIsUploading(false);
        return;
      }
      
      console.log("File validated successfully, creating preview:", file.name);
      
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
      
      // First try to ensure the bucket exists using the edge function
      console.log("Ensuring bucket exists:", bucketName);
      try {
        const { error: bucketError } = await supabase.functions.invoke('ensure-storage-bucket', {
          body: { bucketName, isPublic: true }
        });
        
        if (bucketError) {
          console.warn("Warning: Could not ensure bucket exists:", bucketError);
          // Continue anyway - the upload function will try to create the bucket if needed
        } else {
          console.log("Bucket check successful");
        }
      } catch (bucketError) {
        console.warn("Error ensuring bucket exists (non-critical):", bucketError);
        // Continue anyway, the upload might still work
      }
      
      // Upload to storage with auth state flag
      console.log("Starting image upload to bucket:", bucketName);
      const imageUrl = await uploadImage(file, bucketName, isLoggedIn);
      
      if (imageUrl) {
        console.log("Image uploaded successfully:", imageUrl);
        onImageUploaded(imageUrl);
        toast.success("התמונה הועלתה בהצלחה");
      } else {
        // Reset preview if upload failed
        console.error("Image upload failed, no URL returned");
        setPreviewImage(currentImage);
        setError("שגיאה בהעלאת התמונה. אנא נסה שנית מאוחר יותר.");
      }
    } catch (error) {
      console.error("Error handling image:", error);
      setError("שגיאה בהעלאת התמונה");
      toast.error("שגיאה בהעלאת התמונה");
      setPreviewImage(currentImage);
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleRemoveImage = () => {
    setPreviewImage(null);
    setError(null);
    onImageUploaded("");
  };
  
  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {label && <Label htmlFor="image-upload">{label}</Label>}
      
      <div className="flex flex-col">
        {previewImage ? (
          <div className="mb-3">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={previewImage} 
                alt="תצוגה מקדימה" 
                className="w-full h-full object-cover"
              />
              <button 
                onClick={handleRemoveImage}
                type="button" 
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                aria-label="הסר תמונה"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : null}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-md w-full mb-2 text-sm">
            {error}
          </div>
        )}
        
        <Button 
          type="button" 
          variant="outline" 
          className="relative overflow-hidden w-full"
          disabled={isUploading}
        >
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          {isUploading ? (
            <span className="flex items-center">
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              טוען...
            </span>
          ) : (
            <span className="flex items-center">
              <Image className="ml-2 h-4 w-4" />
              {previewImage ? "החלף תמונה" : "העלאת תמונה"}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
