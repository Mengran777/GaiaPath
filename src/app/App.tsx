// src/app/App.tsx (MAJOR REWRITE)
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import { RouteList } from "../components/RouteSelection";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";
import { DayItinerary, Location } from "../types/itinerary";
import { RouteOption } from "@/types/routes";
import { useToast, ToastContainer } from "../components/UI";

// ⭐ Define three app stages ⭐
type AppStage = "initial" | "routes" | "details";

const App: React.FC = () => {
  const pathname = usePathname();
  const { toasts, showToast, dismissToast } = useToast();

  // ⭐ Core state: current stage ⭐
  const [stage, setStage] = useState<AppStage>("initial");

  // ⭐ Current active tab ⭐
  const [activeTab, setActiveTab] = useState<string>("Home");

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

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/me");
        if (!response.ok) {
          handleLogout();
          return;
        }
        const user = await response.json();
        setCurrentUserId(user.id);
        setCurrentUsername(user.username);
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

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
      // Call server-side logout API to clear httpOnly cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

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

    // Optimistic update
    setFavoriteRoutes((prev) => applyFavorite(prev, !isFavorited));

    try {
      const route = routeOptions.find((r) => r.id === routeId);
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, routeData: route, action }),
      });

      if (!response.ok) {
        setFavoriteRoutes((prev) => applyFavorite(prev, isFavorited));
        showToast("Failed to update favorites. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error saving favorite:", error);
      setFavoriteRoutes((prev) => applyFavorite(prev, isFavorited));
      showToast("Failed to update favorites. Please try again.", "error");
    }
  };

  // ⭐ Tab switch handler ⭐
  const handleTabChange = async (tab: string) => {
    setActiveTab(tab);

    if (tab === "Home") {
      setStage("initial");
    } else if (tab === "Favorites") {
      if (!currentUserId) {
        setRouteOptions([]);
        setStage("routes");
        return;
      }
      try {
        const response = await fetch("/api/favorites", { method: "GET" });
        if (response.ok) {
          const favoritesData = await response.json();
          const favoriteIds = favoritesData.map((route: any) => route.id);
          setFavoriteRoutes(new Set(favoriteIds));
          setRouteOptions(favoritesData);
        } else {
          setRouteOptions([]);
        }
      } catch (error) {
        console.error("Error loading favorite routes:", error);
        setRouteOptions([]);
      }
      setStage("routes");
    } else if (tab === "My Itineraries") {
      setRouteOptions(myItineraries.length > 0 ? myItineraries : []);
      setStage(myItineraries.length > 0 ? "routes" : "initial");
    } else if (tab === "Community") {
      setRouteOptions([]);
      setStage("routes");
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
      ) : activeTab === "Community" ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-6">
          <div className="text-6xl mb-4">🌐</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Community</h2>
          <p className="text-gray-600">
            Share and discover routes from adventurers worldwide.
          </p>
          <span className="mt-4 px-4 py-1.5 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
            Coming Soon
          </span>
        </div>
      ) : (
        // Home and My Itineraries: show full form
        <>
          <SmartSearch
            query={smartSearchQuery}
            setQuery={setSmartSearchQuery}
            onSearch={handleSmartSearch}
          />
          <PreferenceForm
            preferences={preferences}
            onPreferenceChange={handlePreferenceChange}
          />
          <GenerateButton
            onClick={handleGenerateItinerary}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  );

  // ⭐ Main Panel content (changes based on stage) ⭐
  const mainPanelContent = (
    <>
      {stage === "initial" && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">🌍</div>
            <h2 className="text-3xl font-bold mb-2">
              Welcome to Gaia Travel Assistant
            </h2>
            <p className="text-lg opacity-90">
              Fill in your preferences and generate your perfect itinerary
            </p>
          </div>
        </div>
      )}

      {stage === "routes" && (
        <div className="h-full bg-white rounded-2xl shadow-xl p-6">
          {activeTab === "Community" ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-7xl mb-6">🌐</div>
                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  Community Coming Soon
                </h2>
                <p className="text-gray-500 text-lg">
                  Share and discover travel routes from adventurers around the
                  world. Stay tuned!
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Something went wrong
                </h3>
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={handleBackToInitial}
                  className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <RouteList
              routes={
                activeTab === "Favorites"
                  ? routeOptions.filter((route) => favoriteRoutes.has(route.id))
                  : routeOptions
              }
              onSelectRoute={handleSelectRoute}
              isLoading={isLoading}
              favoriteRoutes={favoriteRoutes}
              onToggleFavorite={toggleFavorite}
              showFavoritesOnly={activeTab === "Favorites"}
              activeTab={activeTab}
            />
          )}
        </div>
      )}

      {stage === "details" && (
        <div className="flex gap-4 h-full">
          <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
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
                />
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-0">
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
    </>
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
      <FloatingActions />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
