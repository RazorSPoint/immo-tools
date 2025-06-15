'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchAddresses, GeocodeResult, RoutingError } from '@/lib/location/routing';

interface AddressSearchProps {
  placeholder?: string;
  onSelect: (result: GeocodeResult) => void;
  onClose?: () => void;
  className?: string;
}

export function AddressSearch({ placeholder = "Search for an address...", onSelect, onClose, className = "" }: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      setError(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchAddresses(query);

        if ('message' in searchResults) {
          setError(searchResults.message);
          setResults([]);
        } else {
          setResults(searchResults);
          setError(null);
        }
        setShowResults(true);
      } catch (err) {
        setError('Search failed');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleSelect = (result: GeocodeResult) => {
    onSelect(result);
    setQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
    if (onClose) onClose();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear search"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (results.length > 0 || error) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {error ? (
            <div className="p-3 text-sm text-red-600 border-b">
              {error}
            </div>
          ) : (
            results.map((result, index) => (            <button
              key={index}
              onClick={() => handleSelect(result)}
              className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
              title={`Select address: ${result.address}`}
            >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate">{result.address}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                      <span>📍 {result.lat.toFixed(4)}, {result.lon.toFixed(4)}</span>
                      <span className="flex items-center gap-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            result.confidence > 0.8 ? 'bg-green-400' :
                            result.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                        />
                        {Math.round(result.confidence * 100)}% match
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
