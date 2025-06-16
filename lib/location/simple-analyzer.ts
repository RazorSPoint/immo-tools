/**
 * Simplified Location Analyzer - Only detects business location visits
 */

import {
  BusinessVisit,
  TimelineSegment,
  RelevantLocation,
  HomeLocation,
  parseCoordinateString,
  findMatchingBusinessLocation,
  haversine
} from './utils';
import { calculateRoute, RouteProfile } from './routing';

export interface TimelineData {
  // New Google Timeline format
  semanticSegments?: Array<{
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
  }>;

  // Legacy format (keeping for compatibility)
  timelineObjects?: Array<{
    timelineSegments?: TimelineSegment[];
  }>;
}

export interface BusinessAnalyzerConfig {
  targetYear: number;
  businessLocations: RelevantLocation[];
  homeLocation: HomeLocation;
  routeProfile?: RouteProfile; // Optional route profile for distance calculation
}

export class BusinessLocationAnalyzer {
  private config: BusinessAnalyzerConfig;
  private distanceCache: Map<string, number> = new Map(); // Cache distances by business location name
  private distancesCalculated: Promise<void>; // Promise that resolves when distances are calculated

  constructor(config: BusinessAnalyzerConfig) {
    this.config = config;
    this.distancesCalculated = this.preCalculateDistances();
  }

  /**
   * Pre-calculate distances from home to all business locations using routing API
   */
  private async preCalculateDistances(): Promise<void> {
    console.log('📏 Pre-calculating routing distances from home to business locations...');

    const routeProfile = this.config.routeProfile || 'driving-car';

    for (const businessLocation of this.config.businessLocations) {
      try {
        // Use routing API for real route distance
        const routeResult = await calculateRoute(
          { lat: this.config.homeLocation.lat, lon: this.config.homeLocation.lon },
          { lat: businessLocation.lat, lon: businessLocation.lon },
          routeProfile
        );

        let distance: number;

        if ('message' in routeResult) {
          // Fallback to haversine if routing fails
          console.warn(`⚠️ Routing failed for ${businessLocation.name}, using straight-line distance: ${routeResult.message}`);
          distance = haversine(
            this.config.homeLocation.lat,
            this.config.homeLocation.lon,
            businessLocation.lat,
            businessLocation.lon
          );
        } else {
          // Convert meters to kilometers
          distance = routeResult.distance / 1000;
        }

        this.distanceCache.set(businessLocation.name, distance);
        console.log(`📏 ${businessLocation.name}: ${distance.toFixed(2)} km from home (${routeProfile})`);

        // Add small delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error calculating distance for ${businessLocation.name}:`, error);
        // Fallback to haversine distance
        const fallbackDistance = haversine(
          this.config.homeLocation.lat,
          this.config.homeLocation.lon,
          businessLocation.lat,
          businessLocation.lon
        );
        this.distanceCache.set(businessLocation.name, fallbackDistance);
        console.log(`📏 ${businessLocation.name}: ${fallbackDistance.toFixed(2)} km from home (fallback)`);
      }
    }

    console.log('✅ Distance pre-calculation completed');
  }

  /**
   * Get cached distance for a business location
   */
  private getCachedDistance(businessLocationName: string): number {
    return this.distanceCache.get(businessLocationName) || 0;
  }

  /**
   * Analyze timeline data and find business location visits
   */
  async analyzeTimeline(timelineData: TimelineData): Promise<BusinessVisit[]> {
    // Wait for distances to be calculated
    await this.distancesCalculated;

    const visits: BusinessVisit[] = [];
    const visitedDates = new Set<string>();

    console.log('📍 Starting business location analysis...');

    let segments: any[] = [];

    // Handle new Google Timeline format (semanticSegments)
    if (timelineData.semanticSegments && timelineData.semanticSegments.length > 0) {
      console.log(`📊 Using semanticSegments format: ${timelineData.semanticSegments.length} segments`);
      segments = timelineData.semanticSegments;
    }
    // Handle legacy format (timelineObjects)
    else if (timelineData.timelineObjects && timelineData.timelineObjects.length > 0) {
      console.log(`📊 Using legacy timelineObjects format`);
      for (const timelineObject of timelineData.timelineObjects) {
        if (timelineObject.timelineSegments) {
          segments.push(...timelineObject.timelineSegments);
        }
      }
    }
    else {
      console.warn('❌ No timeline data found in supported formats');
      return visits;
    }

    console.log(`🔍 Processing ${segments.length} total segments`);

    for (const segment of segments) {
      const coordinates = this.extractCoordinatesFromSegment(segment);

      if (coordinates.length === 0) continue;

      // Check if any coordinate is within a business location
      for (const coord of coordinates) {
        const matchingLocation = findMatchingBusinessLocation(
          coord.lat,
          coord.lon,
          this.config.businessLocations
        );

        if (matchingLocation) {
          const date = this.extractDateFromSegment(segment);

          if (date && this.isTargetYear(date) && !visitedDates.has(date)) {
            // Use cached distance instead of calculating each time
            const distanceFromHome = this.getCachedDistance(matchingLocation.name);

            visits.push({
              date,
              businessLocation: matchingLocation,
              homeLocation: this.config.homeLocation,
              distanceKm: distanceFromHome
            });

            visitedDates.add(date);
            console.log(`✅ Found business visit: ${date} - ${matchingLocation.name} (${distanceFromHome.toFixed(2)} km)`);
          }
          break; // Stop checking other coordinates for this segment
        }
      }
    }

    console.log(`📊 Analysis complete: ${visits.length} business visits found`);
    return visits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Extract coordinates from a timeline segment
   */
  private extractCoordinatesFromSegment(segment: any): Array<{lat: number, lon: number}> {
    const coords: Array<{lat: number, lon: number}> = [];

    // Check visit location (visit.topCandidate.placeLocation.latLng)
    if (segment.visit?.topCandidate?.placeLocation?.latLng) {
      const parsed = parseCoordinateString(segment.visit.topCandidate.placeLocation.latLng);
      if (parsed) {
        coords.push(parsed);
        console.log(`📍 Found visit coordinate: ${segment.visit.topCandidate.placeLocation.latLng}`);
      }
    }

    // Check activity start/end (activity.start.latLng, activity.end.latLng)
    if (segment.activity?.start?.latLng) {
      const parsed = parseCoordinateString(segment.activity.start.latLng);
      if (parsed) {
        coords.push(parsed);
        console.log(`🚀 Found activity start: ${segment.activity.start.latLng}`);
      }
    }

    if (segment.activity?.end?.latLng) {
      const parsed = parseCoordinateString(segment.activity.end.latLng);
      if (parsed) {
        coords.push(parsed);
        console.log(`🏁 Found activity end: ${segment.activity.end.latLng}`);
      }
    }

    // Check timeline path points (timelinePath[].point)
    if (segment.timelinePath && Array.isArray(segment.timelinePath)) {
      for (const pathPoint of segment.timelinePath) {
        if (pathPoint.point) {
          const parsed = parseCoordinateString(pathPoint.point);
          if (parsed) {
            coords.push(parsed);
          }
        }
      }
      if (segment.timelinePath.length > 0) {
        console.log(`🛤️ Found ${segment.timelinePath.length} timeline path points`);
      }
    }

    return coords;
  }

  /**
   * Extract date from segment timestamp
   */
  private extractDateFromSegment(segment: TimelineSegment): string | null {
    const timestamp = segment.startTime || segment.endTime;
    if (!timestamp) return null;

    try {
      const date = new Date(timestamp);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return null;
    }
  }

  /**
   * Check if date is in target year
   */
  private isTargetYear(dateStr: string): boolean {
    const year = new Date(dateStr).getFullYear();
    return year === this.config.targetYear;
  }
}

/**
 * Export business visits to CSV format
 */
export function downloadCSV(visits: BusinessVisit[], filename: string): void {
  const headers = ['Date', 'Business Location', 'Business Address', 'Distance from Home (km)'];

  const csvContent = [
    headers.join(','),
    ...visits.map(visit => [
      visit.date,
      `"${visit.businessLocation.name}"`,
      `"${visit.businessLocation.address}"`,
      visit.distanceKm.toFixed(2)
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
