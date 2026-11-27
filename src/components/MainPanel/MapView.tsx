// src/components/MainPanel/MapView.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Map from "react-map-gl/mapbox";
import Lozenge from "../UI/Lozenge";
import {
  Marker,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  Popup,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import type { DayRoute } from "@/lib/travelTimes";
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
  highlightedLocation: Location | null; // This is correctly passed
  /** One day selected: its route line and travel times between stops */
  dayRoute?: DayRoute | null;
  /** Show stop numbers beside the markers (a single day, in visiting order) */
  numbered?: boolean;
  /** Bottom strip, e.g. "Day II · 3 stops" and "5.4 km · 20 min moving" */
  summary?: { title: string; detail?: string } | null;
  /** Marker clicked: the page opens that stop in the list (instead of a popup) */
  onMarkerClick?: (location: Location) => void;
}


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapView: React.FC<MapViewProps> = ({
  locations,
  highlightedLocation,
  dayRoute = null,
  numbered = false,
  summary = null,
  onMarkerClick,
}) => {

  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

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

    if (!highlightedLocation) {
      // Clear the popup when highlightedLocation is null
      setSelectedLocation(null);
      return;
    }

    if (mapRef.current) {
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
  }, [highlightedLocation]);

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

      // Trigger resize immediately and mark map as ready
      if (mapRef.current) {
        mapRef.current.resize();

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

        // Mark map as ready after initial setup
        setIsMapReady(true);
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

  // Effect to handle map resize when container dimensions change
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    // Use ResizeObserver to detect container size changes
    const mapContainer = mapRef.current.getContainer();
    if (!mapContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    resizeObserver.observe(mapContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMapReady]);


  return (
    <div className="relative w-full h-full overflow-hidden">
      {MAPBOX_TOKEN ? (
        <div className={`w-full h-full transition-opacity duration-300 ${isMapReady ? 'opacity-100' : 'opacity-0'}`}>
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          {...viewState} // Use spread operator for controlled viewState
          onMove={(evt) => setViewState(evt.viewState)}
          onLoad={onMapLoad} // Use the useCallback version
          style={{ width: "100%", height: "100%" }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          onClick={() => setSelectedLocation(null)} // Close popup if map is clicked directly
        >
          <NavigationControl position="top-left" />
          <FullscreenControl position="top-left" />
          <ScaleControl position="top-right" />

          {/* Day route: terracotta line under the markers */}
          {dayRoute && dayRoute.line.length > 1 && (
            <Source
              id="day-route"
              type="geojson"
              data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: dayRoute.line } }}
            >
              <Layer
                id="day-route-line"
                type="line"
                paint={{ "line-color": "#a65a3a", "line-width": 2, "line-opacity": 0.9 }}
                layout={{ "line-join": "round", "line-cap": "round" }}
              />
            </Source>
          )}

          {/* Travel time between stops, at each leg's midpoint */}
          {dayRoute?.legs.map((leg, i) =>
            leg ? (
              <Marker key={`leg-${i}`} longitude={leg.at[0]} latitude={leg.at[1]} anchor="center">
                <span className="pointer-events-none whitespace-nowrap bg-white/90 px-1.5 py-0.5 text-[11px] text-ink-soft">
                  {leg.label}
                </span>
              </Marker>
            ) : null
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
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation(); // Prevent map click from closing popup immediately
                  if (onMarkerClick) onMarkerClick(location);
                  else setSelectedLocation(location); // Open popup on marker click
                }}
              >
                {/* ⭐ MODIFIED: Refined comparison for highlighting ⭐ */}
                <div
                  className={`transition-transform duration-500 ease-editorial cursor-pointer
                                ${
                                  highlightedLocation &&
                                  // Compare by a unique identifier or all relevant properties
                                  highlightedLocation.latitude ===
                                    location.latitude &&
                                  highlightedLocation.longitude ===
                                    location.longitude &&
                                  highlightedLocation.name === location.name
                                    ? "text-brand-500 scale-150 z-10" // Highlighted: terracotta, larger, in front
                                    : "text-ink scale-100" // Default: ink lozenge
                                }`}
                >
                  <Lozenge className="w-4 h-4 [filter:drop-shadow(0_0_1.5px_white)]" />
                </div>
                {numbered && (
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[12px] text-ink [text-shadow:0_0_3px_white,0_0_3px_white] pointer-events-none">
                    {index + 1}
                  </span>
                )}
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
                <h4 className="font-display text-[17px] mb-1">
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
                    className="w-full h-24 object-cover mt-2"
                  />
                )}
              </div>
            </Popup>
          )}
        </Map>
        {/* Sits above the Mapbox logo and attribution, which must stay visible */}
        {summary && (
          <div className="absolute left-4 right-4 bottom-11 bg-white px-4 py-3 flex items-baseline justify-between gap-4 pointer-events-none">
            <span className="font-display text-[16px] text-ink">{summary.title}</span>
            {summary.detail && <span className="text-xs text-ink-muted">{summary.detail}</span>}
          </div>
        )}
        </div>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-surface-dim text-ink-muted">
          The map can’t load. Check the Mapbox token in your environment settings.
        </div>
      )}
      {MAPBOX_TOKEN && !isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-dim">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b border-ink mb-4"></div>
            <p className="eyebrow">Unfolding the map</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
