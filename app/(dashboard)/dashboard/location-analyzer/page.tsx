'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, MapPin, Calendar, FileText, Settings, Home, Navigation, Filter, ChevronDown, ChevronUp, ArrowUpDown, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { BusinessVisit, RelevantLocation, DEFAULT_BUSINESS_LOCATIONS, DEFAULT_HOME_LOCATION, HomeLocation } from '@/lib/location/utils';
import { BusinessLocationAnalyzer, downloadCSV, TimelineData } from '@/lib/location/simple-analyzer';
import { RouteMapModal } from '@/components/location/RouteMapModal';
import { AddressSearch } from '@/components/location/AddressSearch';
import { GeocodeResult, RouteProfile } from '@/lib/location/routing';
import { LocationAnalyzerState, FilterState, SortState, LocationEditState } from './types/analyzer';
import { ResultsTable } from './components/ResultsTable';

export default function LocationAnalyzerPage() {
  const [state, setState] = useState<LocationAnalyzerState>({
    file: null,
    targetYear: new Date().getFullYear(),
    businessLocations: DEFAULT_BUSINESS_LOCATIONS,
    homeLocation: DEFAULT_HOME_LOCATION,
    isAnalyzing: false,
    results: [],
    error: null,
    selectedVisit: null,
    routeProfile: 'driving-car'
  });

  const [filters, setFilters] = useState<FilterState>({
    dateRange: {
      startDate: '',
      endDate: ''
    },
    businessLocations: [],
    businessLocationSearch: '',
    distanceRange: {
      min: 0,
      max: 1000
    },
    showFilters: false
  });

  const [sort, setSort] = useState<SortState>({
    field: 'date',
    direction: 'desc'
  });

  const [locationEdit, setLocationEdit] = useState<LocationEditState>({
    editingHome: false,
    addingBusinessLocation: false,
    editingBusinessLocationIndex: null,
    newBusinessLocation: null
  });

  // Log when component mounts to help debug session issues
  useEffect(() => {
    console.log('📍 Location Analyzer page loaded successfully');
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setState(prev => ({ ...prev, file, error: null }));
    } else {
      setState(prev => ({ ...prev, error: 'Please select a valid JSON file' }));
    }
  };

  const handleAnalyze = async () => {
    console.log('🔍 Analyze button clicked');

    if (!state.file) {
      console.log('❌ No file selected');
      setState(prev => ({ ...prev, error: 'Please upload a timeline file first' }));
      return;
    }

    console.log('📁 File selected:', state.file.name);
    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Read and parse the JSON file
      console.log('📖 Reading file content...');
      const fileContent = await state.file.text();
      console.log('📄 File content length:', fileContent.length);

      const timelineData: TimelineData = JSON.parse(fileContent);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Timeline data keys:', Object.keys(timelineData));
      console.log('📊 Timeline objects found:', timelineData.timelineObjects?.length || 0);

      // Debug: Let's see what the actual structure looks like
      if (timelineData.timelineObjects?.length === 0) {
        console.log('🔍 Checking for alternative structures...');
        console.log('📋 All top-level keys:', Object.keys(timelineData));

        // Check for common alternative formats
        const altKeys = ['semanticSegments', 'timelineSegments', 'activities', 'visits', 'locations'];
        for (const key of altKeys) {
          if ((timelineData as any)[key]) {
            console.log(`🎯 Found alternative key: ${key} with ${(timelineData as any)[key].length} items`);
          }
        }
      }

      // Create analyzer instance
      const analyzer = new BusinessLocationAnalyzer({
        targetYear: state.targetYear,
        businessLocations: state.businessLocations,
        homeLocation: state.homeLocation,
        routeProfile: state.routeProfile
      });
      console.log('🧠 Analyzer created');

      // Analyze the timeline data
      console.log('🔬 Starting analysis...');
      const results = await analyzer.analyzeTimeline(timelineData);
      console.log('✅ Analysis completed, results:', results.length);

      setState(prev => ({
        ...prev,
        results,
        isAnalyzing: false
      }));
    } catch (error) {
      console.error('💥 Analysis error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to analyze timeline data. Please check the file format.',
        isAnalyzing: false
      }));
    }
  };

  const handleExportCSV = () => {
    if (filteredAndSortedResults.length === 0) return;

    const filename = `business-visits-${state.targetYear}${filteredAndSortedResults.length !== state.results.length ? '-filtered' : ''}.csv`;
    downloadCSV(filteredAndSortedResults, filename);
  };

  const selectVisit = (visit: BusinessVisit) => {
    setState(prev => ({ ...prev, selectedVisit: visit }));
  };

  // Update distance range when results change
  useEffect(() => {
    if (state.results.length > 0) {
      const distances = state.results.map(visit => visit.distanceKm);
      const minDistance = Math.floor(Math.min(...distances));
      const maxDistance = Math.ceil(Math.max(...distances));

      setFilters(prev => ({
        ...prev,
        distanceRange: {
          min: prev.distanceRange.min === 0 ? minDistance : prev.distanceRange.min,
          max: prev.distanceRange.max === 1000 ? maxDistance : prev.distanceRange.max
        }
      }));
    }
  }, [state.results]);

  // Get unique business locations for filter dropdown
  const uniqueBusinessLocations = React.useMemo(() => {
    const locations = state.results.map(visit => visit.businessLocation.name);
    return Array.from(new Set(locations)).sort();
  }, [state.results]);

  // Filter and sort results
  const filteredAndSortedResults = React.useMemo(() => {
    let filtered = state.results.filter(visit => {
      // Date range filter
      const visitDate = new Date(visit.date);
      if (filters.dateRange.startDate && visitDate < new Date(filters.dateRange.startDate)) {
        return false;
      }
      if (filters.dateRange.endDate && visitDate > new Date(filters.dateRange.endDate)) {
        return false;
      }

      // Business location filter
      if (filters.businessLocations.length > 0 &&
          !filters.businessLocations.includes(visit.businessLocation.name)) {
        return false;
      }

      // Business location search filter
      if (filters.businessLocationSearch &&
          !visit.businessLocation.name.toLowerCase().includes(filters.businessLocationSearch.toLowerCase()) &&
          !visit.businessLocation.address.toLowerCase().includes(filters.businessLocationSearch.toLowerCase())) {
        return false;
      }

      // Distance range filter
      if (visit.distanceKm < filters.distanceRange.min || visit.distanceKm > filters.distanceRange.max) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'businessLocation':
          comparison = a.businessLocation.name.localeCompare(b.businessLocation.name);
          break;
        case 'distance':
          comparison = a.distanceKm - b.distanceKm;
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [state.results, filters, sort]);

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.businessLocations.length > 0) count++;
    if (filters.businessLocationSearch) count++;
    if (filters.distanceRange.min > 0 || filters.distanceRange.max < 1000) count++;
    return count;
  };

  // Get filter summary text
  const getFilterSummary = () => {
    const activeFilters = [];
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const start = filters.dateRange.startDate ? new Date(filters.dateRange.startDate).toLocaleDateString() : 'Start';
      const end = filters.dateRange.endDate ? new Date(filters.dateRange.endDate).toLocaleDateString() : 'End';
      activeFilters.push(`Date: ${start} - ${end}`);
    }
    if (filters.businessLocations.length > 0) {
      activeFilters.push(`Locations: ${filters.businessLocations.length} selected`);
    }
    if (filters.businessLocationSearch) {
      activeFilters.push(`Search: "${filters.businessLocationSearch}"`);
    }
    if (filters.distanceRange.min > 0 || filters.distanceRange.max < 1000) {
      activeFilters.push(`Distance: ${filters.distanceRange.min}-${filters.distanceRange.max} km`);
    }
    return activeFilters.join(' • ');
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      dateRange: { startDate: '', endDate: '' },
      businessLocations: [],
      businessLocationSearch: '',
      distanceRange: {
        min: state.results.length > 0 ? Math.floor(Math.min(...state.results.map(v => v.distanceKm))) : 0,
        max: state.results.length > 0 ? Math.ceil(Math.max(...state.results.map(v => v.distanceKm))) : 1000
      },
      showFilters: filters.showFilters
    });
  };

  // Handle sorting
  const handleSort = (field: SortState['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Toggle business location filter
  const toggleBusinessLocationFilter = (locationName: string) => {
    setFilters(prev => ({
      ...prev,
      businessLocations: prev.businessLocations.includes(locationName)
        ? prev.businessLocations.filter(name => name !== locationName)
        : [...prev.businessLocations, locationName]
    }));
  };

  // Location management functions
  const handleHomeLocationSelect = (result: GeocodeResult) => {
    setState(prev => ({
      ...prev,
      homeLocation: {
        name: `Home (${result.city || 'Custom'})`,
        lat: result.lat,
        lon: result.lon,
        address: result.address
      }
    }));
    setLocationEdit(prev => ({ ...prev, editingHome: false }));
  };

  const handleBusinessLocationSelect = (result: GeocodeResult) => {
    const newLocation: RelevantLocation = {
      name: result.city || result.address.split(',')[0] || 'Business Location',
      lat: result.lat,
      lon: result.lon,
      radius_km: 5.0, // Default 5km radius
      address: result.address
    };

    if (locationEdit.editingBusinessLocationIndex !== null) {
      // Edit existing location
      setState(prev => ({
        ...prev,
        businessLocations: prev.businessLocations.map((loc, index) =>
          index === locationEdit.editingBusinessLocationIndex ? newLocation : loc
        )
      }));
    } else {
      // Add new location
      setState(prev => ({
        ...prev,
        businessLocations: [...prev.businessLocations, newLocation]
      }));
    }

    setLocationEdit(prev => ({
      ...prev,
      addingBusinessLocation: false,
      editingBusinessLocationIndex: null,
      newBusinessLocation: null
    }));
  };

  const removeBusinessLocation = (index: number) => {
    setState(prev => ({
      ...prev,
      businessLocations: prev.businessLocations.filter((_, i) => i !== index)
    }));
  };

  const updateBusinessLocationRadius = (index: number, radius: number) => {
    setState(prev => ({
      ...prev,
      businessLocations: prev.businessLocations.map((loc, i) =>
        i === index ? { ...loc, radius_km: radius } : loc
      )
    }));
  };

  const resetToDefaults = () => {
    setState(prev => ({
      ...prev,
      homeLocation: DEFAULT_HOME_LOCATION,
      businessLocations: DEFAULT_BUSINESS_LOCATIONS
    }));
    setLocationEdit({
      editingHome: false,
      addingBusinessLocation: false,
      editingBusinessLocationIndex: null,
      newBusinessLocation: null
    });
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Location Analyzer</h1>
            <p className="text-gray-600">
              Track visits to your business locations for travel documentation
            </p>
          </div>
          <MapPin className="h-8 w-8 text-orange-500" />
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Timeline Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timeline-file">Google Timeline JSON File</Label>
                <Input
                  id="timeline-file"
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
                {state.file && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ {state.file.name} uploaded
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="target-year">Analysis Year</Label>
                <Input
                  id="target-year"
                  type="number"
                  value={state.targetYear}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    targetYear: parseInt(e.target.value) || new Date().getFullYear()
                  }))}
                  className="mt-1"
                  min="2010"
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div>
                <Label htmlFor="route-profile">Distance Calculation Mode</Label>
                <select
                  id="route-profile"
                  value={state.routeProfile}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    routeProfile: e.target.value as RouteProfile
                  }))}
                  className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  title="Select distance calculation mode"
                  aria-label="Distance calculation mode"
                >
                  <option value="driving-car">🚗 Driving (Car)</option>
                  <option value="foot-walking">🚶 Walking</option>
                  <option value="public-transport">🚌 Public Transport</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose how distances are calculated using real routing data
                </p>
              </div>

              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
            </CardContent>
          </Card>

          {/* Home Location */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Home Location
                </span>
                {!locationEdit.editingHome && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocationEdit(prev => ({ ...prev, editingHome: true }))}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {locationEdit.editingHome ? (
                <div className="space-y-3">
                  <AddressSearch
                    placeholder="Search for your home address..."
                    onSelect={handleHomeLocationSelect}
                    onClose={() => setLocationEdit(prev => ({ ...prev, editingHome: false }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocationEdit(prev => ({ ...prev, editingHome: false }))}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">{state.homeLocation.name}</h4>
                    <p className="text-sm text-green-600">{state.homeLocation.address}</p>
                    <p className="text-xs text-green-500 mt-1">
                      📍 {state.homeLocation.lat.toFixed(4)}°, {state.homeLocation.lon.toFixed(4)}°
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => setLocationEdit(prev => ({ ...prev, editingHome: true }))}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Change Home Location
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Business Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Business Locations ({state.businessLocations.length})
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: true }))}
                    disabled={locationEdit.addingBusinessLocation}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetToDefaults}
                    title="Reset to defaults"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Location Interface */}
              {locationEdit.addingBusinessLocation && (
                <div className="mb-4 p-3 border rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-2">Add Business Location</h4>
                  <div className="space-y-3">
                    <AddressSearch
                      placeholder="Search for business address..."
                      onSelect={handleBusinessLocationSelect}
                      onClose={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: false }))}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: false }))}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Locations List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {state.businessLocations.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No business locations added yet.
                    <br />
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: true }))}
                      className="p-0 h-auto"
                    >
                      Add your first location
                    </Button>
                  </div>
                ) : (
                  state.businessLocations.map((location, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-800">{location.name}</h4>
                          <p className="text-sm text-blue-600">{location.address}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-blue-500">Radius:</span>
                            <Input
                              type="number"
                              value={location.radius_km}
                              onChange={(e) => updateBusinessLocationRadius(index, Number(e.target.value) || 1)}
                              className="w-20 h-6 text-xs"
                              min="0.1"
                              step="0.1"
                            />
                            <span className="text-xs text-blue-500">km</span>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBusinessLocation(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title="Remove location"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Add Button */}
              {!locationEdit.addingBusinessLocation && state.businessLocations.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: true }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Business Location
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Analysis Button */}
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Button
              onClick={handleAnalyze}
              disabled={!state.file || state.isAnalyzing}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
              size="lg"
            >
              {state.isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Analyze Business Visits
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <ResultsTable
          results={state.results}
          filteredAndSortedResults={filteredAndSortedResults}
          filters={filters}
          setFilters={setFilters}
          sort={sort}
          onSort={handleSort}
          onExportCSV={handleExportCSV}
          onSelectVisit={selectVisit}
          onResetFilters={resetFilters}
          onToggleBusinessLocationFilter={toggleBusinessLocationFilter}
          uniqueBusinessLocations={uniqueBusinessLocations}
          getActiveFilterCount={getActiveFilterCount}
          getFilterSummary={getFilterSummary}
        />

        {/* Route Map Modal */}
        {state.selectedVisit && (
          <RouteMapModal
            isOpen={true}
            visit={state.selectedVisit}
            onClose={() => setState(prev => ({ ...prev, selectedVisit: null }))}
          />
        )}
      </div>
    </section>
  );
}
