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
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-lg">
            Generating your personalized routes...
          </p>
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
          We've created {routes.length} personalized routes based on your
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
