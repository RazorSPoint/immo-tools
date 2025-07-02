'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { RouteProfile } from '@/lib/location/routing';

interface AnalyzerSettingsProps {
  file: File | null;
  targetYear: number;
  routeProfile: RouteProfile;
  costPerKm: number;
  error: string | null;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onYearChange: (year: number) => void;
  onRouteProfileChange: (profile: RouteProfile) => void;
  onCostPerKmChange: (costPerKm: number) => void;
}

export function AnalyzerSettings({
  file,
  targetYear,
  routeProfile,
  costPerKm,
  error,
  onFileUpload,
  onYearChange,
  onRouteProfileChange,
  onCostPerKmChange
}: AnalyzerSettingsProps) {
  return (
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
            onChange={onFileUpload}
            className="mt-1"
          />
          {file && (
            <p className="text-sm text-green-600 mt-1">
              ✓ {file.name} uploaded
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="target-year">Analysis Year</Label>
          <Input
            id="target-year"
            type="number"
            value={targetYear}
            onChange={(e) => onYearChange(parseInt(e.target.value) || new Date().getFullYear())}
            className="mt-1"
            min="2010"
            max={new Date().getFullYear() + 1}
          />
        </div>

        <div>
          <Label htmlFor="route-profile">Distance Calculation Mode</Label>
          <select
            id="route-profile"
            value={routeProfile}
            onChange={(e) => onRouteProfileChange(e.target.value as RouteProfile)}
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

        <div>
          <Label htmlFor="cost-per-km">Kosten pro Kilometer (EUR)</Label>
          <Input
            id="cost-per-km"
            type="number"
            step="0.01"
            value={costPerKm}
            onChange={(e) => onCostPerKmChange(parseFloat(e.target.value) || 0)}
            className="mt-1"
            min="0"
            max="2"
            placeholder="0.30"
          />
          <p className="text-xs text-gray-500 mt-1">
            Standard-Pauschale für PKW: 0,30 EUR/km (steuerlich absetzbar)
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
