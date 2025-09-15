
import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ProfileSectionProps {
  label: string;
  name?: string;
  value?: string;
  isEditing: boolean;
  isTextarea?: boolean;
  dir?: "ltr" | "rtl";
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  customComponent?: React.ReactNode;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({
  label,
  name,
  value,
  isEditing,
  isTextarea = false,
  dir,
  onChange,
  customComponent,
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-blue-900">{label}</label>
      {customComponent ? (
        customComponent
      ) : isEditing ? (
        isTextarea ? (
          <Textarea
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full bg-white/80 border-white/50 focus:border-blue-300 focus:ring-blue-200 rounded-xl shadow-sm"
            rows={4}
            dir={dir}
          />
        ) : (
          <Input
            name={name}
            value={value || ""}
            onChange={onChange}
            className="w-full bg-white/80 border-white/50 focus:border-blue-300 focus:ring-blue-200 rounded-xl shadow-sm"
            dir={dir}
          />
        )
      ) : (
        <div className={`p-3 bg-white/60 rounded-xl border border-white/50 ${!value ? 'text-blue-500' : 'text-blue-900'} break-words shadow-sm`} dir={dir}>
          {value || "לא צוין"}
        </div>
      )}
    </div>
  );
};

export default ProfileSection;
