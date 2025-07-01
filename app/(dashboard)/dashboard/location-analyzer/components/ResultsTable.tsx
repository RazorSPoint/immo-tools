'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Filter, Download, X, ChevronDown, ChevronUp, ArrowUpDown, Navigation, FileSpreadsheet } from 'lucide-react';
import { BusinessVisit } from '@/lib/location/utils';
import { SortState, FilterState } from '../types/analyzer';

interface ResultsTableProps {
  results: BusinessVisit[];
  filteredAndSortedResults: BusinessVisit[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  sort: SortState;
  onSort: (field: SortState['field']) => void;
  onExport: (format: 'csv' | 'excel') => void;
  onSelectVisit: (visit: BusinessVisit) => void;
  onResetFilters: () => void;
  onToggleBusinessLocationFilter: (locationName: string) => void;
  uniqueBusinessLocations: string[];
  getActiveFilterCount: () => number;
  getFilterSummary: () => string;
}

export function ResultsTable({
  results,
  filteredAndSortedResults,
  filters,
  setFilters,
  sort,
  onSort,
  onExport,
  onSelectVisit,
  onResetFilters,
  onToggleBusinessLocationFilter,
  uniqueBusinessLocations,
  getActiveFilterCount,
  getFilterSummary
}: ResultsTableProps) {
  if (results.length === 0) {
    return null;
  }

  return (
    <>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {results.length}
              </div>
              <div className="text-sm text-gray-600">Business Visits</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {results.reduce((sum, visit) => sum + visit.distanceKm, 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Distance (km)</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(results.reduce((sum, visit) => sum + visit.distanceKm, 0) / results.length).toFixed(0)}
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
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Business Visits ({filteredAndSortedResults.length}{results.length !== filteredAndSortedResults.length ? ` of ${results.length}` : ''})
                {getActiveFilterCount() > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
                    {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} active
                  </span>
                )}
              </CardTitle>
              {getActiveFilterCount() > 0 && (
                <p className="text-sm text-gray-600 mt-1">{getFilterSummary()}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {filters.showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              {getActiveFilterCount() > 0 && (
                <Button
                  onClick={onResetFilters}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 text-gray-600"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    disabled={filteredAndSortedResults.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onExport('csv')}>
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onExport('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Panel */}
          {filters.showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Filters</h3>
                <Button
                  onClick={onResetFilters}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-1 text-gray-600"
                >
                  <X className="h-4 w-4" />
                  Reset
                </Button>
              </div>

              {/* Date Range Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium">From Date</Label>
                  <Input
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, startDate: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">To Date</Label>
                  <Input
                    type="date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, endDate: e.target.value }
                    }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Min Distance (km)</Label>
                  <Input
                    type="number"
                    value={filters.distanceRange.min}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      distanceRange: { ...prev.distanceRange, min: Number(e.target.value) || 0 }
                    }))}
                    className="mt-1"
                    min="0"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Distance (km)</Label>
                  <Input
                    type="number"
                    value={filters.distanceRange.max}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      distanceRange: { ...prev.distanceRange, max: Number(e.target.value) || 1000 }
                    }))}
                    className="mt-1"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              {/* Business Location Filters */}
              <div>
                <Label className="text-sm font-medium">Business Location Search</Label>
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={filters.businessLocationSearch}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    businessLocationSearch: e.target.value
                  }))}
                  className="mt-1"
                />
              </div>

              {/* Business Location Checkboxes */}
              {uniqueBusinessLocations.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Filter by Business Location</Label>
                  <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                    {uniqueBusinessLocations.map(locationName => (
                      <label key={locationName} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.businessLocations.includes(locationName)}
                          onChange={() => onToggleBusinessLocationFilter(locationName)}
                          className="rounded"
                        />
                        <span className="text-sm">{locationName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium">
                    <button
                      onClick={() => onSort('date')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Date
                      {sort.field === 'date' ? (
                        sort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button
                      onClick={() => onSort('businessLocation')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Business Location
                      {sort.field === 'businessLocation' ? (
                        sort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">
                    <button
                      onClick={() => onSort('distance')}
                      className="flex items-center gap-1 hover:text-blue-600"
                    >
                      Distance
                      {sort.field === 'distance' ? (
                        sort.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      No business visits found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedResults.map((visit, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3">{new Date(visit.date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium">{visit.businessLocation.name}</div>
                          <div className="text-sm text-gray-500">{visit.businessLocation.address}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono">{visit.distanceKm.toFixed(1)} km</div>
                        <div className="text-xs text-gray-500">route distance</div>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectVisit(visit)}
                          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200"
                        >
                          <Navigation className="h-4 w-4" />
                          View Route
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
