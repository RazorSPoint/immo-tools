'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, MapPin, Calendar, FileText, Settings, Home, Navigation, Filter, ChevronDown, ChevronUp, ArrowUpDown, X, Plus, Edit2, Trash2 } from 'lucide-react';
import { BusinessVisit, RelevantLocation, DEFAULT_HOME_LOCATION, HomeLocation } from '@/lib/location/utils';
import { BusinessLocationAnalyzer, downloadCSV, downloadExcel, TimelineData } from '@/lib/location/simple-analyzer';
import { RouteMapModal } from '@/components/location/RouteMapModal';
import { AddressSearch } from '@/components/location/AddressSearch';
import { GeocodeResult, RouteProfile } from '@/lib/location/routing';
import { LocationAnalyzerState, FilterState, SortState, LocationEditState } from './types/analyzer';
import { ResultsTable } from './components/ResultsTable';
import { HomeLocationCard } from './components/HomeLocationCard';
import { BusinessLocationsCard } from './components/BusinessLocationsCard';
import { AnalyzerSettings } from './components/AnalyzerSettings';
import { SavedTimelinesCard } from './components/SavedTimelinesCard';
import { saveTimelineFile, updateFileAnalysisCount, SavedTimelineFile, loadTimelineData } from '@/lib/storage/timeline-storage';
import { saveHomeLocation, loadHomeLocation, saveBusinessLocations, loadBusinessLocations, saveTaxSettings, loadTaxSettings } from '@/lib/storage/location-storage';

export default function LocationAnalyzerPage() {
  const [state, setState] = useState<LocationAnalyzerState>({
    file: null,
    currentSavedFileId: undefined,
    targetYear: new Date().getFullYear(),
    businessLocations: [], // Will be loaded from localStorage in useEffect
    homeLocation: DEFAULT_HOME_LOCATION, // Will be loaded from localStorage in useEffect
    isAnalyzing: false,
    results: [],
    error: null,
    selectedVisit: null,
    routeProfile: 'driving-car',
    costPerKm: 0.30 // Will be loaded from localStorage in useEffect
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
  });  // Log when component mounts to help debug session issues
  useEffect(() => {
    console.log('📍 Geschäftsreisen-Steuertool geladen');

    // Load saved locations and tax settings from localStorage
    const savedHomeLocation = loadHomeLocation();
    const savedBusinessLocations = loadBusinessLocations();
    const savedTaxSettings = loadTaxSettings();

    setState(prev => ({
      ...prev,
      homeLocation: savedHomeLocation,
      businessLocations: savedBusinessLocations,
      costPerKm: savedTaxSettings.costPerKm
    }));
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      try {
        // Parse and validate the JSON file
        const fileContent = await file.text();
        const timelineData: TimelineData = JSON.parse(fileContent);

        // Save to storage (now async with IndexedDB)
        const savedFile = await saveTimelineFile(file, timelineData);

        setState(prev => ({
          ...prev,
          file,
          currentSavedFileId: savedFile.id,
          error: null
        }));

        console.log('✅ File uploaded and saved to storage:', file.name);
      } catch (error: any) {
        console.error('Error processing file:', error);

        let errorMessage = 'Failed to process file. Please try again.';

        if (error.message) {
          if (error.message.includes('quota') || error.message.includes('storage')) {
            errorMessage = error.message;
          } else if (error.message.includes('JSON')) {
            errorMessage = 'Invalid JSON file format. Please check your file and try again.';
          } else if (error.message.includes('too large')) {
            errorMessage = 'File is too large to store. Please use a smaller JSON file or clear some saved files.';
          } else if (error.message.includes('IndexedDB')) {
            errorMessage = 'Your browser does not support storing large files. You can still analyze files without saving them.';
          }
        }

        setState(prev => ({
          ...prev,
          error: errorMessage
        }));
      }
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
        routeProfile: state.routeProfile,
        costPerKm: state.costPerKm
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

      // Update analysis count for saved file
      if (state.currentSavedFileId) {
        updateFileAnalysisCount(state.currentSavedFileId);
      }
    } catch (error) {
      console.error('💥 Analysis error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to analyze timeline data. Please check the file format.',
        isAnalyzing: false
      }));
    }
  };

  const handleExport = (format: 'csv' | 'excel') => {
    if (filteredAndSortedResults.length === 0) return;

    const baseFilename = `business-visits-${state.targetYear}${filteredAndSortedResults.length !== state.results.length ? '-filtered' : ''}`;

    if (format === 'csv') {
      const filename = `${baseFilename}.csv`;
      downloadCSV(filteredAndSortedResults, filename);
    } else {
      const filename = `${baseFilename}.xlsx`;
      downloadExcel(filteredAndSortedResults, filename);
    }
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
    const newHomeLocation = {
      name: `Home (${result.city || 'Custom'})`,
      lat: result.lat,
      lon: result.lon,
      address: result.address
    };

    setState(prev => ({
      ...prev,
      homeLocation: newHomeLocation
    }));

    // Save to localStorage
    saveHomeLocation(newHomeLocation);

    setLocationEdit(prev => ({ ...prev, editingHome: false }));
  };

  const handleBusinessLocationSelect = (result: GeocodeResult) => {
    const newLocation: RelevantLocation = {
      name: result.city || result.address.split(',')[0] || 'Business Location',
      lat: result.lat,
      lon: result.lon,
      radius_km: 5.0, // Default 5km radius
      address: result.address,
      travelReason: 'Geschäftstermin' // Default travel reason
    };

    let updatedBusinessLocations: RelevantLocation[];

    if (locationEdit.editingBusinessLocationIndex !== null) {
      // Edit existing location
      setState(prev => {
        updatedBusinessLocations = prev.businessLocations.map((loc, index) =>
          index === locationEdit.editingBusinessLocationIndex ? newLocation : loc
        );
        return {
          ...prev,
          businessLocations: updatedBusinessLocations
        };
      });
    } else {
      // Add new location
      setState(prev => {
        updatedBusinessLocations = [...prev.businessLocations, newLocation];
        return {
          ...prev,
          businessLocations: updatedBusinessLocations
        };
      });
    }

    // Save to localStorage
    setTimeout(() => {
      setState(prev => {
        saveBusinessLocations(prev.businessLocations);
        return prev;
      });
    }, 0);

    setLocationEdit(prev => ({
      ...prev,
      addingBusinessLocation: false,
      editingBusinessLocationIndex: null,
      newBusinessLocation: null
    }));
  };

  const removeBusinessLocation = (index: number) => {
    setState(prev => {
      const updatedBusinessLocations = prev.businessLocations.filter((_, i) => i !== index);
      // Save to localStorage
      saveBusinessLocations(updatedBusinessLocations);
      return {
        ...prev,
        businessLocations: updatedBusinessLocations
      };
    });
  };

  const updateBusinessLocationRadius = (index: number, radius: number) => {
    setState(prev => {
      const updatedBusinessLocations = prev.businessLocations.map((loc, i) =>
        i === index ? { ...loc, radius_km: radius } : loc
      );
      // Save to localStorage
      saveBusinessLocations(updatedBusinessLocations);
      return {
        ...prev,
        businessLocations: updatedBusinessLocations
      };
    });
  };

  const updateBusinessLocationTravelReason = (index: number, reason: string) => {
    setState(prev => {
      const updatedBusinessLocations = prev.businessLocations.map((loc, i) =>
        i === index ? { ...loc, travelReason: reason } : loc
      );
      // Save to localStorage
      saveBusinessLocations(updatedBusinessLocations);
      return {
        ...prev,
        businessLocations: updatedBusinessLocations
      };
    });
  };

  const resetToDefaults = () => {
    const defaultHome = DEFAULT_HOME_LOCATION;
    const defaultBusiness: RelevantLocation[] = [];

    setState(prev => ({
      ...prev,
      homeLocation: defaultHome,
      businessLocations: defaultBusiness
    }));

    // Save the reset values to localStorage
    saveHomeLocation(defaultHome);
    saveBusinessLocations(defaultBusiness);

    setLocationEdit({
      editingHome: false,
      addingBusinessLocation: false,
      editingBusinessLocationIndex: null,
      newBusinessLocation: null
    });
  };

  // Handle loading a saved file
  const handleLoadSavedFile = async (savedFile: SavedTimelineFile) => {
    try {
      // Load the timeline data from IndexedDB
      const timelineData = await loadTimelineData(savedFile.id);

      if (!timelineData) {
        throw new Error('Timeline data not found');
      }

      // Create a virtual File object from the saved data
      const virtualFile = new File(
        [JSON.stringify(timelineData)],
        savedFile.filename,
        { type: 'application/json' }
      );

      setState(prev => ({
        ...prev,
        file: virtualFile,
        currentSavedFileId: savedFile.id,
        error: null,
        results: [] // Clear previous results
      }));

      console.log('✅ Loaded saved file:', savedFile.filename);
    } catch (error) {
      console.error('Error loading saved file:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to load saved file. The file data may be corrupted or missing.'
      }));
    }
  };

  // Handle saved files change (for refreshing UI)
  const handleSavedFilesChange = () => {
    // This can be used to trigger any additional updates when files change
    console.log('📁 Saved files changed');
  };

  // Handle cost per km change
  const handleCostPerKmChange = (costPerKm: number) => {
    setState(prev => ({
      ...prev,
      costPerKm
    }));

    // Save to localStorage
    saveTaxSettings({ costPerKm });
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Geschäftsreisen-Steuertool</h1>
            <p className="text-gray-600">
              Erfassen Sie Fahrten zu Geschäftsterminen für die Steuererklärung
            </p>
          </div>
          <MapPin className="h-8 w-8 text-orange-500" />
        </div>

        {/* Configuration Cards */}
        <div className="space-y-6">
          {/* First Row - Settings */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AnalyzerSettings
              file={state.file}
              targetYear={state.targetYear}
              routeProfile={state.routeProfile}
              costPerKm={state.costPerKm}
              error={state.error}
              onFileUpload={handleFileUpload}
              onYearChange={(year) => setState(prev => ({ ...prev, targetYear: year }))}
              onRouteProfileChange={(profile) => setState(prev => ({ ...prev, routeProfile: profile }))}
              onCostPerKmChange={handleCostPerKmChange}
            />

            {/* Home Location */}
            <HomeLocationCard
              homeLocation={state.homeLocation}
              isEditing={locationEdit.editingHome}
              onEdit={() => setLocationEdit(prev => ({ ...prev, editingHome: true }))}
              onCancel={() => setLocationEdit(prev => ({ ...prev, editingHome: false }))}
              onSelect={handleHomeLocationSelect}
            />

            {/* Business Locations */}
            <BusinessLocationsCard
              businessLocations={state.businessLocations}
              isAddingLocation={locationEdit.addingBusinessLocation}
              onStartAddingLocation={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: true }))}
              onCancelAddingLocation={() => setLocationEdit(prev => ({ ...prev, addingBusinessLocation: false }))}
              onSelectLocation={handleBusinessLocationSelect}
              onRemoveLocation={removeBusinessLocation}
              onUpdateLocationRadius={updateBusinessLocationRadius}
              onUpdateTravelReason={updateBusinessLocationTravelReason}
              onResetToDefaults={resetToDefaults}
            />
          </div>

          {/* Second Row - Saved Files */}
          <SavedTimelinesCard
            currentFileId={state.currentSavedFileId}
            onLoadFile={handleLoadSavedFile}
            onFilesChange={handleSavedFilesChange}
          />
        </div>

        {/* Analysis Button */}
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Button
              onClick={handleAnalyze}
              disabled={!state.file || state.isAnalyzing || locationEdit.addingBusinessLocation || locationEdit.editingHome}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3"
              size="lg"
            >
              {state.isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Analyzing...
                </>
              ) : locationEdit.addingBusinessLocation ? (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Finish adding location first
                </>
              ) : locationEdit.editingHome ? (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Finish editing home location first
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
          onExport={handleExport}
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
