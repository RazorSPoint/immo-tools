import { BusinessVisit, RelevantLocation, HomeLocation } from '@/lib/location/utils';
import { RouteProfile } from '@/lib/location/routing';
import { SavedTimelineFile } from '@/lib/storage/timeline-storage';

export interface LocationAnalyzerState {
  file: File | null;
  currentSavedFileId?: string;
  targetYear: number;
  businessLocations: RelevantLocation[];
  homeLocation: HomeLocation;
  isAnalyzing: boolean;
  results: BusinessVisit[];
  error: string | null;
  selectedVisit: BusinessVisit | null;
  routeProfile: RouteProfile;
}

export interface FilterState {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  businessLocations: string[];
  businessLocationSearch: string;
  distanceRange: {
    min: number;
    max: number;
  };
  showFilters: boolean;
}

export interface SortState {
  field: 'date' | 'businessLocation' | 'distance';
  direction: 'asc' | 'desc';
}

export interface LocationEditState {
  editingHome: boolean;
  addingBusinessLocation: boolean;
  editingBusinessLocationIndex: number | null;
  newBusinessLocation: {
    name: string;
    address: string;
    lat: number;
    lon: number;
    radius_km: number;
  } | null;
}
