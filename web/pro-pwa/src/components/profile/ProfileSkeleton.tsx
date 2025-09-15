
import React from "react";

const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-80">
      <div className="text-center">
        <div className="inline-block animate-spin h-8 w-8 border-4 border-t-ofair-blue border-r-transparent border-b-transparent border-l-transparent rounded-full mb-4"></div>
        <p className="text-gray-500">טוען פרופיל...</p>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
