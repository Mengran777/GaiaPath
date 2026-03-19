// src/app/App.tsx (MAJOR REWRITE)
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import { RouteList } from "../components/RouteSelection";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import { DayItinerary, Location } from "../types/itinerary";
import { RouteOption } from "@/types/routes";
import { useToast, ToastContainer } from "../components/UI";

// ⭐ Define three app stages ⭐
type AppStage = "initial" | "routes" | "details";

const loadingSteps = [
  { icon: "🌍", title: "Exploring your destination",  subtitle: "Researching local attractions, hidden gems and seasonal highlights..." },
  { icon: "✨", title: "Crafting your routes",         subtitle: "Building 3 personalised itineraries tailored to your preferences..." },
  { icon: "📸", title: "Fetching real photos",         subtitle: "Finding authentic images for each activity and location..." },
];

const LoadingView: React.FC<{ loadingPhase: number; isComplete: boolean }> = ({
  loadingPhase,
  isComplete,
}) => (
  <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
    <div className="relative mb-8">
      <div className="absolute -inset-3 rounded-full animate-ping opacity-10 bg-[#2d9e8a]" />
      <div className="relative w-20 h-20 rounded-full flex items-center justify-center text-4xl bg-[#f0faf8] border-2 border-[#2d9e8a]/30">
        {loadingSteps[loadingPhase].icon}
      </div>
    </div>
    <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">
      {loadingSteps[loadingPhase].title}
    </h3>
    <p className="text-sm text-gray-400 text-center max-w-xs leading-relaxed mb-10">
      {loadingSteps[loadingPhase].subtitle}
    </p>
    <div className="flex items-start gap-6 mb-10">
      {loadingSteps.map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
            i < loadingPhase  ? "bg-[#0d3d38] scale-100"
            : i === loadingPhase ? "bg-[#2d9e8a] scale-125 ring-4 ring-[#2d9e8a]/20"
            : "bg-gray-200 scale-100"
          }`} />
          <span className={`text-[10px] font-medium transition-colors whitespace-nowrap ${
            i < loadingPhase  ? "text-[#0d3d38]"
            : i === loadingPhase ? "text-[#2d9e8a]"
            : "text-gray-300"
          }`}>
            {i === 0 ? "Exploring" : i === 1 ? "Crafting" : "Photos"}
          </span>
        </div>
      ))}
    </div>
    {/* Progress bar */}
    <div className="w-64 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-8 relative">
      <div
        className={isComplete ? "" : "animate-progress-fill"}
        style={
          isComplete
            ? { width: "100%", transition: "width 0.3s ease-in",
                background: "linear-gradient(to right, #2d9e8a, #c9a96e)",
                height: "100%", borderRadius: "9999px" }
            : { background: "linear-gradient(to right, #2d9e8a, #c9a96e)",
                height: "100%", borderRadius: "9999px" }
        }
      />
    </div>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <div className="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-[#2d9e8a]" />
      Usually takes 20–35 seconds
    </div>
  </div>
);

const App: React.FC = () => {
  const pathname = usePathname();
  const { toasts, showToast, dismissToast } = useToast();

  // ⭐ Core state: current stage ⭐
  // ⭐ NextAuth session ⭐
  const { data: session } = useSession();

  const [stage, setStage] = useState<AppStage>("initial");

  // ⭐ Current active tab ⭐
  const [activeTab, setActiveTab] = useState<string>("Home");

  const [isTabSwitching, setIsTabSwitching] = useState(false);

  const [preferences, setPreferences] = useState({
    destination: "",
    travelStartDate: "",
    travelEndDate: "",
    budget: "",
    travelers: "2",
    travelType: [],
    transportation: [],
    activityIntensity: "moderate",
    specialNeeds: [],
  });

  const [smartSearchQuery, setSmartSearchQuery] = useState("");

  // ⭐ Route options state ⭐
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [myItineraries, setMyItineraries] = useState<RouteOption[]>([]); // Store generated routes
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // ⭐ Currently selected route and itinerary ⭐
  const selectedRoute = useMemo(() => {
    return routeOptions.find((route) => route.id === selectedRouteId) || null;
  }, [routeOptions, selectedRouteId]);

  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ⭐ Highlighted day (for map display) ⭐
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);
  const [highlightedLocation, setHighlightedLocation] =
    useState<Location | null>(null);

  // ⭐ Favorites feature state ⭐
  const [favoriteRoutes, setFavoriteRoutes] = useState<Set<string>>(new Set());

  // ⭐ Sync user identity from NextAuth session ⭐
  useEffect(() => {
    if (session?.user) {
      setCurrentUserId(session.user.id ?? null);
      setCurrentUsername(session.user.name ?? null);
    } else if (session === null) {
      // session === null means unauthenticated (not loading)
      handleLogout();
    }
    // session === undefined means still loading — do nothing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ⭐ Load user's favorite routes from database ⭐
  useEffect(() => {
    if (currentUserId) {
      const fetchFavorites = async () => {
        try {
          const response = await fetch("/api/favorites", { method: "GET" });
          if (response.ok) {
            const favoritesData = await response.json();
            const favoriteIds = favoritesData.map((route: any) => route.id);
            setFavoriteRoutes(new Set(favoriteIds));
          } else {
            console.error("Failed to load favorites:", response.statusText);
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      };
      fetchFavorites();
    } else {
      setFavoriteRoutes(new Set());
    }
  }, [currentUserId]);

  const handleLogout = async () => {
    try {
      // Clear custom authToken cookie and NextAuth session
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ redirect: false });

      // Clear client-side state
      setCurrentUserId(null);
      setCurrentUsername(null);
      setFavoriteRoutes(new Set());
      setRouteOptions([]);
      setMyItineraries([]);
      setItinerary([]);

      // Use replace to force redirect to login page
      window.location.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // Redirect to login page even on error
      window.location.replace("/auth/login");
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    setSmartSearchQuery(query);
  };

  // ⭐ Favorites feature handler ⭐
  const toggleFavorite = async (routeId: string) => {
    const isFavorited = favoriteRoutes.has(routeId);
    const action = isFavorited ? "remove" : "add";

    const applyFavorite = (set: Set<string>, add: boolean) => {
      const next = new Set(set);
      add ? next.add(routeId) : next.delete(routeId);
      return next;
    };

    // Optimistic update on favoriteRoutes Set
    setFavoriteRoutes((prev) => applyFavorite(prev, !isFavorited));

    // If removing a favorite while the Favorites tab is active, also remove it
    // from routeOptions immediately so the list stays consistent without a refetch.
    if (isFavorited && activeTab === "Favorites") {
      setRouteOptions((prev) => prev.filter((r) => r.id !== routeId));
    }

    try {
      const route = routeOptions.find((r) => r.id === routeId);
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, routeData: route, action }),
      });

      if (!response.ok) {
        // Roll back both optimistic updates on failure
        setFavoriteRoutes((prev) => applyFavorite(prev, isFavorited));
        if (isFavorited && activeTab === "Favorites") {
          // Restore route to list on rollback (refetch to get correct order)
          handleTabChange("Favorites");
        }
        showToast("Failed to update favorites. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error saving favorite:", error);
      setFavoriteRoutes((prev) => applyFavorite(prev, isFavorited));
      if (isFavorited && activeTab === "Favorites") {
        handleTabChange("Favorites");
      }
      showToast("Failed to update favorites. Please try again.", "error");
    }
  };

  // ⭐ Tab switch handler ⭐
  const handleTabChange = async (tab: string) => {
    setIsTabSwitching(true);
    setActiveTab(tab);

    try {
      if (tab === "Home") {
        setStage("initial");
      } else if (tab === "Favorites") {
        setStage("routes");
        if (!currentUserId) {
          setRouteOptions([]);
          return;
        }
        const response = await fetch("/api/favorites", { method: "GET" });
        if (response.ok) {
          const favoritesData = await response.json();
          const favoriteIds = favoritesData.map((route: any) => route.id);
          setFavoriteRoutes(new Set(favoriteIds));
          setRouteOptions(favoritesData);
        } else {
          setRouteOptions([]);
        }
      } else if (tab === "My Itineraries") {
        setRouteOptions(myItineraries);
        setStage("routes");
      }
    } catch (error) {
      console.error("Error switching tab:", error);
      setRouteOptions([]);
    } finally {
      setIsTabSwitching(false);
    }
  };

  // ⭐ Generate multiple routes ⭐
  const handleGenerateItinerary = async () => {
    if (!preferences.destination.trim()) {
      showToast("Please enter a destination before generating.", "error");
      return;
    }
    if (!preferences.travelStartDate || !preferences.travelEndDate) {
      showToast("Please select your travel dates before generating.", "error");
      return;
    }

    setStage("routes");
    setIsLoading(true);
    setError(null);
    setRouteOptions([]);
    setSelectedRouteId(null);
    setItinerary([]);
    setHighlightedLocation(null);
    setHighlightedDay(null);

    try {
      const response = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...preferences,
          userRequest: smartSearchQuery, // ⭐ Added: send user's custom request
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate routes.");
      }

      const data = await response.json();
      let generatedRoutes = [];
      if (Array.isArray(data)) {
        generatedRoutes = data;
      } else if (Array.isArray(data.routes)) {
        generatedRoutes = data.routes;
      } else {
        console.error("AI response data is not in expected format:", data);
        setError("AI generated an unexpected response format.");
        return;
      }

      // Save generated routes and switch to My Itineraries tab
      setRouteOptions(generatedRoutes);
      setMyItineraries(generatedRoutes);
      setStage("routes");
      setActiveTab("My Itineraries");
    } catch (error: any) {
      console.error("Error generating routes:", error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐ Select a route ⭐
  const handleSelectRoute = useCallback(
    (routeId: string) => {
      setSelectedRouteId(routeId);
      const route = routeOptions.find((r) => r.id === routeId);
      if (route) {
        setItinerary(route.itinerary);
        setStage("details"); // ⭐ Switch to details stage ⭐
      }
    },
    [routeOptions]
  );

  // ⭐ Return from details to route selection ⭐
  const handleBackToRoutes = useCallback(() => {
    setStage("routes");
    setSelectedRouteId(null);
    setItinerary([]);
    setHighlightedDay(null);
    setHighlightedLocation(null);
  }, []);

  // ⭐ Re-edit preferences ⭐
  const handleBackToInitial = useCallback(() => {
    setStage("initial");
    setRouteOptions([]);
    setSelectedRouteId(null);
    setItinerary([]);
    setHighlightedDay(null);
    setHighlightedLocation(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            showToast("Save feature coming soon!", "info");
            break;
          case "f":
            e.preventDefault();
            const input = document.getElementById(
              "smart-search-textarea"
            ) as HTMLTextAreaElement;
            input?.focus();
            break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showToast]);

  const [loadingPhase, setLoadingPhase] = useState(0);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setLoadingComplete(false);
      setLoadingPhase(0);
      const t1 = setTimeout(() => setLoadingPhase(1), 8000);
      const t2 = setTimeout(() => setLoadingPhase(2), 20000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else if (showLoader) {
      setLoadingComplete(true);
      const t = setTimeout(() => setShowLoader(false), 400);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  // ⭐ Handle clicking on a day's itinerary ⭐
  const handleDayClick = useCallback((dayNumber: number) => {
    // Clear location detail popup
    setHighlightedLocation(null);

    // If clicking 0 (header), reset to show all locations
    if (dayNumber === 0) {
      setHighlightedDay(null);
    } else {
      setHighlightedDay(dayNumber);
    }
    // Scroll to map logic can be added here
  }, []);

  // ⭐ Handle clicking an activity card ⭐
  const handleCardClick = useCallback((location: Location) => {
    setHighlightedLocation((prev) => {
      if (
        prev &&
        prev.name === location.name &&
        prev.latitude === location.latitude &&
        prev.longitude === location.longitude
      ) {
        return null;
      }
      return location;
    });
  }, []);

  // ⭐ Currently displayed locations (based on selected day) ⭐
  const displayedLocations = useMemo(() => {
    if (!itinerary || itinerary.length === 0) return [];

    if (highlightedDay !== null) {
      // Only show locations for the selected day
      const day = itinerary.find((d) => d.day === highlightedDay);
      if (!day) return [];

      return day.activities
        .map((activity) => ({
          name: activity.title,
          latitude: activity.latitude || 0,
          longitude: activity.longitude || 0,
          description: activity.description,
          imageUrl: activity.imageUrl,
        }))
        .filter((loc) => loc.latitude !== 0 && loc.longitude !== 0);
    }

    // Show all locations
    return itinerary
      .flatMap((day) =>
        day.activities.map((activity) => ({
          name: activity.title,
          latitude: activity.latitude || 0,
          longitude: activity.longitude || 0,
          description: activity.description,
          imageUrl: activity.imageUrl,
        }))
      )
      .filter((loc) => loc.latitude !== 0 && loc.longitude !== 0);
  }, [itinerary, highlightedDay]);

  // ⭐ Sidebar content (changes based on stage) ⭐
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {stage === "details" ? (
        // Stage 3: Only show a back button
        <button
          onClick={handleBackToRoutes}
          className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors"
        >
          ← Back to Routes
        </button>
      ) : activeTab === "Favorites" ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Your Favorite Routes
          </h2>
          <p className="text-gray-600">
            These are the routes you've saved for future reference.
          </p>
        </div>
      ) : (
        // Home and My Itineraries: sticky top bar + scrollable form + sticky generate button
        <div className="flex flex-col h-full bg-[#f5f2ee]">
          {/* Sticky top bar */}
          <div className="sticky top-0 z-10 bg-[#f5f2ee]/95 backdrop-blur border-b border-[#e2ddd8] px-5 py-4 flex-shrink-0">
            <h2 className="font-semibold text-xl text-[#1a1a1a]">Plan Your Trip</h2>
            <p className="text-xs text-[#8a8a8a] mt-0.5">Tell us about your dream journey</p>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 custom-scrollbar">
            <SmartSearch
              query={smartSearchQuery}
              setQuery={setSmartSearchQuery}
              onSearch={handleSmartSearch}
            />
            <PreferenceForm
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </div>

          {/* Sticky generate button */}
          <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-[#f5f2ee] to-transparent flex-shrink-0">
            <GenerateButton
              onClick={handleGenerateItinerary}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}
    </div>
  );

  // ⭐ Main Panel content (changes based on stage) ⭐
  const mainPanelContent = (
    <div className="relative h-full">
      {isTabSwitching && (
        <div className="absolute inset-0 bg-[#0a1a17] z-10 flex items-center justify-center rounded-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d9e8a]" />
        </div>
      )}
      {stage === "routes" && (
        <div className="h-full min-h-0 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
          {showLoader ? (
            <LoadingView loadingPhase={loadingPhase} isComplete={loadingComplete} />
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Something went wrong
                </h3>
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={handleBackToInitial}
                  className="px-6 py-2 bg-[#0d3d38] text-white rounded-xl hover:bg-[#1a6b5e] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <RouteList
              routes={routeOptions}
              onSelectRoute={handleSelectRoute}
              favoriteRoutes={favoriteRoutes}
              onToggleFavorite={toggleFavorite}
              showFavoritesOnly={activeTab === "Favorites"}
              activeTab={activeTab}
              onExploreRoutes={() => handleTabChange("Home")}
              onBackToInitial={() => handleTabChange("Home")}
              onSelectDestination={(city) => {
                handlePreferenceChange("destination", city);
                handleTabChange("Home");
              }}
            />
          )}
        </div>
      )}

      {stage === "details" && (
        <div className="flex flex-col md:flex-row gap-4 h-full min-h-0">
          <div className="flex-1 min-h-0 min-w-0 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {error && (
                <p className="text-red-500 text-center py-8">Error: {error}</p>
              )}
              {!error && itinerary.length > 0 && selectedRouteId && (
                <ItineraryPanel
                  itinerary={itinerary}
                  onActivityClick={handleCardClick}
                  onDayClick={handleDayClick}
                  highlightedDay={highlightedDay}
                  routeId={selectedRouteId}
                  isFavorite={favoriteRoutes.has(selectedRouteId)}
                  onToggleFavorite={() => toggleFavorite(selectedRouteId)}
                  onBackToRoutes={handleBackToRoutes}
                  destination={preferences.destination}
                />
              )}
            </div>
          </div>

          <div className="h-64 md:h-auto md:flex-1 min-h-0 min-w-0 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-semibold text-gray-800">
                📍 Route Map
              </h3>
            </div>
            <div className="flex-1 p-6 pt-4 min-h-0">
              <MapView
                locations={displayedLocations}
                highlightedLocation={highlightedLocation}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="App">
      <PageContainer
        sidebar={sidebarContent}
        mainContent={mainPanelContent}
        currentUserId={currentUsername}
        onLogout={handleLogout}
        pathname={pathname}
        stage={stage}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
