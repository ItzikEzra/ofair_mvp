
import React from 'react';

interface AnnouncementCardHeaderProps {
  isOwner: boolean;
  announcementType: 'lead' | 'request';
}

const AnnouncementCardHeader: React.FC<AnnouncementCardHeaderProps> = ({ 
  isOwner, 
  announcementType 
}) => {
  const getTypeColor = (type: string) => {
    return type === 'lead' ? 'bg-white/20 text-white border-white/30' : 'bg-white/20 text-white border-white/30';
  };

  const getTypeName = (type: string) => {
    return type === 'lead' ? 'ליד' : 'בקשה';
  };

  return (
    <>
      {/* Ownership Banner */}
      {isOwner && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium border border-white/30">
            שלי
          </div>
        </div>
      )}

      {/* Enhanced Type Badge */}
      <div className="absolute top-3 left-3 z-10">
        <div className={`${getTypeColor(announcementType)} backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium border shadow-sm`}>
          {getTypeName(announcementType)}
        </div>
      </div>
    </>
  );
};

export default AnnouncementCardHeader;
