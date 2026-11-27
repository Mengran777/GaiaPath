// src/components/RouteSelection/RouteList.tsx

import React from "react";
import { RouteOption } from "@/types/routes";
import RouteCard from "./RouteCard";
import EmptyItineraryState from "./EmptyItineraryState";
import { useScrollFade } from "@/lib/useScrollFade";


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
  /** Signed out: the Saved tab explains accounts instead of showing an empty list */
  isGuest?: boolean;
  onCreateAccount?: () => void;
  onLogIn?: () => void;
  /** Phones (no sidebar there): "Paris, Dec 10 — Dec 11" with a link back to the planner */
  tripLine?: string;
  onChangeTrip?: () => void;
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
  isGuest = false,
  onCreateAccount,
  onLogIn,
  tripLine,
  onChangeTrip,
}) => {
  const scrollRef = useScrollFade<HTMLDivElement>();
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
    if (showFavoritesOnly && isGuest) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-md text-center">
            <p className="eyebrow">Saved</p>
            <h3 className="mt-3 font-display text-[44px] leading-[1.04] uppercase text-ink">Keep the trips you love</h3>
            <p className="mt-4 text-sm text-ink-muted leading-relaxed">
              A free account keeps your routes here, on any device.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
              <button type="button" onClick={onCreateAccount} className="btn-ink">
                Create account
              </button>
              <button type="button" onClick={onLogIn} className="link-quiet text-[13px]">
                Log in
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (showFavoritesOnly) {
      return (
        <div className="flex items-center justify-center h-full p-6">
          <div className="w-full max-w-md text-center">
            <p className="eyebrow">Saved</p>
            <h3 className="mt-3 font-display text-[44px] leading-[1.04] uppercase text-ink">Nothing kept yet</h3>
            <p className="mt-4 text-sm text-ink-muted leading-relaxed">
              Save a route and it will wait for you here.
            </p>
            {onExploreRoutes && (
              <button type="button" onClick={onExploreRoutes} className="btn-ink mt-8">
                Plan a trip
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-ink-muted text-base">
            No routes this time. Try once more.
          </p>
        </div>
      </div>
    );
  }

  const getHeaderContent = () => {
    if (activeTab === "Favorites") {
      return {
        title: "Saved trips",
        description: `${routes.length} ${routes.length === 1 ? "trip" : "trips"}`,
      };
    }
    if (activeTab === "My Itineraries") {
      return {
        title: "Your routes",
        description: `${routes.length} ${routes.length === 1 ? "option" : "options"}`,
      };
    }
    return {
      title: "Choose your way",
      description: `${routes.length} ${routes.length === 1 ? "option" : "options"}`,
    };
  };

  const { title, description } = getHeaderContent();

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto scroll-fade pr-1">
      <div className="flex items-end justify-between gap-4 border-b border-ink pb-3 mb-8">
        <h2 className={`font-display uppercase text-ink leading-[1.04] ${activeTab === "Favorites" ? "text-[44px]" : "text-[30px]"}`}>
          {title}
        </h2>
        <p className="eyebrow pb-1">{description}</p>
      </div>
      {tripLine && onChangeTrip && activeTab !== "Favorites" && (
        <div className="md:hidden -mt-5 mb-8 flex items-baseline justify-between gap-4">
          <span className="font-display text-[17px] text-ink-soft truncate">{tripLine}</span>
          <button type="button" onClick={onChangeTrip} className="link-quiet text-xs tracking-[0.06em] uppercase flex-shrink-0">
            Change trip
          </button>
        </div>
      )}

      <div className={`pb-10 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-12 ${activeTab === "Favorites" ? "2xl:grid-cols-4" : ""}`}>
        {(() => {
          // Prefer route-level Unsplash cover; fall back to first unique Wikipedia activity image.
          // Attribution only ever accompanies the Unsplash cover, never the Wikipedia fallback.
          const usedImages = new Set<string>();
          const coverImages = routes.map((route) => {
            if (route.coverImageUrl !== undefined) {
              return { url: route.coverImageUrl, attribution: route.coverImageAttribution ?? null };
            }
            for (const day of route.itinerary ?? []) {
              for (const activity of day.activities ?? []) {
                if (activity.imageUrl && !usedImages.has(activity.imageUrl)) {
                  usedImages.add(activity.imageUrl);
                  return { url: activity.imageUrl, attribution: null };
                }
              }
            }
            return { url: null, attribution: null };
          });

          return routes.map((route, index) => (
            <div
              key={`${activeTab}-${route.id || index}`}
              className="animate-card-enter"
              style={{
                animationDelay: `${STAGGER_DELAYS[Math.min(index, STAGGER_DELAYS.length - 1)]}s`,
              }}
            >
              <RouteCard
                route={route}
                index={activeTab === "Favorites" ? undefined : index}
                onSelect={onSelectRoute}
                isFavorite={favoriteRoutes.has(route.id)}
                onToggleFavorite={onToggleFavorite}
                coverImageUrl={coverImages[index].url}
                coverImageAttribution={coverImages[index].attribution}
              />
            </div>
          ));
        })()}
      </div>
    </div>
  );
};

export default RouteList;
