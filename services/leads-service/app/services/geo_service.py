"""Geographic service for location-based matching and calculations."""

import logging
import re
from typing import Optional, List, Tuple, Dict, Any
from dataclasses import dataclass
from geopy.geocoders import Nominatim
from geopy.distance import geodesic
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import redis.asyncio as redis

logger = logging.getLogger(__name__)


@dataclass
class LocationInfo:
    """Geographic location information."""
    latitude: float
    longitude: float
    address: str
    city: Optional[str] = None
    region: Optional[str] = None
    country: str = "Israel"


@dataclass
class DistanceInfo:
    """Distance calculation result."""
    distance_km: float
    is_within_radius: bool
    source_location: LocationInfo
    target_location: LocationInfo


class IsraeliGeoService:
    """Geographic service specialized for Israeli locations."""
    
    # Major Israeli cities with their coordinates
    MAJOR_CITIES = {
        "תל אביב": (32.0853, 34.7818),
        "תל אביב יפו": (32.0853, 34.7818),
        "tel aviv": (32.0853, 34.7818),
        "ירושלים": (31.7683, 35.2137),
        "jerusalem": (31.7683, 35.2137),
        "חיפה": (32.7940, 34.9896),
        "haifa": (32.7940, 34.9896),
        "ראשון לציון": (31.9730, 34.8092),
        "rishon lezion": (31.9730, 34.8092),
        "אשדוד": (31.8044, 34.6553),
        "ashdod": (31.8044, 34.6553),
        "נתניה": (32.3215, 34.8532),
        "netanya": (32.3215, 34.8532),
        "באר שבע": (31.2518, 34.7915),
        "beer sheva": (31.2518, 34.7915),
        "בני ברק": (32.0809, 34.8338),
        "bnei brak": (32.0809, 34.8338),
        "הרצליה": (32.1624, 34.8443),
        "herzliya": (32.1624, 34.8443),
        "כפר סבא": (32.1742, 34.9068),
        "kfar saba": (32.1742, 34.9068),
        "רעננה": (32.1847, 34.8715),
        "raanana": (32.1847, 34.8715),
        "רחובות": (31.8963, 34.8105),
        "rehovot": (31.8963, 34.8105),
        "פתח תקווה": (32.0871, 34.8879),
        "petah tikva": (32.0871, 34.8879),
        "רמת גן": (32.0678, 34.8245),
        "ramat gan": (32.0678, 34.8245)
    }
    
    # Regional centers
    REGIONS = {
        "צפון": ["חיפה", "נצרת", "עכו", "קריית שמונה", "צפת"],
        "מרכז": ["תל אביב", "רמת גן", "גבעתיים", "הרצליה", "רעננה", "כפר סבא", "פתח תקווה", "ראשון לציון", "רחובות"],
        "ירושלים": ["ירושלים", "בית שמש", "מעלה אדומים"],
        "דרום": ["באר שבע", "אשדוד", "אשקלון", "קריית גת", "אילת"],
        "שרון": ["נתניה", "הרצליה", "רעננה", "כפר סבא", "הוד השרון"],
        "השפלה": ["ראשון לציון", "רחובות", "נס ציונה", "יבנה", "גדרה"]
    }
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        """Initialize geo service."""
        self.geolocator = Nominatim(
            user_agent="ofair_leads_service",
            timeout=10,
            country_bias="IL"
        )
        self.redis_client = redis_client
        
    async def geocode_location(self, address: str, use_cache: bool = True) -> Optional[LocationInfo]:
        """
        Geocode an Israeli address to coordinates.
        
        Args:
            address: Address string in Hebrew or English
            use_cache: Whether to use Redis cache
            
        Returns:
            LocationInfo object or None if geocoding fails
        """
        try:
            # Normalize address for cache key
            cache_key = f"geocode:{address.lower().strip()}"
            
            # Try cache first
            if use_cache and self.redis_client:
                cached = await self.redis_client.get(cache_key)
                if cached:
                    data = eval(cached)  # In production, use proper JSON
                    return LocationInfo(**data)
            
            # Check if it's a known major city
            location_info = self._get_known_city_location(address)
            if location_info:
                if use_cache and self.redis_client:
                    await self._cache_location(cache_key, location_info)
                return location_info
            
            # Try geocoding with Nominatim
            # Add "Israel" to improve results
            search_address = f"{address}, Israel"
            
            location = self.geolocator.geocode(
                search_address,
                country_codes="IL",
                language="he"
            )
            
            if location:
                location_info = LocationInfo(
                    latitude=location.latitude,
                    longitude=location.longitude,
                    address=address,
                    city=self._extract_city_from_display_name(location.address),
                    region=self._get_region_for_city(address)
                )
                
                if use_cache and self.redis_client:
                    await self._cache_location(cache_key, location_info)
                
                return location_info
                
        except (GeocoderTimedOut, GeocoderServiceError) as e:
            logger.warning(f"Geocoding failed for '{address}': {e}")
        except Exception as e:
            logger.error(f"Unexpected error in geocoding '{address}': {e}")
            
        return None
        
    def _get_known_city_location(self, address: str) -> Optional[LocationInfo]:
        """Get location for known major cities."""
        address_lower = address.lower().strip()
        
        for city, (lat, lon) in self.MAJOR_CITIES.items():
            if city.lower() in address_lower or address_lower in city.lower():
                return LocationInfo(
                    latitude=lat,
                    longitude=lon,
                    address=address,
                    city=city,
                    region=self._get_region_for_city(city)
                )
        
        return None
        
    def _extract_city_from_display_name(self, display_name: str) -> Optional[str]:
        """Extract city name from geocoder display name."""
        try:
            # Nominatim format: "Street, City, District, Israel"
            parts = [part.strip() for part in display_name.split(',')]
            if len(parts) >= 2:
                return parts[1]  # Usually the city
        except:
            pass
        return None
        
    def _get_region_for_city(self, city: str) -> Optional[str]:
        """Get region for a city."""
        city_lower = city.lower().strip()
        
        for region, cities in self.REGIONS.items():
            for region_city in cities:
                if region_city.lower() in city_lower or city_lower in region_city.lower():
                    return region
        return None
        
    async def _cache_location(self, cache_key: str, location_info: LocationInfo) -> None:
        """Cache geocoded location."""
        try:
            if self.redis_client:
                data = {
                    'latitude': location_info.latitude,
                    'longitude': location_info.longitude,
                    'address': location_info.address,
                    'city': location_info.city,
                    'region': location_info.region,
                    'country': location_info.country
                }
                # Cache for 7 days
                await self.redis_client.setex(cache_key, 604800, str(data))
        except Exception as e:
            logger.error(f"Failed to cache location: {e}")
            
    async def calculate_distance(
        self,
        location1: LocationInfo,
        location2: LocationInfo,
        max_radius_km: Optional[int] = None
    ) -> DistanceInfo:
        """
        Calculate distance between two locations.
        
        Args:
            location1: First location
            location2: Second location  
            max_radius_km: Maximum radius to consider as "within range"
            
        Returns:
            DistanceInfo with distance and range information
        """
        try:
            point1 = (location1.latitude, location1.longitude)
            point2 = (location2.latitude, location2.longitude)
            
            distance = geodesic(point1, point2).kilometers
            
            is_within_radius = True
            if max_radius_km is not None:
                is_within_radius = distance <= max_radius_km
            
            return DistanceInfo(
                distance_km=round(distance, 2),
                is_within_radius=is_within_radius,
                source_location=location1,
                target_location=location2
            )
            
        except Exception as e:
            logger.error(f"Distance calculation failed: {e}")
            # Return a default high distance
            return DistanceInfo(
                distance_km=999.0,
                is_within_radius=False,
                source_location=location1,
                target_location=location2
            )
            
    async def find_leads_in_radius(
        self,
        center_location: LocationInfo,
        radius_km: int,
        lead_locations: List[Tuple[str, LocationInfo]]  # (lead_id, location)
    ) -> List[Tuple[str, DistanceInfo]]:
        """
        Find leads within specified radius from center location.
        
        Args:
            center_location: Center point for search
            radius_km: Search radius in kilometers
            lead_locations: List of (lead_id, location) tuples
            
        Returns:
            List of (lead_id, distance_info) for leads within radius
        """
        results = []
        
        for lead_id, lead_location in lead_locations:
            try:
                distance_info = await self.calculate_distance(
                    center_location,
                    lead_location,
                    radius_km
                )
                
                if distance_info.is_within_radius:
                    results.append((lead_id, distance_info))
                    
            except Exception as e:
                logger.error(f"Failed to calculate distance for lead {lead_id}: {e}")
                continue
        
        # Sort by distance
        results.sort(key=lambda x: x[1].distance_km)
        
        return results
        
    def is_same_region(self, location1: LocationInfo, location2: LocationInfo) -> bool:
        """Check if two locations are in the same region."""
        if not location1.region or not location2.region:
            return False
        return location1.region == location2.region
        
    def is_same_city(self, location1: LocationInfo, location2: LocationInfo) -> bool:
        """Check if two locations are in the same city."""
        if not location1.city or not location2.city:
            return False
        
        city1 = location1.city.lower().strip()
        city2 = location2.city.lower().strip()
        
        # Check exact match or partial match for compound city names
        return city1 == city2 or city1 in city2 or city2 in city1
        
    async def get_location_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        Get location suggestions based on partial query.
        
        Args:
            query: Partial location query
            limit: Maximum number of suggestions
            
        Returns:
            List of location suggestions
        """
        query_lower = query.lower().strip()
        suggestions = []
        
        # Search in major cities
        for city in self.MAJOR_CITIES.keys():
            if query_lower in city.lower() or city.lower().startswith(query_lower):
                suggestions.append(city)
                
        # Remove duplicates and sort
        suggestions = list(set(suggestions))
        suggestions.sort(key=len)  # Prefer shorter matches
        
        return suggestions[:limit]
        
    def validate_israeli_location(self, location: str) -> bool:
        """
        Validate if location string appears to be Israeli.
        
        Args:
            location: Location string to validate
            
        Returns:
            True if location appears valid for Israel
        """
        if not location or len(location.strip()) < 2:
            return False
            
        location_lower = location.lower().strip()
        
        # Check if it matches known cities
        if any(city.lower() in location_lower for city in self.MAJOR_CITIES.keys()):
            return True
            
        # Check if contains Hebrew characters
        if re.search(r'[\u0590-\u05FF]', location):
            return True
            
        # Check common Israeli location patterns
        israeli_patterns = [
            r'\b(street|st|road|rd|avenue|ave)\b',  # English street indicators
            r'\b(רחוב|רח\'|שדרות|שד\'|כיכר|מתחם)\b',  # Hebrew street indicators
            r'\b(כפר|קיבוץ|מושב|עיר|יישוב)\b',  # Settlement types
            r'\b(צפון|דרום|מרכז|מזרח|מערב)\b',  # Directional Hebrew
        ]
        
        for pattern in israeli_patterns:
            if re.search(pattern, location, re.IGNORECASE):
                return True
                
        return False
        
    def normalize_location_for_matching(self, location: str) -> str:
        """
        Normalize location string for better matching.
        
        Args:
            location: Original location string
            
        Returns:
            Normalized location string
        """
        # Remove extra whitespace
        normalized = ' '.join(location.split())
        
        # Common abbreviations and normalizations
        normalizations = {
            "ת\"א": "תל אביב",
            "ת.א": "תל אביב",
            "תל-אביב": "תל אביב",
            "י-ם": "ירושלים",
            "ירושלים": "ירושלים",
            "חיפה": "חיפה",
            "ב\"ש": "באר שבע",
            "ב.ש": "באר שבע",
            "באר-שבע": "באר שבע",
            "רלצ": "ראשון לציון",
            "ר\"ל": "ראשון לציון",
            "פ\"ת": "פתח תקווה",
            "פתח-תקווה": "פתח תקווה",
        }
        
        for abbrev, full_name in normalizations.items():
            if abbrev in normalized:
                normalized = normalized.replace(abbrev, full_name)
                
        return normalized.strip()
        
    async def batch_geocode(
        self,
        addresses: List[str],
        use_cache: bool = True
    ) -> Dict[str, Optional[LocationInfo]]:
        """
        Geocode multiple addresses efficiently.
        
        Args:
            addresses: List of address strings
            use_cache: Whether to use caching
            
        Returns:
            Dictionary mapping address to LocationInfo (or None if failed)
        """
        results = {}
        
        for address in addresses:
            try:
                location_info = await self.geocode_location(address, use_cache)
                results[address] = location_info
            except Exception as e:
                logger.error(f"Batch geocoding failed for '{address}': {e}")
                results[address] = None
                
        return results
        
    def get_distance_score(self, distance_km: float, max_distance: float = 50.0) -> float:
        """
        Calculate a score (0-100) based on distance.
        
        Args:
            distance_km: Distance in kilometers
            max_distance: Maximum distance for scoring
            
        Returns:
            Score from 0-100 (100 = same location, 0 = max distance)
        """
        if distance_km <= 0:
            return 100.0
        
        if distance_km >= max_distance:
            return 0.0
            
        # Linear decrease from 100 to 0
        score = 100.0 * (1.0 - (distance_km / max_distance))
        return max(0.0, min(100.0, score))
        
    async def get_professional_service_radius(
        self,
        professional_location: LocationInfo,
        default_radius_km: int = 25
    ) -> int:
        """
        Get recommended service radius for a professional based on their location.
        
        Args:
            professional_location: Professional's location
            default_radius_km: Default radius if no specific recommendation
            
        Returns:
            Recommended service radius in kilometers
        """
        if not professional_location.city:
            return default_radius_km
            
        city_lower = professional_location.city.lower()
        
        # Different service radii for different city types
        if any(major_city.lower() in city_lower for major_city in ["תל אביב", "tel aviv", "ירושלים", "jerusalem", "חיפה", "haifa"]):
            return 15  # Smaller radius for major cities
        elif professional_location.region in ["מרכז", "שרון"]:
            return 20  # Medium radius for central regions
        else:
            return 35  # Larger radius for peripheral areas