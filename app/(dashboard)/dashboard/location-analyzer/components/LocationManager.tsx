'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, MapPin, Edit2, Plus, Settings, Trash2 } from 'lucide-react';
import { RelevantLocation, HomeLocation } from '@/lib/location/utils';
import { AddressSearch } from '@/components/location/AddressSearch';
import { GeocodeResult } from '@/lib/location/routing';
import { LocationEditState } from '../types/analyzer';

interface LocationManagerProps {
  homeLocation: HomeLocation;
  businessLocations: RelevantLocation[];
  locationEdit: LocationEditState;
  setLocationEdit: React.Dispatch<React.SetStateAction<LocationEditState>>;
  onHomeLocationSelect: (result: GeocodeResult) => void;
  onBusinessLocationSelect: (result: GeocodeResult) => void;
  onRemoveBusinessLocation: (index: number) => void;
  onUpdateBusinessLocationRadius: (index: number, radius: number) => void;
  onResetToDefaults: () => void;
}

export function LocationManager({
  homeLocation,
  businessLocations,
  locationEdit,
  setLocationEdit,
  onHomeLocationSelect,
  onBusinessLocationSelect,
  onRemoveBusinessLocation,
  onUpdateBusinessLocationRadius,
  onResetToDefaults
}: LocationManagerProps) {
  return (
    <div className="space-y-4">
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
                onSelect={onHomeLocationSelect}
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
                <h4 className="font-medium text-green-800">{homeLocation.name}</h4>
                <p className="text-sm text-green-600">{homeLocation.address}</p>
                <p className="text-xs text-green-500 mt-1">
                  📍 {homeLocation.lat.toFixed(4)}°, {homeLocation.lon.toFixed(4)}°
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
              Business Locations ({businessLocations.length})
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
                onClick={onResetToDefaults}
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
                  onSelect={onBusinessLocationSelect}
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
            {businessLocations.length === 0 ? (
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
              businessLocations.map((location, index) => (
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
                          onChange={(e) => onUpdateBusinessLocationRadius(index, Number(e.target.value) || 1)}
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
                        onClick={() => onRemoveBusinessLocation(index)}
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
          {!locationEdit.addingBusinessLocation && businessLocations.length > 0 && (
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
  );
}
