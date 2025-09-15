
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GooglePlacesInput } from '@/components/ui/google-places-input';

interface AddAreaFormProps {
  onAdd: (areaData: {
    area_name: string;
    radius_km: number;
    latitude: number | null;
    longitude: number | null;
    is_active: boolean;
    professional_id: string;
  }) => Promise<boolean>;
  professionalId: string | null;
}

const AddAreaForm = ({ onAdd, professionalId }: AddAreaFormProps) => {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newArea, setNewArea] = useState({
    area_name: '',
    address: '',
    radius_km: 10,
    latitude: null as number | null,
    longitude: null as number | null,
    is_active: true
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "שגיאה",
        description: "הדפדפן שלך לא תומך במיקום גיאוגרפי",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewArea(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: "המיקום הנוכחי"
        }));
        toast({
          title: "הצלחה",
          description: "המיקום הנוכחי נקבע בהצלחה"
        });
      },
      (error) => {
        console.error('Error getting location:', error);
        toast({
          title: "שגיאה",
          description: "לא ניתן לקבל את המיקום הנוכחי",
          variant: "destructive"
        });
      }
    );
  };

  const handleAddressSelect = (place: { address: string; lat?: number; lng?: number; city?: string }) => {
    console.log("Address selected in AddAreaForm:", place);
    setNewArea(prev => ({
      ...prev,
      address: place.address,
      latitude: place.lat || null,
      longitude: place.lng || null,
      area_name: prev.area_name || place.city || place.address.split(',')[0] || ''
    }));
  };

  const handleAddArea = async () => {
    if (!newArea.area_name.trim()) {
      toast({
        title: "שגיאה",
        description: "נא להזין שם לאזור",
        variant: "destructive"
      });
      return;
    }

    if (!newArea.latitude || !newArea.longitude) {
      toast({
        title: "שגיאה",
        description: "נא לקבוע מיקום לאזור",
        variant: "destructive"
      });
      return;
    }

    if (!professionalId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מזהה מקצועי",
        variant: "destructive"
      });
      return;
    }

    const areaWithProfessionalId = {
      area_name: newArea.area_name,
      radius_km: newArea.radius_km,
      latitude: newArea.latitude,
      longitude: newArea.longitude,
      is_active: newArea.is_active,
      professional_id: professionalId
    };

    const success = await onAdd(areaWithProfessionalId);
    if (success) {
      setNewArea({
        area_name: '',
        address: '',
        radius_km: 10,
        latitude: null,
        longitude: null,
        is_active: true
      });
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setNewArea({
      area_name: '',
      address: '',
      radius_km: 10,
      latitude: null,
      longitude: null,
      is_active: true
    });
  };

  if (!isAdding) {
    return (
      <Button
        onClick={() => setIsAdding(true)}
        variant="outline"
        className="w-full"
      >
        <Plus size={16} className="ml-2" />
        הוסף אזור התראה
      </Button>
    );
  }

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div>
        <Label htmlFor="area-name">שם האזור</Label>
        <Input
          id="area-name"
          value={newArea.area_name}
          onChange={(e) => setNewArea(prev => ({ ...prev, area_name: e.target.value }))}
          placeholder="למשל: תל אביב מרכז"
        />
      </div>

      <div>
        <Label htmlFor="area-address">כתובת או אזור</Label>
        <GooglePlacesInput
          id="area-address"
          value={newArea.address}
          onChange={(value) => setNewArea(prev => ({ ...prev, address: value }))}
          onPlaceSelect={handleAddressSelect}
          placeholder="חפש כתובת או אזור..."
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-1">
          או השתמש במיקום הנוכחי למטה
        </p>
      </div>
      
      <div>
        <Label htmlFor="radius">רדיוס (ק"מ)</Label>
        <Input
          id="radius"
          type="number"
          value={newArea.radius_km}
          onChange={(e) => setNewArea(prev => ({ ...prev, radius_km: parseInt(e.target.value) || 10 }))}
          min="1"
          max="50"
        />
      </div>

      <div>
        <Label>מיקום</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGetCurrentLocation}
            className="flex-1 gap-2"
          >
            <MapPin size={16} />
            השתמש במיקום הנוכחי
          </Button>
          {newArea.latitude && newArea.longitude && (
            <div className="text-sm text-green-600 flex items-center">
              ✓ מיקום נקבע
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleAddArea} className="flex-1">
          הוסף אזור
        </Button>
        <Button variant="outline" onClick={resetForm}>
          ביטול
        </Button>
      </div>
    </div>
  );
};

export default AddAreaForm;
