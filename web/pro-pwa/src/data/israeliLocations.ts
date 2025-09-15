/**
 * Israeli Cities and Locations with Hebrew Names
 * Comprehensive list of Israeli cities and regions for location-based matching
 */

export interface IsraeliLocation {
  id: string;
  name: string;
  name_he: string;
  region: string;
  region_he: string;
  latitude: number;
  longitude: number;
  population?: number;
  district: string;
  district_he: string;
}

export const ISRAELI_LOCATIONS: IsraeliLocation[] = [
  // Tel Aviv District
  {
    id: "tel_aviv",
    name: "Tel Aviv",
    name_he: "תל אביב",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0853,
    longitude: 34.7818,
    population: 460000,
    district: "Tel Aviv",
    district_he: "תל אביב"
  },
  {
    id: "ramat_gan",
    name: "Ramat Gan",
    name_he: "רמת גן",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0679,
    longitude: 34.8246,
    population: 163000,
    district: "Tel Aviv",
    district_he: "תל אביב"
  },
  {
    id: "petah_tikva",
    name: "Petah Tikva",
    name_he: "פתח תקווה",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0878,
    longitude: 34.8878,
    population: 247000,
    district: "Central",
    district_he: "מרכז"
  },
  {
    id: "holon",
    name: "Holon",
    name_he: "חולון",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0153,
    longitude: 34.7694,
    population: 196000,
    district: "Tel Aviv",
    district_he: "תל אביב"
  },
  {
    id: "bnei_brak",
    name: "Bnei Brak",
    name_he: "בני ברק",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0969,
    longitude: 34.8338,
    population: 218000,
    district: "Tel Aviv",
    district_he: "תל אביב"
  },
  {
    id: "bat_yam",
    name: "Bat Yam",
    name_he: "בת ים",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 32.0167,
    longitude: 34.7500,
    population: 130000,
    district: "Tel Aviv",
    district_he: "תל אביב"
  },

  // Jerusalem District
  {
    id: "jerusalem",
    name: "Jerusalem",
    name_he: "ירושלים",
    region: "Jerusalem",
    region_he: "ירושלים",
    latitude: 31.7683,
    longitude: 35.2137,
    population: 936000,
    district: "Jerusalem",
    district_he: "ירושלים"
  },

  // Haifa District
  {
    id: "haifa",
    name: "Haifa",
    name_he: "חיפה",
    region: "Haifa Bay",
    region_he: "מפרץ חיפה",
    latitude: 32.7940,
    longitude: 34.9896,
    population: 285000,
    district: "Haifa",
    district_he: "חיפה"
  },
  {
    id: "netanya",
    name: "Netanya",
    name_he: "נתניה",
    region: "Sharon",
    region_he: "השרון",
    latitude: 32.3215,
    longitude: 34.8532,
    population: 221000,
    district: "Central",
    district_he: "מרכז"
  },

  // Central District
  {
    id: "rishon_lezion",
    name: "Rishon LeZion",
    name_he: "ראשון לציון",
    region: "Gush Dan",
    region_he: "גוש דן",
    latitude: 31.9730,
    longitude: 34.7925,
    population: 254000,
    district: "Central",
    district_he: "מרכז"
  },
  {
    id: "ashdod",
    name: "Ashdod",
    name_he: "אשדוד",
    region: "South Coast",
    region_he: "חוף דרום",
    latitude: 31.8044,
    longitude: 34.6553,
    population: 225000,
    district: "Southern",
    district_he: "דרום"
  },
  {
    id: "rehovot",
    name: "Rehovot",
    name_he: "רחובות",
    region: "Central",
    region_he: "מרכז",
    latitude: 31.8969,
    longitude: 34.8186,
    population: 145000,
    district: "Central",
    district_he: "מרכז"
  },

  // Northern District
  {
    id: "nazareth",
    name: "Nazareth",
    name_he: "נצרת",
    region: "Lower Galilee",
    region_he: "גליל תחתון",
    latitude: 32.7019,
    longitude: 35.2972,
    population: 77000,
    district: "Northern",
    district_he: "צפון"
  },
  {
    id: "acre",
    name: "Acre",
    name_he: "עכו",
    region: "Western Galilee",
    region_he: "גליל מערבי",
    latitude: 32.9253,
    longitude: 35.0818,
    population: 49000,
    district: "Northern",
    district_he: "צפון"
  },

  // Southern District
  {
    id: "beersheba",
    name: "Beersheba",
    name_he: "באר שבע",
    region: "Negev",
    region_he: "נגב",
    latitude: 31.2518,
    longitude: 34.7915,
    population: 209000,
    district: "Southern",
    district_he: "דרום"
  },
  {
    id: "ashkelon",
    name: "Ashkelon",
    name_he: "אשקלון",
    region: "South Coast",
    region_he: "חוף דרום",
    latitude: 31.6688,
    longitude: 34.5742,
    population: 144000,
    district: "Southern",
    district_he: "דרום"
  },
  {
    id: "eilat",
    name: "Eilat",
    name_he: "אילת",
    region: "Negev",
    region_he: "נגב",
    latitude: 29.5581,
    longitude: 34.9482,
    population: 53000,
    district: "Southern",
    district_he: "דרום"
  }
];

export const ISRAELI_DISTRICTS = [
  { id: "jerusalem", name: "Jerusalem District", name_he: "מחוז ירושלים" },
  { id: "northern", name: "Northern District", name_he: "מחוז הצפון" },
  { id: "haifa", name: "Haifa District", name_he: "מחוז חיפה" },
  { id: "central", name: "Central District", name_he: "מחוז המרכז" },
  { id: "tel_aviv", name: "Tel Aviv District", name_he: "מחוז תל אביב" },
  { id: "southern", name: "Southern District", name_he: "מחוז הדרום" },
  { id: "judea_samaria", name: "Judea and Samaria", name_he: "יהודה ושומרון" }
];

export const getLocationById = (id: string): IsraeliLocation | undefined => {
  return ISRAELI_LOCATIONS.find(location => location.id === id);
};

export const getLocationNameInHebrew = (id: string): string => {
  const location = getLocationById(id);
  return location?.name_he || location?.name || id;
};

export const searchLocations = (query: string): IsraeliLocation[] => {
  const normalizedQuery = query.toLowerCase();

  return ISRAELI_LOCATIONS.filter(location =>
    location.name.toLowerCase().includes(normalizedQuery) ||
    location.name_he.includes(query) ||
    location.region.toLowerCase().includes(normalizedQuery) ||
    location.region_he.includes(query)
  );
};

export const getLocationsByDistrict = (district: string): IsraeliLocation[] => {
  return ISRAELI_LOCATIONS.filter(location =>
    location.district.toLowerCase() === district.toLowerCase() ||
    location.district_he === district
  );
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

export const findNearbyLocations = (
  targetLocationId: string,
  radiusKm: number = 50
): IsraeliLocation[] => {
  const targetLocation = getLocationById(targetLocationId);
  if (!targetLocation) return [];

  return ISRAELI_LOCATIONS.filter(location => {
    if (location.id === targetLocationId) return false;

    const distance = calculateDistance(
      targetLocation.latitude,
      targetLocation.longitude,
      location.latitude,
      location.longitude
    );

    return distance <= radiusKm;
  }).sort((a, b) => {
    const distanceA = calculateDistance(
      targetLocation.latitude,
      targetLocation.longitude,
      a.latitude,
      a.longitude
    );
    const distanceB = calculateDistance(
      targetLocation.latitude,
      targetLocation.longitude,
      b.latitude,
      b.longitude
    );
    return distanceA - distanceB;
  });
};