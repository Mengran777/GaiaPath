// src/components/RouteSelection/RouteList.tsx

import React from "react";
import { RouteOption } from "@/types/routes";
import RouteCard from "./RouteCard";

interface RouteListProps {
  routes: RouteOption[];
  onSelectRoute: (routeId: string) => void;
  isLoading?: boolean;
}

const RouteList: React.FC<RouteListProps> = ({
  routes,
  onSelectRoute,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="relative mb-8 inline-block">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-3xl">✨</div>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Creating Your Perfect Routes
          </h3>
          <p className="text-gray-600 mb-6">
            Our AI is generating 3 curated travel experiences with real images...
          </p>
          <div className="flex flex-col gap-2 text-sm text-gray-500 mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse">🌍 Exploring destinations</div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>🎨 Crafting unique themes</div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>📸 Fetching real images</div>
            </div>
          </div>
          <div className="text-xs text-purple-600 font-medium bg-purple-50 px-4 py-2 rounded-full inline-block">
            ⚡ Parallel generation + Real images
          </div>
        </div>
      </div>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 text-lg">
          No routes available. Please try generating again.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-4 custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Choose Your Perfect Journey
        </h2>
        <p className="text-gray-600">
          We've created {routes.length} curated routes with real images based on your
          preferences. Select one to see the detailed itinerary.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-6">
        {routes.map((route, index) => (
          <RouteCard
            key={route.id || `route-${index}`}
            route={route}
            onSelect={onSelectRoute}
          />
        ))}
      </div>
    </div>
  );
};

export default RouteList;
