import React from "react";
interface OwnershipBannerProps {
  isOwner: boolean;
  type?: 'lead' | 'request'; // Optional type to differentiate between lead and announcement
}
const OwnershipBanner: React.FC<OwnershipBannerProps> = ({
  isOwner,
  type = 'lead'
}) => {
  if (!isOwner) return null;
  // מעודכן: פחות גובה, טיפוגרפיה קטנה יותר ו-padding מותאם
  return <div className="bg-ofair-blue text-white text-sm text-center rounded-t-lg mb-1 -mt-3 -mx-3 font-semibold shadow-sm tracking-normal select-none py-[18px]">
      {type === 'lead' ? "ליד שלי" : "מודעה שלי"}
    </div>;
};
export default OwnershipBanner;