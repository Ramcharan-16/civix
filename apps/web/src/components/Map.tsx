import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Point {
  id?: string;
  title?: string;
  lat: number;
  lng: number;
  status?: string;
}

interface MapProps {
  points?: Point[];
  selectedPoint?: { lat: number; lng: number } | null;
  onPointSelect?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

// Custom markers styling
const getPinColor = (status: string) => {
  switch (status) {
    case 'RESOLVED':
    case 'CLOSED':
      return '#10b981'; // Green
    case 'IN_PROGRESS':
      return '#3b82f6'; // Blue
    case 'PENDING_VERIFICATION':
      return '#f59e0b'; // Orange
    case 'REJECTED':
      return '#ef4444'; // Red
    default:
      return '#6366f1'; // Indigo
  }
};

export const Map: React.FC<MapProps> = ({
  points = [],
  selectedPoint = null,
  onPointSelect,
  interactive = false
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);

  // Store the callback in a ref to prevent map teardowns on callback re-creation
  const onPointSelectRef = useRef(onPointSelect);
  useEffect(() => {
    onPointSelectRef.current = onPointSelect;
  }, [onPointSelect]);

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const skipFetchRef = useRef(false);

  // Autocomplete fetch effect
  useEffect(() => {
    if (!interactive) return;
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&email=contact@civix.gov.in&limit=5`);
        const data = await res.json();
        if (data && data.length > 0) {
          setSuggestions(data);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, interactive]);

  const handleSuggestionClick = (item: any) => {
    skipFetchRef.current = true;
    setSearchQuery(item.display_name);
    setSuggestions([]);
    setShowSuggestions(false);

    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    // Center and zoom map to location first
    if (mapRef.current) {
      mapRef.current.setView([lat, lng], 16);
    }

    // Trigger selection to update parent state
    onPointSelectRef.current?.(lat, lng);
  };

  // Initialize Map (runs only once on mount or when interactive changes)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Fix default Leaflet icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    // Default center: Bengaluru
    const initialLat = selectedPoint?.lat || (points.length > 0 ? points[0].lat : 12.971598);
    const initialLng = selectedPoint?.lng || (points.length > 0 ? points[0].lng : 77.594562);

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
    });

    mapRef.current = map;

    // Google Maps Street View layer
    const googleStreet = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    });

    // Google Maps Hybrid layer (Satellite + road names)
    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      attribution: '&copy; Google Maps'
    });

    // Add standard Google Maps street view by default
    googleStreet.addTo(map);

    // Add Layers Control to switch views
    const baseMaps = {
      "Google Map (Street)": googleStreet,
      "Google Map (Satellite)": googleHybrid
    };
    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

    // Markers layer group
    const markersGroup = L.featureGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Handle map click for placing marker in interactive mode
    if (interactive) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onPointSelectRef.current?.(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [interactive]);

  // Update/Draw interactive selector marker (triggers only when numeric coordinates change)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing selection marker if any
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (selectedPoint) {
      const { lat, lng } = selectedPoint;

      // Red pin for selection
      const redIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="transform: translate(-50%, -100%); position: relative; animation: bounce 1s infinite alternate">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 5px rgba(239, 68, 68, 0.5))">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="rgba(239,68,68,0.2)"></path>
              <circle cx="12" cy="10" r="3" fill="#ef4444"></circle>
            </svg>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30]
      });

      const marker = L.marker([lat, lng], {
        icon: redIcon,
        draggable: interactive
      }).addTo(map);

      if (interactive) {
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onPointSelectRef.current?.(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
        });
      }

      markerRef.current = marker;

      // Center and zoom map to new coordinate only if it is significantly far away (more than 200m)
      const currentCenter = map.getCenter();
      const distance = currentCenter.distanceTo([lat, lng]);
      if (distance > 200) {
        map.setView([lat, lng], 16);
      }
    }
  }, [selectedPoint?.lat, selectedPoint?.lng, interactive]);

  // Update multiple pins (points prop)
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (points && points.length > 0) {
      const validMarkers: L.Marker[] = [];
      points.forEach(pt => {
        if (typeof pt.lat !== 'number' || typeof pt.lng !== 'number' || isNaN(pt.lat) || isNaN(pt.lng)) {
          return;
        }

        const pinColor = getPinColor(pt.status || '');
        const dotIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background-color: ${pinColor};
              border: 2px solid #fff;
              box-shadow: 0 0 10px ${pinColor};
            "></div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        const marker = L.marker([pt.lat, pt.lng], { icon: dotIcon });
        if (pt.title) {
          marker.bindPopup(`<strong>${pt.title}</strong><br/>Status: ${pt.status}`);
        }
        markersGroup.addLayer(marker);
        validMarkers.push(marker);
      });

      // Fit bounds to show all pins if not in selection mode and if we have valid points
      if (!selectedPoint && validMarkers.length > 1) {
        try {
          map.fitBounds(markersGroup.getBounds(), { padding: [50, 50] });
        } catch (e) {
          // ignore bounds calculation on single/empty group
        }
      }
    }
  }, [points, selectedPoint]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '350px', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Geocoding Search Bar Overlay */}
      {interactive && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50px', // offset from leaflet zoom controls
          zIndex: 1000,
          width: 'calc(100% - 160px)',
          maxWidth: '300px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Search address or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 250);
              }}
              style={{
                padding: '8px 30px 8px 12px',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.15)',
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                color: '#fff',
                outline: 'none',
                width: '100%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                boxSizing: 'border-box'
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const query = (e.target as HTMLInputElement).value;
                  if (!query) return;
                  
                  // Hide suggestions on Enter
                  setShowSuggestions(false);
                  setSuggestions([]);
                  
                  try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&email=contact@civix.gov.in&limit=1`);
                    const data = await res.json();
                    if (data && data.length > 0) {
                      const first = data[0];
                      const lat = parseFloat(first.lat);
                      const lng = parseFloat(first.lon);
                      
                      skipFetchRef.current = true;
                      setSearchQuery(first.display_name);
                      
                      // Center and zoom map to location first (synchronously sets Leaflet state)
                      if (mapRef.current) {
                        mapRef.current.setView([lat, lng], 16);
                      }

                      // Trigger selection to update parent state
                      onPointSelectRef.current?.(lat, lng);
                    } else {
                      alert('Location not found. Try another search.');
                    }
                  } catch (err) {
                    console.error('Search failed:', err);
                    alert('Search failed due to a network issue or rate limit. Please try again.');
                  }
                }
              }}
            />
            {isSearching && (
              <div style={{
                position: 'absolute',
                right: '10px',
                top: 'calc(50% - 6px)',
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid #fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                pointerEvents: 'none'
              }} />
            )}
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(12px)',
              zIndex: 1001
            }}>
              {suggestions.map((item: any, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSuggestionClick(item)}
                  style={{
                    padding: '10px 12px',
                    fontSize: '0.8rem',
                    color: '#fff',
                    cursor: 'pointer',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    transition: 'background-color 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {item.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />
      
      {/* Styles for animations and overrides */}
      <style>{`
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-8px); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .leaflet-container {
          background: #111827 !important;
        }
        /* Custom scrollbar and popup styling for dark theme integration */
        .leaflet-popup-content-wrapper {
          background: rgba(17, 24, 39, 0.9) !important;
          color: #fff !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          backdrop-filter: blur(10px) !important;
        }
        .leaflet-popup-tip {
          background: rgba(17, 24, 39, 0.9) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
      `}</style>
    </div>
  );
};
