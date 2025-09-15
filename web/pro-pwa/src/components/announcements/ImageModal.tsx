
import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from 'lucide-react';

interface ImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
}

const ImageModal: React.FC<ImageModalProps> = ({
  open,
  onOpenChange,
  imageUrl,
  title
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[85vh] p-0 bg-black overflow-hidden">
        <div className="relative w-full h-full">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-full object-contain"
              style={{ 
                maxHeight: 'calc(85vh - 2rem)',
                touchAction: 'pinch-zoom'
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageModal;
