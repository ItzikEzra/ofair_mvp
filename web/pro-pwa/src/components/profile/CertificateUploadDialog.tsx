
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Plus } from "lucide-react";
import { CertificateUpload } from "@/types/certificates";

interface CertificateUploadDialogProps {
  onUpload: (upload: CertificateUpload) => Promise<boolean>;
  isUploading: boolean;
  children?: React.ReactNode;
}

const CertificateUploadDialog: React.FC<CertificateUploadDialogProps> = ({
  onUpload,
  isUploading,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [certificateName, setCertificateName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!certificateName) {
        setCertificateName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !certificateName.trim()) return;

    const success = await onUpload({
      file: selectedFile,
      name: certificateName.trim()
    });

    if (success) {
      setIsOpen(false);
      setCertificateName("");
      setSelectedFile(null);
    }
  };

  const resetForm = () => {
    setCertificateName("");
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus size={16} className="mr-2" />
            העלאת תעודה
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>העלאת תעודה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="certificateName">שם התעודה</Label>
            <Input
              id="certificateName"
              value={certificateName}
              onChange={(e) => setCertificateName(e.target.value)}
              placeholder="לדוגמה: תעודת חשמלאי מוסמך"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="certificateFile">קובץ התעודה</Label>
            <Input
              id="certificateFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              קבצים נתמכים: PDF, JPG, PNG (עד 10MB)
            </p>
          </div>

          {selectedFile && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-blue-600" />
                <span className="text-sm font-medium">{selectedFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={!selectedFile || !certificateName.trim() || isUploading}>
              {isUploading ? "מעלה..." : "העלאה"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateUploadDialog;
