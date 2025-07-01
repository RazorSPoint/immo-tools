'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Edit2 } from 'lucide-react';
import { HomeLocation } from '@/lib/location/utils';
import { AddressSearch } from '@/components/location/AddressSearch';
import { GeocodeResult } from '@/lib/location/routing';

interface HomeLocationCardProps {
  homeLocation: HomeLocation;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSelect: (result: GeocodeResult) => void;
}

export function HomeLocationCard({
  homeLocation,
  isEditing,
  onEdit,
  onCancel,
  onSelect
}: HomeLocationCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Home Location
          </span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <AddressSearch
              placeholder="Search for your home address..."
              onSelect={onSelect}
              onClose={onCancel}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
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
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Change Home Location
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
