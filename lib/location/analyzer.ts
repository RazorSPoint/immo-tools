import {
  TimelineSegment,
  TripResult,
  RelevantLocation,
  LocationWithTime,
  extractAllCoordinates,
  parseCoordinates,
  isCoordinateRelevant,
  calculateTotalDistance,
  filterSignificantMovements
} from './utils';

export interface TimelineData {
  semanticSegments?: TimelineSegment[];
}

export interface AnalysisOptions {
  targetYear: number;
  businessLocations: RelevantLocation[];
  minMovementKm?: number;
}

export class TimelineAnalyzer {
  private options: AnalysisOptions;

  constructor(options: AnalysisOptions) {
    this.options = {
      minMovementKm: 0.1,
      ...options
    };
  }

  /**
   * Analyze timeline data and extract business trips
   */
  analyzeTimeline(timelineData: TimelineData): TripResult[] {
    const segments = timelineData.semanticSegments || [];
    console.log(`Analyzing ${segments.length} segments for year ${this.options.targetYear}`);

    // Step 1: Find relevant days (days with business location visits)
    const relevantDays = new Set<string>();
    const dayReasons = new Map<string, string>();

    for (const segment of segments) {
      const startTime = this.parseStartTime(segment);
      if (!startTime || startTime.getFullYear() !== this.options.targetYear) {
        continue;
      }

      const coords = extractAllCoordinates(segment);
      for (const coordStr of coords) {
        const coord = parseCoordinates(coordStr);
        if (!coord) continue;

        const relevantLocation = isCoordinateRelevant(
          coord.lat,
          coord.lon,
          this.options.businessLocations
        );

        if (relevantLocation) {
          const dateStr = startTime.toISOString().split('T')[0];
          relevantDays.add(dateStr);
          dayReasons.set(dateStr, relevantLocation);
        }
      }
    }

    console.log(`Found ${relevantDays.size} relevant days`);

    // Step 2: Collect all coordinates for relevant days
    const dailyMovements = new Map<string, LocationWithTime[]>();

    for (const segment of segments) {
      const startTime = this.parseStartTime(segment);
      if (!startTime || startTime.getFullYear() !== this.options.targetYear) {
        continue;
      }

      const dateStr = startTime.toISOString().split('T')[0];
      if (!relevantDays.has(dateStr)) {
        continue;
      }

      const coords = extractAllCoordinates(segment);
      const movements = dailyMovements.get(dateStr) || [];

      for (const coordStr of coords) {
        const coord = parseCoordinates(coordStr);
        if (!coord) continue;

        movements.push({
          ...coord,
          timestamp: segment.startTime || startTime.toISOString()
        });
      }

      if (movements.length > 0) {
        dailyMovements.set(dateStr, movements);
      }
    }

    // Step 3: Create trip results
    const tripResults: TripResult[] = [];

    for (const [date, movements] of dailyMovements.entries()) {
      if (movements.length < 2) continue;

      // Sort by timestamp
      movements.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Filter significant movements
      const significantMovements = filterSignificantMovements(
        movements,
        this.options.minMovementKm
      );

      if (significantMovements.length < 2) continue;

      // Calculate total distance
      const coordinates = significantMovements.map(m => ({ lat: m.lat, lon: m.lon }));
      const { totalDistance } = calculateTotalDistance(coordinates);

      // Determine start and end locations
      const startCoord = significantMovements[0];
      const endCoord = significantMovements[significantMovements.length - 1];

      const startLocation = this.getLocationName(startCoord);
      const endLocation = this.getLocationName(endCoord);

      const businessPurpose = dayReasons.get(date) || 'Business Trip';

      tripResults.push({
        date,
        startLocation,
        endLocation,
        totalDistance,
        businessPurpose,
        coordinates: significantMovements
      });
    }

    // Sort by date
    tripResults.sort((a, b) => a.date.localeCompare(b.date));

    return tripResults;
  }

  private parseStartTime(segment: TimelineSegment): Date | null {
    if (!segment.startTime) return null;
    try {
      return new Date(segment.startTime);
    } catch {
      return null;
    }
  }

  private getLocationName(coord: LocationWithTime): string {
    const relevantLocation = isCoordinateRelevant(
      coord.lat,
      coord.lon,
      this.options.businessLocations
    );

    if (relevantLocation) {
      return relevantLocation;
    }

    // Return coordinates as fallback
    return `${coord.lat.toFixed(4)}, ${coord.lon.toFixed(4)}`;
  }
}

/**
 * Export trips to CSV format
 */
export function exportTripsToCSV(trips: TripResult[]): string {
  const headers = ['Date', 'Start Location', 'End Location', 'Distance (km)', 'Business Purpose'];
  const rows = trips.map(trip => [
    trip.date,
    trip.startLocation,
    trip.endLocation,
    trip.totalDistance.toFixed(2),
    trip.businessPurpose
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

/**
 * Create downloadable CSV file
 */
export function downloadCSV(trips: TripResult[], filename: string = 'business-trips.csv'): void {
  const csvContent = exportTripsToCSV(trips);
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
