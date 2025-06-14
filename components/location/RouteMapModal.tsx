'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Car, Train, Navigation } from 'lucide-react';
import { BusinessVisit } from '@/lib/location/utils';
import {
  calculateRoute,
  calculateStraightLineRoute,
  RouteResult,
  RouteProfile,
  RoutingError,
  formatDistance,
  formatDuration,
  getProfileDisplayName
} from '@/lib/location/routing';

interface RouteMapModalProps {
  visit: BusinessVisit;
  isOpen: boolean;
  onClose: () => void;
}

export function RouteMapModal({ visit, isOpen, onClose }: RouteMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapId = useRef(`route-map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const [selectedProfile, setSelectedProfile] = useState<RouteProfile>('driving-car');
  const [currentRoute, setCurrentRoute] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Load route when profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      loadRoute();
    }
  }, [isOpen, selectedProfile]);

  // Initialize map when modal opens
  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    // Cleanup any existing map first
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Clear the container
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
      mapRef.current.classList.remove('leaflet-container');
    }

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix for default markers in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      try {
        // Calculate bounds to fit both home and business location
        const bounds = L.latLngBounds([
          [visit.homeLocation.lat, visit.homeLocation.lon],
          [visit.businessLocation.lat, visit.businessLocation.lon]
        ]);

        // Initialize map with bounds
        const map = L.map(mapRef.current!).fitBounds(bounds, { padding: [20, 20] });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Create custom home marker (green)
        const homeIcon = L.divIcon({
          html: '<div style="background-color: #22c55e; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: 'custom-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Create custom business marker (blue)
        const businessIcon = L.divIcon({
          html: '<div style="background-color: #3b82f6; border: 2px solid white; border-radius: 50%; width: 20px; height: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: 'custom-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Add home marker
        L.marker([visit.homeLocation.lat, visit.homeLocation.lon], { icon: homeIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <div class="font-semibold mb-1">🏠 ${visit.homeLocation.name}</div>
              <div class="text-sm text-gray-600">${visit.homeLocation.address}</div>
            </div>
          `);

        // Add business marker
        L.marker([visit.businessLocation.lat, visit.businessLocation.lon], { icon: businessIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-2">
              <div class="font-semibold mb-1">🏢 ${visit.businessLocation.name}</div>
              <div class="text-sm text-gray-600">${visit.businessLocation.address}</div>
            </div>
          `);

        // Store map instance
        mapInstanceRef.current = map;

        // Draw route if available
        if (currentRoute) {
          drawRoute(L, map, currentRoute);
        }

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }).catch((error) => {
      console.error('Error loading Leaflet:', error);
    });

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, currentRoute]);

  const loadRoute = async () => {
    setIsLoadingRoute(true);
    setRouteError(null);

    try {
      const result = await calculateRoute(
        { lat: visit.homeLocation.lat, lon: visit.homeLocation.lon },
        { lat: visit.businessLocation.lat, lon: visit.businessLocation.lon },
        selectedProfile
      );

      if ('message' in result) {
        // Error occurred, use fallback
        setRouteError(result.message);
        const fallbackRoute = calculateStraightLineRoute(
          { lat: visit.homeLocation.lat, lon: visit.homeLocation.lon },
          { lat: visit.businessLocation.lat, lon: visit.businessLocation.lon }
        );
        setCurrentRoute(fallbackRoute);
      } else {
        setCurrentRoute(result);
      }
    } catch (error) {
      console.error('Failed to load route:', error);
      setRouteError('Failed to load route');
      // Use fallback route
      const fallbackRoute = calculateStraightLineRoute(
        { lat: visit.homeLocation.lat, lon: visit.homeLocation.lon },
        { lat: visit.businessLocation.lat, lon: visit.businessLocation.lon }
      );
      setCurrentRoute(fallbackRoute);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const drawRoute = (L: any, map: any, route: RouteResult) => {
    // Remove existing route layers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.className === 'route-line') {
        map.removeLayer(layer);
      }
    });

    // Convert geometry to leaflet format [lat, lon]
    const latlngs: [number, number][] = route.geometry.map(coord => [coord[1], coord[0]]);

    // Draw route line
    const routeColor = selectedProfile === 'driving-car' ? '#f59e0b' :
                     selectedProfile === 'public-transport' ? '#10b981' : '#8b5cf6';

    L.polyline(latlngs, {
      color: routeColor,
      weight: 4,
      opacity: 0.8,
      className: 'route-line'
    }).addTo(map);

    // Fit bounds to route
    if (latlngs.length > 0) {
      const routeBounds = L.latLngBounds(latlngs);
      map.fitBounds(routeBounds, { padding: [20, 20] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Route Details</h2>
            <p className="text-gray-600 text-sm mt-1">
              {visit.date} • {visit.businessLocation.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close map"
            aria-label="Close map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Map */}
          <div className="flex-1 relative">
            <div
              ref={mapRef}
              id={mapId.current}
              className="w-full h-full"
            />
            {isLoadingRoute && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading route...</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l p-6 flex flex-col">
            {/* Route Mode Selector */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Transportation Mode</h3>
              <div className="space-y-2">
                {(['driving-car', 'public-transport', 'foot-walking'] as RouteProfile[]).map((profile) => (
                  <button
                    key={profile}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                      selectedProfile === profile
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{getProfileDisplayName(profile)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Route Info */}
            {currentRoute && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Route Information</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Distance</div>
                    <div className="font-semibold">{formatDistance(currentRoute.distance)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Duration</div>
                    <div className="font-semibold">{formatDuration(currentRoute.duration)}</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm text-gray-600">Mode</div>
                    <div className="font-semibold">{getProfileDisplayName(currentRoute.profile)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {routeError && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  <strong>Note:</strong> {routeError}. Showing direct route instead.
                </div>
              </div>
            )}

            {/* Location Details */}
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="font-medium text-green-800 mb-1">🏠 Home</div>
                <div className="text-sm text-green-600">{visit.homeLocation.address}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="font-medium text-blue-800 mb-1">🏢 Business</div>
                <div className="text-sm text-blue-600">{visit.businessLocation.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
