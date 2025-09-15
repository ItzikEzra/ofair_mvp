
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit, Check, User } from "lucide-react";

interface ProfileHeaderProps {
  isEditing: boolean;
  isSaving: boolean;
  onToggleEdit: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  isEditing,
  isSaving,
  onToggleEdit,
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl shadow-md">
          <User className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold text-blue-900">פרטים אישיים</h2>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleEdit}
        disabled={isSaving}
        className="bg-white/80 border-blue-200 hover:bg-white/90 text-blue-900"
      >
        {isEditing ? (
          isSaving ? (
            <span className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              שומר...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              שמירה
            </span>
          )
        ) : (
          <span className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            עריכה
          </span>
        )}
      </Button>
    </div>
  );
};

export default ProfileHeader;
