import { useEffect, useRef, useState } from 'react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

function LocationAutocomplete({ value, onChange, placeholder, required }: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common location suggestions (fallback when no API key)
  const commonLocations = [
    'City Sports Complex',
    'Municipal Stadium',
    'Community Sports Ground',
    'District Football Ground',
    'Sports Club Ground',
    'University Stadium',
    'School Playground',
    'Recreation Ground',
    'Public Sports Field',
  ];

  const filteredSuggestions = value
    ? commonLocations.filter((loc) =>
        loc.toLowerCase().includes(value.toLowerCase())
      )
    : [];

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    // Only try to load Google Maps if API key is configured
    if (!apiKey) {
      return; // Use local suggestions fallback
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsGoogleMapsLoaded(true);
      return;
    }

    // Load Google Maps Places API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleMapsLoaded(true);
    script.onerror = () => console.log('Using local location suggestions');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !inputRef.current || autocompleteRef.current) return;

    try {
      // Initialize Google Places Autocomplete
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['establishment', 'geocode'],
        fields: ['formatted_address', 'name'],
      });

      // Listen for place selection
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place && (place.formatted_address || place.name)) {
          const locationName = place.name || place.formatted_address;
          onChange(locationName);
        }
      });
    } catch (error) {
      console.log('Using local location suggestions');
    }
  }, [isGoogleMapsLoaded, onChange]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => !isGoogleMapsLoaded && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        placeholder={placeholder || 'e.g., City Sports Complex, Mumbai'}
        className="w-full px-4 py-3 bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
        autoComplete="off"
      />

      {/* Local suggestions (shown only when no Google Maps) */}
      {!isGoogleMapsLoaded && showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
          {filteredSuggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-3 text-left text-white hover:bg-green-500/20 transition-colors border-b border-white/5 last:border-b-0"
            >
              📍 {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationAutocomplete;
