
import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUp, Trash2 } from "lucide-react";

interface Props {
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  label?: string;
}

const isImage = (file: File) => {
  return file.type.startsWith('image/');
};

const isPDF = (file: File) => {
  return file.type === 'application/pdf';
};

const FilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  if (isImage(file)) {
    const imageUrl = URL.createObjectURL(file);
    return (
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
        <img 
          src={imageUrl} 
          alt={file.name} 
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
  
  if (isPDF(file)) {
    return (
      <div className="relative w-20 h-20 rounded-lg border border-gray-200 bg-red-50 flex flex-col items-center justify-center">
        <div className="text-red-600 text-xl">📄</div>
        <div className="text-xs text-gray-600 mt-1">PDF</div>
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

  // Fallback for other file types
  return (
    <div className="relative w-20 h-20 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
      <div className="text-gray-600 text-xl">📎</div>
      <div className="text-xs text-gray-600 mt-1">קובץ</div>
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

const InvoiceUploadInput: React.FC<Props> = ({ value, onChange, accept = ".pdf,image/*", label = "העלה חשבונית (PDF/תמונה)" }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="space-y-3">
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
          <FileUp className="ml-1 w-4 h-4" />
          בחר קובץ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            if (!e.target.files?.[0]) onChange(null);
            else onChange(e.target.files[0]);
          }}
          hidden
        />
        
        {value && (
          <div className="flex items-center gap-3">
            <FilePreview file={value} onRemove={() => onChange(null)} />
            <div className="flex-1">
              <div className="text-sm font-medium">{value.name}</div>
              <div className="text-xs text-gray-500">
                {(value.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          </div>
        )}
      </div>
      
      {value && value.size > 6 * 1024 * 1024 && (
        <div className="text-xs text-red-600 mt-2">קובץ גדול מדי (מעל 6MB)</div>
      )}
    </div>
  );
};

export default InvoiceUploadInput;
