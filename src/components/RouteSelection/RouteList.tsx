// src/components/RouteSelection/RouteList.tsx

import React from "react";
import { RouteOption } from "@/types/routes";
import RouteCard from "./RouteCard";
import EmptyItineraryState from "./EmptyItineraryState";

interface RouteListProps {
  routes: RouteOption[];
  onSelectRoute: (routeId: string) => void;
  favoriteRoutes?: Set<string>;
  onToggleFavorite?: (routeId: string) => void;
  showFavoritesOnly?: boolean;
  activeTab?: string;
  onExploreRoutes?: () => void;
  onBackToInitial?: () => void;
  onSelectDestination?: (city: string) => void;
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
  onExploreRoutes,
  onBackToInitial,
  onSelectDestination,
}) => {
  if (!routes || routes.length === 0) {
    if (activeTab === "My Itineraries") {
      return (
        <div className="h-full">
          <EmptyItineraryState
            onBackToInitial={onBackToInitial}
            onSelectDestination={onSelectDestination}
          />
        </div>
      );
    }
    if (showFavoritesOnly) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[#e8e4df] p-10 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-[#fdf3e3] border-2 border-[#e8d9b8] flex items-center justify-center mb-5">
              <span className="text-4xl leading-none text-[#c9a96e]">☆</span>
            </div>
            <h3 className="text-xl font-bold text-[#0d3d38] mb-2">No favourites yet</h3>
            <p className="text-[#8a8a8a] text-sm mb-6 leading-relaxed">
              Star a route to save it here and revisit it anytime.
            </p>
            {onExploreRoutes && (
              <button
                onClick={onExploreRoutes}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                           bg-[#0d3d38] text-white text-sm font-medium
                           hover:bg-[#1a6b5e] transition-colors duration-150"
              >
                Explore routes <span className="text-[#2d9e8a]">→</span>
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-[#8a8a8a] text-base">
            No routes available. Please try generating again.
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
