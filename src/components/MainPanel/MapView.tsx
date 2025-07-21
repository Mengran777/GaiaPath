// src/components/MainPanel/MapView.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Map from "react-map-gl/mapbox";
import {
  Marker,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  Popup,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import mapboxgl from "mapbox-gl"; // Import mapboxgl for programmatic control

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

interface MapViewProps {
  locations: Location[];
  route: GeoJSON.Feature<GeoJSON.LineString, GeoJSON.GeoJsonProperties> | null;
  highlightedLocation: Location | null; // This is correctly passed
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapView: React.FC<MapViewProps> = ({
  locations,
  route,
  highlightedLocation,
}) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);

  // Use a controlled viewState from Mapbox GL JS, allows flyTo
  const [viewState, setViewState] = useState({
    latitude: locations.length > 0 ? locations[0].latitude : 34.0522,
    longitude: locations.length > 0 ? locations[0].longitude : -118.2437,
    zoom: locations.length > 0 ? 12 : 10,
    bearing: 0,
    pitch: 0,
  });

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  // ⭐ IMPORTANT EFFECT: Fly to and highlight location when highlightedLocation changes ⭐
  useEffect(() => {
    if (highlightedLocation && mapRef.current) {
      const { latitude, longitude } = highlightedLocation;
      if (latitude !== 0 && longitude !== 0) {
        mapRef.current.flyTo({
          center: [longitude, latitude],
          zoom: 14, // Zoom in closer for highlighted location
          duration: 1500, // Smooth fly-to animation
          essential: true, // Make sure this animation is prioritized
        });
        setSelectedLocation(highlightedLocation); // Open popup for highlighted location
      }
    }
  }, [highlightedLocation, mapRef.current]); // Depend on mapRef.current too, to ensure map is loaded

  // Effect to fit map bounds to all locations when `locations` changes
  // We need to be careful here not to immediately override `highlightedLocation` flyTo.
  // This effect will run *after* the initial render with new locations.
  useEffect(() => {
    if (locations.length > 0 && mapRef.current && !highlightedLocation) {
      // Only fit bounds to ALL locations if no specific location is highlighted
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach((loc) => {
        if (
          typeof loc.latitude === "number" &&
          typeof loc.longitude === "number" &&
          loc.latitude !== 0 &&
          loc.longitude !== 0
        ) {
          bounds.extend([loc.longitude, loc.latitude]);
        }
      });

      if (!bounds.isEmpty()) {
        mapRef.current.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 1000,
        });
      }
    } else if (locations.length === 0 && mapRef.current) {
      // If itinerary is cleared, reset map to default
      mapRef.current.flyTo({
        center: [-118.2437, 34.0522],
        zoom: 10,
        duration: 1000,
      });
      setSelectedLocation(null); // Close any open popup
    }
  }, [locations, highlightedLocation]); // Depend on highlightedLocation to manage when this runs

  // Callback for when the map loads
  const onMapLoad = useCallback(
    (event: mapboxgl.MapboxEvent) => {
      mapRef.current = event.target as mapboxgl.Map;
      // After map loads, if there's an itinerary, fit bounds
      if (locations.length > 0 && !highlightedLocation) {
        const bounds = new mapboxgl.LngLatBounds();
        locations.forEach((loc) => {
          if (
            typeof loc.latitude === "number" &&
            typeof loc.longitude === "number" &&
            loc.latitude !== 0 &&
            loc.longitude !== 0
          ) {
            bounds.extend([loc.longitude, loc.latitude]);
          }
        });
        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            duration: 0, // No animation on initial load
          });
        }
      }
    },
    [locations, highlightedLocation]
  );

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      console.error(
        "Mapbox Access Token is not set. Please check your .env.local file."
      );
    }
  }, []);

  const lineLayerStyle = {
    id: "route-line",
    type: "line",
    paint: {
      "line-color": "#007cbf",
      "line-width": 4,
      "line-opacity": 0.75,
    },
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
  } as const;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
      {MAPBOX_TOKEN ? (
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          {...viewState} // Use spread operator for controlled viewState
          onMove={(evt) => setViewState(evt.viewState)}
          onLoad={onMapLoad} // Use the useCallback version
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          onClick={() => setSelectedLocation(null)} // Close popup if map is clicked directly
        >
          <NavigationControl position="top-right" />
          <FullscreenControl position="top-right" />
          <ScaleControl />

          {route && (
            <Source id="my-route-data" type="geojson" data={route}>
              <Layer {...lineLayerStyle} />
            </Source>
          )}

          {locations.map((location, index) =>
            typeof location.latitude === "number" &&
            typeof location.longitude === "number" &&
            location.latitude !== 0 &&
            location.longitude !== 0 ? (
              <Marker
                key={`marker-${index}`}
                longitude={location.longitude}
                latitude={location.latitude}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation(); // Prevent map click from closing popup immediately
                  setSelectedLocation(location); // Open popup on marker click
                }}
              >
                {/* ⭐ MODIFIED: Refined comparison for highlighting ⭐ */}
                <div
                  className={`text-2xl drop-shadow-md transition-transform duration-300
                                ${
                                  highlightedLocation &&
                                  // Compare by a unique identifier or all relevant properties
                                  highlightedLocation.latitude ===
                                    location.latitude &&
                                  highlightedLocation.longitude ===
                                    location.longitude &&
                                  highlightedLocation.name === location.name
                                    ? "text-blue-600 scale-150 z-10" // Highlighted style + z-index to bring to front
                                    : "text-red-600 scale-100" // Default style
                                }`}
                >
                  📍
                </div>
              </Marker>
            ) : null
          )}

          {/* ⭐ Popup always uses selectedLocation for opening/closing ⭐ */}
          {selectedLocation && (
            <Popup
              longitude={selectedLocation.longitude}
              latitude={selectedLocation.latitude}
              anchor="bottom"
              onClose={() => setSelectedLocation(null)}
              closeOnClick={false}
            >
              <div className="p-2">
                <h4 className="font-bold text-base mb-1">
                  {selectedLocation.name}
                </h4>
                {selectedLocation.description && (
                  <p className="text-sm text-gray-700">
                    {selectedLocation.description}
                  </p>
                )}
                {selectedLocation.imageUrl && (
                  <img
                    src={selectedLocation.imageUrl}
                    alt={selectedLocation.name}
                    className="w-full h-24 object-cover mt-2 rounded-md"
                  />
                )}
              </div>
            </Popup>
          )}
        </Map>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500 rounded-2xl">
          地图加载中... (请检查 Mapbox Token)
        </div>
      )}
    </div>
  );
};

export default MapView;
