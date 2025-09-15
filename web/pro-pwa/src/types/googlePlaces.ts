
export interface PlaceResult {
  address: string;
  placeId: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeData?: any;
  city?: string;
}

export interface CityExtractionRule {
  types: string[];
  priority: number;
  label: string;
}

declare global {
  interface Window {
    google: any;
    initGooglePlaces: () => void;
  }
}
