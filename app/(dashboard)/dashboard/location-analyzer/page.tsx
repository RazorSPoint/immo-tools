'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, MapPin, Calendar, FileText, ChevronDown, ChevronUp, Clock, Navigation, Home } from 'lucide-react';
import { TripResult, RelevantLocation, DEFAULT_BUSINESS_LOCATIONS, haversine } from '@/lib/location/utils';
import { TimelineAnalyzer, downloadCSV, TimelineData } from '@/lib/location/analyzer';

interface LocationAnalyzerState {
  file: File | null;
  targetYear: number;
  businessLocations: RelevantLocation[];
  isAnalyzing: boolean;
  results: TripResult[];
  error: string | null;
  expandedRoutes: Set<number>; // Track which routes are expanded
}

export default function LocationAnalyzerPage() {
  const [state, setState] = useState<LocationAnalyzerState>({
    file: null,
    targetYear: new Date().getFullYear(),
    businessLocations: DEFAULT_BUSINESS_LOCATIONS,
    isAnalyzing: false,
    results: [],
    error: null,
    expandedRoutes: new Set()
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
    if (!state.file) {
      setState(prev => ({ ...prev, error: 'Please upload a timeline file first' }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Read and parse the JSON file
      const fileContent = await state.file.text();
      const timelineData: TimelineData = JSON.parse(fileContent);

      // Create analyzer instance
      const analyzer = new TimelineAnalyzer({
        targetYear: state.targetYear,
        businessLocations: state.businessLocations,
        minMovementKm: 0.1
      });

      // Analyze the timeline data
      const results = analyzer.analyzeTimeline(timelineData);

      setState(prev => ({
        ...prev,
        results,
        isAnalyzing: false
      }));
    } catch (error) {
      console.error('Analysis error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to analyze timeline data. Please check the file format.',
        isAnalyzing: false
      }));
    }
  };  const handleExportCSV = () => {
    if (state.results.length === 0) return;

    const filename = `business-trips-${state.targetYear}.csv`;
    downloadCSV(state.results, filename);
  };

  const toggleRouteExpansion = (index: number) => {
    setState(prev => {
      const newExpandedRoutes = new Set(prev.expandedRoutes);
      if (newExpandedRoutes.has(index)) {
        newExpandedRoutes.delete(index);
      } else {
        newExpandedRoutes.add(index);
      }
      return { ...prev, expandedRoutes: newExpandedRoutes };
    });
  };

  const formatTime = (timestamp: string) => {
    // Format time in German timezone (Europe/Berlin)
    return new Date(timestamp).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Europe/Berlin', // Always show German time
      hour12: false
    });
  };

  const formatDateTime = (timestamp: string) => {
    // Full date and time in German timezone
    return new Date(timestamp).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Berlin',
      hour12: false
    });
  };

  const detectTimezoneInfo = (timestamp: string) => {
    const date = new Date(timestamp);
    const utcTime = date.toISOString();
    const germanTime = date.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
    const localTime = date.toLocaleString();

    return {
      original: timestamp,
      utc: utcTime,
      german: germanTime,
      local: localTime,
      hasTimezone: timestamp.includes('+') || timestamp.includes('Z')
    };
  };

  const formatCoordinate = (lat: number, lon: number) => {
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  };

  const calculateSegmentDistance = (coords: TripResult['coordinates'], index: number) => {
    if (index === 0) return 0;
    const prev = coords[index - 1];
    const current = coords[index];
    return haversine(prev.lat, prev.lon, current.lat, current.lon);
  };

  const RouteTimeline = ({ trip, tripIndex }: { trip: TripResult; tripIndex: number }) => {
    const sortedCoords = [...trip.coordinates].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-orange-500" />
          <h4 className="font-semibold text-gray-900">Route Timeline - {new Date(trip.date).toLocaleDateString()}</h4>
          <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded border">
            🌍 German Time (CET/CEST)
          </span>
        </div>

        <div className="space-y-3">
          {sortedCoords.map((coord, index) => {
            const isFirst = index === 0;
            const isLast = index === sortedCoords.length - 1;
            const segmentDistance = calculateSegmentDistance(sortedCoords, index);

            return (
              <div key={index} className="flex items-start gap-3 relative">
                {/* Timeline Line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 w-0.5 h-8 bg-gray-300" />
                )}

                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isFirst ? 'bg-green-100 text-green-600' :
                  isLast ? 'bg-red-100 text-red-600' :
                  'bg-blue-100 text-blue-600'
                }`}>
                  {isFirst ? <Home className="h-4 w-4" /> :
                   isLast ? <Home className="h-4 w-4" /> :
                   <Navigation className="h-4 w-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-medium text-gray-900 cursor-help"
                      title={`Original: ${coord.timestamp}\nGerman Time: ${formatDateTime(coord.timestamp)}\nTimezone: ${detectTimezoneInfo(coord.timestamp).hasTimezone ? 'Explicit' : 'Implicit'}`}
                    >
                      {formatTime(coord.timestamp)}
                    </span>
                    {segmentDistance > 0 && (
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                        +{segmentDistance.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="font-mono text-xs">
                        {formatCoordinate(coord.lat, coord.lon)}
                      </span>
                    </div>

                    {coord.address && (
                      <div className="mt-1 text-gray-500">
                        📍 {coord.address}
                      </div>
                    )}

                    {isFirst && <div className="text-xs text-green-600 font-medium">Trip Start</div>}
                    {isLast && <div className="text-xs text-red-600 font-medium">Trip End</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Distance:</span>
              <span className="ml-1 font-medium">{trip.totalDistance.toFixed(2)} km</span>
            </div>
            <div>
              <span className="text-gray-500">Duration:</span>
              <span className="ml-1 font-medium">
                {Math.round((new Date(sortedCoords[sortedCoords.length - 1].timestamp).getTime() -
                           new Date(sortedCoords[0].timestamp).getTime()) / (1000 * 60))} min
              </span>
            </div>
            <div>
              <span className="text-gray-500">Data Points:</span>
              <span className="ml-1 font-medium">{sortedCoords.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Location Analyzer</h1>
            <p className="text-gray-600">
              Analyze your Google Timeline data for business travel documentation
            </p>
          </div>
          <MapPin className="h-8 w-8 text-orange-500" />
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
            </CardContent>
          </Card>

          {/* Business Locations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Business Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {state.businessLocations.map((location, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium">{location.name}</h4>
                    <p className="text-sm text-gray-600">{location.address}</p>
                    <p className="text-xs text-gray-500">
                      Radius: {location.radius_km} km
                    </p>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" disabled>
                Customize Locations (Coming Soon)
              </Button>
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
                  Analyze Timeline Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {state.results.length > 0 && (
          <>
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {state.results.length}
                    </div>
                    <div className="text-sm text-gray-600">Business Trips</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {state.results.reduce((sum, trip) => sum + trip.totalDistance, 0).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Distance (km)</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {(state.results.reduce((sum, trip) => sum + trip.totalDistance, 0) / state.results.length).toFixed(0)}
                    </div>
                    <div className="text-sm text-gray-600">Avg Distance (km)</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Business Trips ({state.results.length})
                  </CardTitle>
                  <Button
                    onClick={handleExportCSV}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">From</th>
                        <th className="text-left p-3 font-medium">To</th>
                        <th className="text-left p-3 font-medium">Distance (km)</th>
                        <th className="text-left p-3 font-medium">Purpose</th>
                        <th className="text-left p-3 font-medium">Data Points</th>
                        <th className="text-left p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.results.map((trip, index) => {
                        const isExpanded = state.expandedRoutes.has(index);
                        return (
                          <React.Fragment key={index}>
                            <tr className="border-b hover:bg-gray-50">
                              <td className="p-3">{new Date(trip.date).toLocaleDateString()}</td>
                              <td className="p-3 max-w-xs truncate" title={trip.startLocation}>
                                {trip.startLocation}
                              </td>
                              <td className="p-3 max-w-xs truncate" title={trip.endLocation}>
                                {trip.endLocation}
                              </td>
                              <td className="p-3 font-mono">{trip.totalDistance.toFixed(2)}</td>
                              <td className="p-3">
                                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                                  {trip.businessPurpose}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-gray-500">
                                  {trip.coordinates.length} points
                                </span>
                              </td>
                              <td className="p-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleRouteExpansion(index)}
                                  className="flex items-center gap-1"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4" />
                                      Hide Route
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4" />
                                      View Route
                                    </>
                                  )}
                                </Button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={7} className="p-0">
                                  <RouteTimeline trip={trip} tripIndex={index} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
