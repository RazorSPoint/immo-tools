/**
 * Location analysis utilities - Simplified for business location visits
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface RelevantLocation {
  name: string;
  lat: number;
  lon: number;
  radius_km: number;
  address: string;
  travelReason?: string; // Reason for business travel (for tax reporting)
}

export interface HomeLocation extends Coordinates {
  name: string;
  address: string;
}

export interface BusinessVisit {
  date: string;
  businessLocation: RelevantLocation;
  homeLocation: HomeLocation;
  distanceKm: number;
  routeDistanceKm?: number; // Actual route distance (if calculated)
  routeDurationMinutes?: number; // Route duration in minutes
  routeProfile?: string; // Route type used for calculation
  travelReason?: string; // Reason for this business travel
  taxDeductibleCosts?: number; // Calculated tax deductible costs in EUR
}

export interface TimelineSegment {
  startTime?: string;
  endTime?: string;
  visit?: {
    topCandidate?: {
      placeLocation?: {
        latLng?: string;
      };
    };
  };
  activity?: {
    start?: {
      latLng?: string;
    };
    end?: {
      latLng?: string;
    };
  };
  timelinePath?: Array<{
    point?: string;
  }>;
}

/**
 * Calculate distance between two points using Haversine formula
 */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km

  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(dphi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parse coordinate string from Google Timeline
 * Supports both formats:
 * - E7 format: "latE7:520008000,lngE7:134049540"
 * - Decimal format: "47.6169706°, 18.3407624°"
 */
export function parseCoordinateString(coordStr: string): { lat: number; lon: number } | null {
  try {
    // Handle E7 format (latE7:520008000,lngE7:134049540)
    const latE7Match = coordStr.match(/latE7:(-?\d+)/);
    const lngE7Match = coordStr.match(/lngE7:(-?\d+)/);

    if (latE7Match && lngE7Match) {
      const lat = parseInt(latE7Match[1]) / 1e7;
      const lon = parseInt(lngE7Match[1]) / 1e7;
      return { lat, lon };
    }

    // Handle decimal degree format (47.6169706°, 18.3407624°)
    const decimalMatch = coordStr.match(/(-?\d+\.?\d*)°,\s*(-?\d+\.?\d*)°/);
    if (decimalMatch) {
      const lat = parseFloat(decimalMatch[1]);
      const lon = parseFloat(decimalMatch[2]);

      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }

    console.warn('Unable to parse coordinate string:', coordStr);
    return null;
  } catch (error) {
    console.error('Failed to parse coordinate string:', coordStr, error);
    return null;
  }
}

/**
 * Check if a coordinate is within radius of a business location
 */
export function isWithinBusinessLocation(
  coord: { lat: number; lon: number },
  businessLocation: RelevantLocation
): boolean {
  const distance = haversine(coord.lat, coord.lon, businessLocation.lat, businessLocation.lon);
  return distance <= businessLocation.radius_km;
}

/**
 * Check if coordinate is within any business location
 */
export function findMatchingBusinessLocation(
  lat: number,
  lon: number,
  locations: RelevantLocation[]
): RelevantLocation | null {
  for (const location of locations) {
    const dist = haversine(location.lat, location.lon, lat, lon);

    // Add debug logging for Leipzig specifically
    if (location.name === 'Leipzig') {
      console.log(`🔍 Checking Leipzig: distance ${dist.toFixed(2)}km vs radius ${location.radius_km}km for coords ${lat}, ${lon}`);
    }

    if (dist <= location.radius_km) {
      console.log(`✅ Match found: ${location.name} (${dist.toFixed(2)}km <= ${location.radius_km}km)`);
      return location;
    }
  }
  return null;
}

/**
 * Default business locations
 * Note: These are set to match the sample timeline data for testing
 * In production, update these to your actual business locations
 */
export const DEFAULT_BUSINESS_LOCATIONS: RelevantLocation[] = [
  {
    name: 'Blankenfelde-Mahlow',
    lat: 52.3660644,
    lon: 13.4110777,
    radius_km: 2.0,
    address: 'Kirschenhof 2, 15831 Blankenfelde-Mahlow'
  },
  {
    name: 'Leipzig Geschäftsbereich',
    lat: 51.36010668944128,
    lon: 12.368906495788186,
    radius_km: 20.0,
    address: 'Leipzig (Geschäftsbereich)'
  }
];

/**
 * Default home location
 * Note: Set to match the sample timeline data for testing
 */
export const DEFAULT_HOME_LOCATION: HomeLocation = {
  name: 'Home',
  lat: 52.5168352, // Example: Cologne area
  lon: 13.4264708,
  address: 'Berlin, Germany'
};
