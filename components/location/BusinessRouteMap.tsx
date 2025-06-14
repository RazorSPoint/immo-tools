'use client';

import React, { useEffect, useRef } from 'react';
import { BusinessVisit } from '@/lib/location/utils';

interface BusinessRouteMapProps {
  visit: BusinessVisit;
}

export function BusinessRouteMap({ visit }: BusinessRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const mapId = useRef(`map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!mapRef.current) return;

    // Cleanup any existing map first
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Clear the container's HTML to ensure clean state
    if (mapRef.current) {
      mapRef.current.innerHTML = '';
      mapRef.current.classList.remove('leaflet-container');
    }

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      // Check if container is still available and not already initialized
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
          html: '<div style="background-color: #22c55e; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: 'custom-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        // Create custom business marker (blue)
        const businessIcon = L.divIcon({
          html: '<div style="background-color: #3b82f6; border: 2px solid white; border-radius: 50%; width: 16px; height: 16px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
          className: 'custom-marker',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
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
              <div class="text-sm text-blue-600 mt-1">Distance: ${visit.distanceKm.toFixed(1)} km</div>
            </div>
          `);

        // Draw line between home and business location
        const latlngs: [number, number][] = [
          [visit.homeLocation.lat, visit.homeLocation.lon],
          [visit.businessLocation.lat, visit.businessLocation.lon]
        ];

        L.polyline(latlngs, {
          color: '#f59e0b',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5'
        }).addTo(map);

        // Store map instance
        mapInstanceRef.current = map;

      } catch (error) {
        console.error('Error initializing map:', error);
        // Clear container on error
        if (mapRef.current) {
          mapRef.current.innerHTML = '<div class="flex items-center justify-center h-full text-gray-500">Error loading map</div>';
        }
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
  }, [visit]);

  return (
    <div
      ref={mapRef}
      id={mapId.current}
      className="w-full h-full min-h-[300px] relative z-0 rounded-lg border"
    />
  );
}
