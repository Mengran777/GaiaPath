// src/components/RouteSelection/RouteList.tsx

import React from "react";
import { RouteOption } from "@/types/routes";
import RouteCard from "./RouteCard";

interface RouteListProps {
  routes: RouteOption[];
  onSelectRoute: (routeId: string) => void;
  favoriteRoutes?: Set<string>;
  onToggleFavorite?: (routeId: string) => void;
  showFavoritesOnly?: boolean;
  activeTab?: string;
}

// Stagger delays for first 3 cards, rest get the last value
const STAGGER_DELAYS = [0.05, 0.15, 0.25];

const RouteList: React.FC<RouteListProps> = ({
  routes,
  onSelectRoute,
  favoriteRoutes = new Set(),
  onToggleFavorite,
  showFavoritesOnly = false,
  activeTab = "Discover",
}) => {
  if (!routes || routes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">{showFavoritesOnly ? "💫" : "🗺️"}</div>
          <p className="text-[#8a8a8a] text-base">
            {showFavoritesOnly
              ? "No favorite routes yet. Start exploring and save your favorites!"
              : "No routes available. Please try generating again."}
          </p>
        </div>
      </div>
    );
  }

  const getHeaderContent = () => {
    if (activeTab === "Favorites") {
      return {
        title: "Your Favorite Routes",
        description: `${routes.length} saved ${routes.length === 1 ? "route" : "routes"} · Click to view the itinerary`,
      };
    }
    if (activeTab === "My Itineraries") {
      return {
        title: "My Itineraries",
        description: `${routes.length} saved ${routes.length === 1 ? "itinerary" : "itineraries"} · Click to view or edit`,
      };
    }
    return {
      title: "Choose Your Perfect Journey",
      description: `${routes.length} personalised routes based on your preferences · Click to explore`,
    };
  };

  const { title, description } = getHeaderContent();

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="px-6 pt-6 pb-2">
        <h2 className="font-display text-2xl font-bold text-[#0d3d38] mb-1">
          {title}
        </h2>
        <p className="text-[#8a8a8a] text-sm">{description}</p>
      </div>

      <div className="px-6 pb-6 pt-4 grid grid-cols-1 gap-3">
        {routes.map((route, index) => (
          <div
            key={`${activeTab}-${route.id || index}`}
            className="animate-card-enter"
            style={{
              animationDelay: `${STAGGER_DELAYS[Math.min(index, STAGGER_DELAYS.length - 1)]}s`,
            }}
          >
            <RouteCard
              route={route}
              onSelect={onSelectRoute}
              isFavorite={favoriteRoutes.has(route.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RouteList;
