
import React from "react";
import { Input } from "@/components/ui/input";
import { GooglePlacesInput } from "@/components/ui/google-places-input";
import { LocationButton } from "@/components/leads/LocationButton";

interface ClientDetailsFormProps {
  clientName: string;
  setClientName: (value: string) => void;
  clientPhone: string;
  setClientPhone: (value: string) => void;
  clientAddress: string;
  setClientAddress: (value: string) => void;
  onAddressSelect?: (place: { address: string; lat?: number; lng?: number }) => void;
  onLocationFound?: (address: string, lat: number, lng: number) => void;
  hasLocationData?: boolean;
  hasErrors?: {
    clientName?: boolean;
    clientPhone?: boolean;
    clientAddress?: boolean;
  };
}

const ClientDetailsForm: React.FC<ClientDetailsFormProps> = ({
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  clientAddress,
  setClientAddress,
  onAddressSelect,
  onLocationFound,
  hasLocationData = false,
  hasErrors = {}
}) => {
  console.log("ClientDetailsForm: Rendering with clientAddress:", clientAddress);
  
  return (
    <div className="border-t pt-4">
      <h3 className="text-lg font-semibold mb-4">פרטי הלקוח</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="clientName" className="block text-sm font-medium mb-1">שם הלקוח *</label>
          <Input
            id="clientName"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="הזן שם הלקוח"
            className={hasErrors.clientName ? 'border-red-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
          />
        </div>
        
        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium mb-1">טלפון הלקוח *</label>
          <Input
            id="clientPhone"
            type="tel"
            inputMode="tel"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            placeholder="הזן מספר טלפון"
            className={hasErrors.clientPhone ? 'border-red-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
          />
          {hasErrors.clientPhone && (
            <p className="mt-1 text-xs text-red-600">מספר טלפון לא תקין</p>
          )}
        </div>
        
        <div>
          <label htmlFor="clientAddress" className="block text-sm font-medium mb-1">כתובת הלקוח *</label>
          <GooglePlacesInput
            id="clientAddress"
            value={clientAddress}
            onChange={setClientAddress}
            onPlaceSelect={onAddressSelect}
            placeholder="הזן כתובת מלאה"
            className={hasErrors.clientAddress ? 'border-red-500' : 'border border-gray-300 focus:border-blue-500 focus:ring-blue-500'}
          />
          {hasErrors.clientAddress && (
            <p className="mt-1 text-xs text-red-600">יש להזין כתובת מלאה</p>
          )}
          
          {onLocationFound && (
            <LocationButton
              onLocationFound={onLocationFound}
              className="mt-2"
            />
          )}
          
          {hasLocationData && (
            <div className="mt-2 text-sm text-green-700 bg-green-50 p-2 rounded">
              ✓ מיקום מדויק נקבע
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsForm;
