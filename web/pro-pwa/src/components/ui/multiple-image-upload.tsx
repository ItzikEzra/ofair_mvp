
import React, { useRef } from "react";
import { Button } from "./button";
import { FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MultipleImageUploadProps {
  onImageUploaded: (fileUrl: string) => void;
  bucketName: string;
  label?: string;
  currentImages: string[];
  onRemoveImage: (fileUrl: string) => void;
  maxImages?: number;
}

const ACCEPTED_MEDIA = ".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.mp4,.mov,.webm,.ogg,.m4v";

const uploadToBucket = async (bucket: string, file: File): Promise<string | null> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { upsert: true });
    if (error) {
      console.error("שגיאה בהעלאת קובץ:", error);
      toast.error("שגיאה בהעלאת קובץ: " + error.message);
      return null;
    }
    const url = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    if (!url) {
      toast.error("לא התקבל קישור ציבורי אחרי ההעלאה");
      return null;
    }
    console.log("[MultipleImageUpload] העלאה הצליחה, URL:", url);
    return url;
  } catch (e: any) {
    console.error("שגיאה כללית בהעלאת קובץ:", e);
    toast.error("שגיאה כללית בהעלאת קובץ: " + (e?.message || e));
    return null;
  }
};

const isImage = (url: string) => {
  return /\.(jpe?g|png|gif|bmp|webp|svg)$/i.test(url);
};

const isVideo = (url: string) => {
  return /\.(mp4|mov|webm|ogg|m4v)$/i.test(url);
};

const MediaPreview: React.FC<{ url: string; onRemove: () => void }> = ({ url, onRemove }) => {
  if (isImage(url)) {
    return (
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
        <img 
          src={url} 
          alt="תצוגה מקדימה" 
          className="w-full h-full object-cover"
        />
        <button 
          type="button" 
          onClick={onRemove} 
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
        >
          <Trash2 size={12}/>
        </button>
      </div>
    );
  }
  
  if (isVideo(url)) {
    return (
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
        <video 
          src={url} 
          className="w-full h-full object-cover"
          muted
        />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
          <div className="text-white text-xs font-medium">▶</div>
        </div>
        <button 
          type="button" 
          onClick={onRemove} 
          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
        >
          <Trash2 size={12}/>
        </button>
      </div>
    );
  }

  // Fallback for unknown file types
  return (
    <div className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
      <span className="text-xs text-gray-500">קובץ</span>
      <button 
        type="button" 
        onClick={onRemove} 
        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
      >
        <Trash2 size={12}/>
      </button>
    </div>
  );
};

const MultipleImageUpload: React.FC<MultipleImageUploadProps> = ({
  onImageUploaded,
  bucketName,
  label = "העלאת קבצים (תמונה/וידאו)",
  currentImages,
  onRemoveImage,
  maxImages = 5
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxImages - currentImages.length;
    if (remainingSlots <= 0) {
      toast.error(`הגעת למספר קבצים מירבי: ${maxImages}`);
      return;
    }
    
    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    if (filesToUpload.length < files.length) {
      toast.error(`ניתן להעלות רק ${remainingSlots} קבצים נוספים`);
    }
    
    // Upload files sequentially to prevent race conditions
    for (const file of filesToUpload) {
      try {
        console.log(`Uploading ${file.name}...`);
        const url = await uploadToBucket(bucketName, file);
        
        if (url) {
          console.log(`Successfully uploaded: ${url}`);
          onImageUploaded(url);
          toast.success("קובץ הועלה בהצלחה", { description: file.name });
          
          // Small delay to ensure state updates properly
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          toast.error("העלאת קובץ נכשלה עבור: " + file.name);
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        toast.error("שגיאה בהעלאת קובץ: " + file.name);
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="space-y-3">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUp className="ml-1 w-4 h-4" />
          בחר קבצים
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MEDIA}
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        
        {currentImages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentImages.map((url, index) => (
              <MediaPreview 
                key={index} 
                url={url} 
                onRemove={() => onRemoveImage(url)} 
              />
            ))}
          </div>
        )}
      </div>
      
      {currentImages.length >= maxImages && (
        <div className="text-xs text-orange-500 mt-2">הגעת למספר קבצים מירבי: {maxImages}</div>
      )}
    </div>
  );
};

export { MultipleImageUpload };
