/**
 * Location analysis utilities - TypeScript port of Python location analyzer
 */

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationWithTime extends Coordinates {
  timestamp: string;
  address?: string;
}

export interface RelevantLocation {
  name: string;
  lat: number;
  lon: number;
  radius_km: number;
  address: string;
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

export interface TripResult {
  date: string;
  startLocation: string;
  endLocation: string;
  totalDistance: number;
  businessPurpose: string;
  coordinates: LocationWithTime[];
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
 * Extract coordinates from timeline segment
 */
export function extractAllCoordinates(segment: TimelineSegment): string[] {
  const coords: string[] = [];

  // 1. visit.topCandidate.placeLocation.latLng
  const visit = segment.visit;
  if (visit?.topCandidate?.placeLocation?.latLng) {
    coords.push(visit.topCandidate.placeLocation.latLng);
  }

  // 2. activity.start.latLng and activity.end.latLng
  const activity = segment.activity;
  if (activity) {
    if (activity.start?.latLng) {
      coords.push(activity.start.latLng);
    }
    if (activity.end?.latLng) {
      coords.push(activity.end.latLng);
    }
  }

  // 3. timelinePath[].point
  const timelinePath = segment.timelinePath;
  if (timelinePath && Array.isArray(timelinePath)) {
    for (const pathPoint of timelinePath) {
      if (pathPoint.point) {
        coords.push(pathPoint.point);
      }
    }
  }

  return coords;
}

/**
 * Parse coordinate string "lat°, lon°" to numbers
 */
export function parseCoordinates(coordStr: string): Coordinates | null {
  try {
    // Remove degree symbols and split
    const cleanStr = coordStr.replace(/°/g, '').trim();
    const parts = cleanStr.split(',').map(s => s.trim());

    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lon = parseFloat(parts[1]);

    if (isNaN(lat) || isNaN(lon)) return null;

    return { lat, lon };
  } catch {
    return null;
  }
}

/**
 * Check if coordinate is within relevant business location
 */
export function isCoordinateRelevant(
  lat: number,
  lon: number,
  locations: RelevantLocation[]
): string | null {
  for (const location of locations) {
    const dist = haversine(location.lat, location.lon, lat, lon);
    if (dist <= location.radius_km) {
      return location.name;
    }
  }
  return null;
}

/**
 * Calculate total distance for a route
 */
export function calculateTotalDistance(coords: Coordinates[]): {
  sectionDistances: number[];
  totalDistance: number;
} {
  if (!coords || coords.length < 2) {
    return { sectionDistances: [], totalDistance: 0 };
  }

  const sectionDistances: number[] = [];
  let totalDistance = 0;

  for (let i = 1; i < coords.length; i++) {
    const distance = haversine(
      coords[i - 1].lat,
      coords[i - 1].lon,
      coords[i].lat,
      coords[i].lon
    );
    sectionDistances.push(distance);
    totalDistance += distance;
  }

  return { sectionDistances, totalDistance };
}

/**
 * Filter significant movements (above minimum distance threshold)
 */
export function filterSignificantMovements(
  coordsWithTime: LocationWithTime[],
  minMovementKm: number = 0.1
): LocationWithTime[] {
  if (coordsWithTime.length <= 2) {
    return coordsWithTime;
  }

  const filtered = [coordsWithTime[0]]; // Always keep start point

  for (let i = 1; i < coordsWithTime.length; i++) {
    const current = coordsWithTime[i];
    const lastKept = filtered[filtered.length - 1];

    const dist = haversine(lastKept.lat, lastKept.lon, current.lat, current.lon);

    if (dist >= minMovementKm) {
      filtered.push(current);
    }
  }

  // Always keep end point (if not already included)
  const lastCoord = coordsWithTime[coordsWithTime.length - 1];
  if (filtered[filtered.length - 1] !== lastCoord) {
    filtered.push(lastCoord);
  }

  return filtered;
}

/**
 * Default business locations (can be customized by user)
 */
export const DEFAULT_BUSINESS_LOCATIONS: RelevantLocation[] = [
  {
    name: "Blankenfelde-Mahlow",
    lat: 52.3660644,
    lon: 13.4110777,
    radius_km: 2.0,
    address: "Kirschenhof 2, 15831 Blankenfelde-Mahlow"
  },
  {
    name: "Leipzig Business Area",
    lat: 51.36010668944128,
    lon: 12.368906495788186,
    radius_km: 20.0,
    address: "Leipzig (Business Area)"
  }
];
