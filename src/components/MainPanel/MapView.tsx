"use client"; // This directive marks the file as a Client Component, as map interactions require client-side execution.

import React, { useState, useEffect } from "react";
// Import Map component and other controls from react-map-gl library
// FIX: Changed import to named exports for Map and other components.
import Map from "react-map-gl/mapbox";
import {
  Marker,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "mapbox-gl/dist/mapbox-gl.css";

// Import Mapbox GL JS CSS for proper map styling.
// Note: If already globally imported in globals.css, this line can be commented out.
// import 'mapbox-gl/dist/mapbox-gl.css';

// Retrieve Mapbox Access Token from environment variables.
// The NEXT_PUBLIC_ prefix is a Next.js convention for public environment variables accessible on the client side.
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const MapView: React.FC = () => {
  // Define the initial view state of the map, including latitude, longitude, and zoom level.
  const [viewState, setViewState] = useState({
    latitude: 34.0522, // Example: Latitude for Los Angeles
    longitude: -118.2437, // Example: Longitude for Los Angeles
    zoom: 10, // Initial zoom level
  });

  // Use useEffect hook to check if the Mapbox token is set when the component mounts.
  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      // If the token is not set, log an error message to the console.
      console.error(
        "Mapbox Access Token is not set. Please check your .env.local file."
      );
    }
  }, []); // Empty dependency array ensures this runs only once on component mount.

  return (
    // Map container with full width, full height, rounded corners, overflow hidden, and shadow.
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl">
      {/* Check if MAPBOX_TOKEN exists; if so, render the map, otherwise display a loading message. */}
      {MAPBOX_TOKEN ? (
        <Map
          // Basic configuration for Mapbox GL JS
          mapboxAccessToken={MAPBOX_TOKEN} // Mapbox access token
          initialViewState={viewState} // Initial view state of the map
          // Update viewState when the map view changes (e.g., dragging, zooming).
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: "100%", height: "100%" }} // Styles for the map container, ensuring it fills the parent.
          mapStyle="mapbox://styles/mapbox/streets-v12" // Map style. Can be changed to other Mapbox styles like satellite-v9, light-v11, dark-v11, etc.

          // Optional map controls
          // mapLib={import('mapbox-gl')} // Explicitly specify mapbox-gl instance if encountering specific issues.
        >
          {/* Add navigation controls (zoom, compass) at the top-right position. */}
          <NavigationControl position="top-right" />

          {/* Add fullscreen control at the top-right position. */}
          <FullscreenControl position="top-right" />

          {/* Add scale control. */}
          <ScaleControl />

          {/* Example: Add a marker on the map. */}
          {/* The marker's longitude and latitude are set to the map's center, using a 📍 emoji as the icon. */}
          <Marker longitude={-118.2437} latitude={34.0522} anchor="bottom">
            📍
          </Marker>

          {/* You can add more Markers, Popups, or custom layers here to display itinerary locations. */}
        </Map>
      ) : (
        // If Mapbox token is not set, display a loading message.
        <div className="flex items-center justify-center w-full h-full bg-gray-100 text-gray-500 rounded-2xl">
          Loading Map... (Please check Mapbox Token)
        </div>
      )}
    </div>
  );
};

export default MapView;
