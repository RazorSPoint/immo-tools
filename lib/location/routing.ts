/**
 * Routing service for calculating routes between locations
 * Uses OpenRouteService API (free tier with 2000 requests/day)
 */

import axios from 'axios';
import { Coordinates } from './utils';

export type RouteProfile = 'driving-car' | 'public-transport' | 'foot-walking';

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
}

export interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  geometry: [number, number][]; // array of [lon, lat] coordinates
  steps?: RouteStep[];
  profile: RouteProfile;
}

export interface RoutingError {
  message: string;
  code?: string;
}

// OpenRouteService API configuration
const ORS_API_BASE = 'https://api.openrouteservice.org/v2';

// For demonstration, using a demo API key. In production, get your own from openrouteservice.org
const ORS_API_KEY = '5b3ce3597851110001cf624806c1ad68fb3e4c9ab19eeaac152b4831';

/**
 * Calculate route between two points using OpenRouteService
 */
export async function calculateRoute(
  start: Coordinates,
  end: Coordinates,
  profile: RouteProfile = 'driving-car'
): Promise<RouteResult | RoutingError> {
  try {
    // Handle public transport differently as ORS has limited support
    if (profile === 'public-transport') {
      // Fallback to driving route for now, or use a different service
      console.warn('Public transport routing not fully supported, falling back to driving');
      profile = 'driving-car';
    }

    const coordinates = [
      [start.lon, start.lat],
      [end.lon, end.lat]
    ];

    const response = await axios.post(
      `${ORS_API_BASE}/directions/${profile}/geojson`,
      {
        coordinates,
        instructions: true,
        geometry: true
      },
      {
        headers: {
          'Authorization': ORS_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    const feature = response.data.features[0];
    if (!feature) {
      return { message: 'No route found' };
    }

    const properties = feature.properties;
    const geometry = feature.geometry.coordinates;

    const steps: RouteStep[] = properties.segments?.[0]?.steps?.map((step: any) => ({
      instruction: step.instruction,
      distance: step.distance,
      duration: step.duration
    })) || [];

    return {
      distance: properties.summary.distance,
      duration: properties.summary.duration,
      geometry: geometry,
      steps,
      profile
    };

  } catch (error: any) {
    console.error('Routing error:', error);

    // Handle specific API errors
    if (error.response?.status === 403) {
      return { message: 'API key invalid or quota exceeded', code: 'API_ERROR' };
    } else if (error.response?.status === 404) {
      return { message: 'No route found between these locations', code: 'NO_ROUTE' };
    } else if (error.code === 'ECONNABORTED') {
      return { message: 'Request timeout - please try again', code: 'TIMEOUT' };
    } else {
      return { message: 'Failed to calculate route', code: 'UNKNOWN_ERROR' };
    }
  }
}

/**
 * Fallback route calculation using straight line (as backup)
 */
export function calculateStraightLineRoute(
  start: Coordinates,
  end: Coordinates
): RouteResult {
  // Calculate straight-line distance using Haversine formula
  const R = 6371000; // Earth radius in meters
  const phi1 = (start.lat * Math.PI) / 180;
  const phi2 = (end.lat * Math.PI) / 180;
  const dphi = ((end.lat - start.lat) * Math.PI) / 180;
  const dlambda = ((end.lon - start.lon) * Math.PI) / 180;

  const a = Math.sin(dphi / 2) ** 2 +
            Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    distance,
    duration: distance / 50 * 3.6, // Rough estimate: 50 km/h average speed
    geometry: [[start.lon, start.lat], [end.lon, end.lat]],
    steps: [{
      instruction: 'Direct route (straight line)',
      distance,
      duration: distance / 50 * 3.6
    }],
    profile: 'driving-car'
  };
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  } else {
    return `${(meters / 1000).toFixed(1)} km`;
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Get route profile display name
 */
export function getProfileDisplayName(profile: RouteProfile): string {
  switch (profile) {
    case 'driving-car':
      return '🚗 Car';
    case 'public-transport':
      return '🚊 Public Transport';
    case 'foot-walking':
      return '🚶 Walking';
    default:
      return profile;
  }
}
