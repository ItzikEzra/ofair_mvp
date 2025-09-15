
import React from "react";
import { Button } from "@/components/ui/button";

interface ProfileActionsProps {
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

const ProfileActions: React.FC<ProfileActionsProps> = ({
  isEditing,
  isSaving,
  onCancel,
  onSave,
}) => {
  if (!isEditing) return null;
  
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Button
        onClick={onCancel}
        variant="outline"
        disabled={isSaving}
        className="bg-white/80 border-white/50 hover:bg-white/90 text-gray-700 shadow-sm"
      >
        ביטול
      </Button>
      <Button 
        onClick={onSave} 
        disabled={isSaving}
        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md"
      >
        {isSaving ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
            שומר...
          </span>
        ) : (
          "שמירה"
        )}
      </Button>
    </div>
  );
};

export default ProfileActions;
