/**
 * Coordinate validation utilities for the Israeli region
 */

// Israeli coordinate bounds (approximate)
const ISRAEL_BOUNDS = {
  north: 33.4,
  south: 29.5,
  east: 35.9,
  west: 34.2
};

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CoordinateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if coordinates are within valid ranges
 */
export const validateCoordinates = (
  latitude: number | null | undefined,
  longitude: number | null | undefined
): CoordinateValidationResult => {
  if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
    return { isValid: false, error: "Missing coordinates" };
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return { isValid: false, error: "Coordinates must be numbers" };
  }

  if (isNaN(latitude) || isNaN(longitude)) {
    return { isValid: false, error: "Invalid coordinate values" };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, error: "Latitude must be between -90 and 90" };
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, error: "Longitude must be between -180 and 180" };
  }

  return { isValid: true };
};

/**
 * Validates if coordinates are within Israeli bounds
 */
export const validateIsraeliCoordinates = (
  latitude: number,
  longitude: number
): CoordinateValidationResult => {
  const basicValidation = validateCoordinates(latitude, longitude);
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  if (
    latitude < ISRAEL_BOUNDS.south ||
    latitude > ISRAEL_BOUNDS.north ||
    longitude < ISRAEL_BOUNDS.west ||
    longitude > ISRAEL_BOUNDS.east
  ) {
    return { 
      isValid: false, 
      error: "Coordinates are outside Israeli region" 
    };
  }

  return { isValid: true };
};

/**
 * Enhanced Haversine distance calculation with higher precision
 */
export const calculatePreciseDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371.0088; // Earth's radius in km (more precise value)
  
  const toRad = (degrees: number) => degrees * (Math.PI / 180);
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Format distance with appropriate units and precision
 */
export const formatDistance = (
  distanceKm: number,
  unit: 'km' | 'm' = 'km',
  precision: number = 2
): string => {
  if (unit === 'm') {
    const distanceM = distanceKm * 1000;
    if (distanceM < 1000) {
      return `${Math.round(distanceM)} מטר`;
    }
    return `${(distanceKm).toFixed(precision)} ק״מ`;
  }
  
  if (distanceKm < 0.1) {
    return `${Math.round(distanceKm * 1000)} מטר`;
  }
  
  return `${distanceKm.toFixed(precision)} ק״מ`;
};