
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';

interface NotificationArea {
  id: string;
  professional_id: string;
  area_name: string;
  radius_km: number;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AreasListProps {
  areas: NotificationArea[];
  onToggleActive: (areaId: string, isActive: boolean) => Promise<boolean>;
  onDelete: (areaId: string) => Promise<boolean>;
}

const AreasList = ({ areas, onToggleActive, onDelete }: AreasListProps) => {
  return (
    <div className="space-y-2">
      {areas.map((area) => (
        <div key={area.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="font-medium">{area.area_name}</h4>
              <p className="text-sm text-gray-600">
                רדיוס: {area.radius_km} ק"מ
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={area.is_active}
                onCheckedChange={(checked) => onToggleActive(area.id, checked)}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(area.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AreasList;
