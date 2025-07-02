/**
 * Location Storage Management
 * Handles saving and loading home and business locations in localStorage
 */

import { HomeLocation, RelevantLocation, DEFAULT_HOME_LOCATION } from '@/lib/location/utils';

const HOME_LOCATION_KEY = 'immo_home_location';
const BUSINESS_LOCATIONS_KEY = 'immo_business_locations';
const TAX_SETTINGS_KEY = 'immo_tax_settings';

export interface TaxSettings {
  costPerKm: number; // EUR per kilometer for tax deduction
}

// Default German tax deduction rate (common rate is 0.30 EUR per km)
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  costPerKm: 0.30
};

/**
 * Save home location to localStorage
 */
export function saveHomeLocation(location: HomeLocation): void {
  try {
    localStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(location));
    console.log('✅ Home location saved to localStorage');
  } catch (error) {
    console.error('Error saving home location:', error);
  }
}

/**
 * Load home location from localStorage
 */
export function loadHomeLocation(): HomeLocation {
  try {
    const stored = localStorage.getItem(HOME_LOCATION_KEY);
    if (stored) {
      const location = JSON.parse(stored) as HomeLocation;
      console.log('✅ Home location loaded from localStorage');
      return location;
    }
  } catch (error) {
    console.error('Error loading home location:', error);
  }

  // Return default if no stored location or error
  console.log('📍 Using default home location');
  return DEFAULT_HOME_LOCATION;
}

/**
 * Save business locations to localStorage
 */
export function saveBusinessLocations(locations: RelevantLocation[]): void {
  try {
    localStorage.setItem(BUSINESS_LOCATIONS_KEY, JSON.stringify(locations));
    console.log('✅ Business locations saved to localStorage');
  } catch (error) {
    console.error('Error saving business locations:', error);
  }
}

/**
 * Load business locations from localStorage
 */
export function loadBusinessLocations(): RelevantLocation[] {
  try {
    const stored = localStorage.getItem(BUSINESS_LOCATIONS_KEY);
    if (stored) {
      const locations = JSON.parse(stored) as RelevantLocation[];
      console.log('✅ Business locations loaded from localStorage');
      return locations;
    }
  } catch (error) {
    console.error('Error loading business locations:', error);
  }

  // Return empty array if no stored locations or error (no default business locations)
  console.log('📍 No saved business locations, starting with empty list');
  return [];
}

/**
 * Save tax settings to localStorage
 */
export function saveTaxSettings(settings: TaxSettings): void {
  try {
    localStorage.setItem(TAX_SETTINGS_KEY, JSON.stringify(settings));
    console.log('✅ Tax settings saved to localStorage');
  } catch (error) {
    console.error('Error saving tax settings:', error);
  }
}

/**
 * Load tax settings from localStorage
 */
export function loadTaxSettings(): TaxSettings {
  try {
    const stored = localStorage.getItem(TAX_SETTINGS_KEY);
    if (stored) {
      const settings = JSON.parse(stored) as TaxSettings;
      console.log('✅ Tax settings loaded from localStorage');
      return settings;
    }
  } catch (error) {
    console.error('Error loading tax settings:', error);
  }

  // Return default if no stored settings or error
  console.log('📊 Using default tax settings');
  return DEFAULT_TAX_SETTINGS;
}

/**
 * Clear all location data from localStorage
 */
export function clearLocationData(): void {
  try {
    localStorage.removeItem(HOME_LOCATION_KEY);
    localStorage.removeItem(BUSINESS_LOCATIONS_KEY);
    localStorage.removeItem(TAX_SETTINGS_KEY);
    console.log('🧹 All location and tax data cleared from localStorage');
  } catch (error) {
    console.error('Error clearing location data:', error);
  }
}
