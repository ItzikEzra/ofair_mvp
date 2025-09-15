
import React from 'react';
import { MapPin } from 'lucide-react';

const EmptyAreasState = () => {
  return (
    <div className="text-center py-8 text-gray-500">
      <MapPin size={48} className="mx-auto mb-2 opacity-30" />
      <p>עדיין לא הוספת אזורי התראות</p>
      <p className="text-sm">הוסף אזורים כדי לקבל התראות על לידים חדשים</p>
    </div>
  );
};

export default EmptyAreasState;
