
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useNotificationAreas } from '@/hooks/useNotificationAreas';
import { useProfessionalId } from '@/hooks/useProfessionalId';
import AddAreaForm from './notification-areas/AddAreaForm';
import AreasList from './notification-areas/AreasList';
import EmptyAreasState from './notification-areas/EmptyAreasState';

const NotificationAreasSection = () => {
  const { professionalId } = useProfessionalId();
  const { areas, isLoading, addArea, updateArea, deleteArea } = useNotificationAreas(professionalId);

  const handleToggleActive = async (areaId: string, isActive: boolean): Promise<boolean> => {
    return await updateArea(areaId, { is_active: isActive });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={20} />
            אזורי התראות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">טוען...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin size={20} />
          אזורי התראות
        </CardTitle>
        <p className="text-sm text-gray-600">
          הגדר אזורים שבהם תרצה לקבל התראות על לידים חדשים
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddAreaForm onAdd={addArea} professionalId={professionalId} />
        
        {areas.length > 0 ? (
          <AreasList
            areas={areas}
            onToggleActive={handleToggleActive}
            onDelete={deleteArea}
          />
        ) : (
          <EmptyAreasState />
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationAreasSection;
