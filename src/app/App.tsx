// src/app/App.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import TripWizard from "../components/Wizard/TripWizard";
import GenerateButton from "../components/Sidebar/GenerateButton";
import { RouteList } from "../components/RouteSelection";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import { DayItinerary, Location } from "../types/itinerary";
import { RouteOption } from "@/types/routes";
import { useToast, ToastContainer } from "../components/UI";
import { Loader2, TriangleAlert, MapPin } from "lucide-react";

// ⭐ Define three app stages ⭐
type AppStage = "initial" | "routes" | "details";

// Placeholder shown while routes generate: three card skeletons shaped like RouteCard
const LoadingView: React.FC = () => (
  <div className="h-full overflow-hidden" role="status" aria-live="polite">
    <div className="px-6 pt-6 pb-2">
      <div className="flex items-center gap-2 font-display text-2xl font-bold text-brand-900 mb-1">
        <Loader2 size={20} className="animate-spin text-brand-500" aria-hidden="true" />
        Building your routes…
      </div>
      <p className="text-ink-muted text-sm">Three options, usually ready in 10–20 seconds.</p>
    </div>
    <div className="px-6 pb-6 pt-4 grid grid-cols-1 gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-white overflow-hidden animate-pulse">
          <div className="h-[160px] bg-surface-dim" />
          <div className="p-5 space-y-3">
            <div className="h-5 w-2/3 rounded bg-surface-dim" />
            <div className="h-3 w-full rounded bg-surface" />
            <div className="h-3 w-4/5 rounded bg-surface" />
            <div className="flex gap-2 pt-1">
              <div className="h-6 w-24 rounded-full bg-surface" />
              <div className="h-6 w-20 rounded-full bg-surface" />
              <div className="h-6 w-28 rounded-full bg-surface" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const App: React.FC = () => {
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
    arrivalTime: "afternoon",
    departureTime: "afternoon",
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

  // (no DB-save state needed — itinerary changes are session-only)

  // ⭐ Dev quick-fill hook — ref is initialized null to avoid TDZ; ⭐
  // the no-dep effect below keeps it pointing to the latest function.
  const generateRef = useRef<((p?: typeof preferences) => void) | null>(null);

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

  // ⭐ Save itinerary handler ⭐
  // Edits always update the session copy (My Itineraries). If the route is
  // favorited, the stored favorite is updated too — favorites are the only
  // thing persisted to the DB.
  const handleSaveItinerary = (updatedItinerary: DayItinerary[]) => {
    if (!selectedRouteId) return;
    const routeId = selectedRouteId;

    if (favoriteRoutes.has(routeId)) {
      const route = routeOptions.find((r) => r.id === routeId);
      if (route) {
        fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routeId,
            routeData: { ...route, itinerary: updatedItinerary },
            action: "add",
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error(res.statusText);
          })
          .catch((error) => {
            console.error("Error updating favorite:", error);
            showToast("Couldn't save your edits to Favorites. Please try again.", "error");
          });
      }
    }

    setItinerary(updatedItinerary); // reset hasChanges baseline in ItineraryPanel
    setRouteOptions((prev) =>
      prev.map((r) =>
        r.id === selectedRouteId ? { ...r, itinerary: updatedItinerary } : r
      )
    );
    setMyItineraries((prev) =>
      prev.map((r) =>
        r.id === selectedRouteId ? { ...r, itinerary: updatedItinerary } : r
      )
    );
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
        // Session-only: just show whatever was generated this session
        setStage("routes");
        setRouteOptions(myItineraries);
      }
    } catch (error) {
      console.error("Error switching tab:", error);
    } finally {
      setIsTabSwitching(false);
    }
  };

  // ⭐ Generate multiple routes ⭐
  const handleGenerateItinerary = async (prefOverride?: typeof preferences) => {
    const prefs = prefOverride ?? preferences;
    if (!prefs.destination.trim()) {
      showToast("Please enter a destination before generating.", "error");
      return;
    }
    if (!prefs.travelStartDate || !prefs.travelEndDate) {
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
          ...prefs,
          userRequest: smartSearchQuery,
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

  // Keep ref pointing to the latest handleGenerateItinerary after every render
  useEffect(() => { generateRef.current = handleGenerateItinerary; });
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    (window as any).__gaiaFill = (p: typeof preferences) => {
      setPreferences(p);
      generateRef.current?.(p);
    };
    return () => { delete (window as any).__gaiaFill; };
  }, []);

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
            if (stage === "details" && selectedRouteId) {
              showToast("Use the Save button in the itinerary panel.", "info");
            }
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
  // Sidebar: the trip planning form (PageContainer hides it on Favorites and the details view)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="border-b border-line px-5 py-4 flex-shrink-0">
        <h2 className="font-semibold text-lg text-ink">Plan your trip</h2>
        <p className="text-sm text-ink-muted mt-0.5">Where to, and what are you into?</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 custom-scrollbar">
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

      <div className="border-t border-line p-4 flex-shrink-0">
        <GenerateButton
          onClick={() => handleGenerateItinerary()}
          isLoading={isLoading}
        />
      </div>
    </div>
  );

  // Initial stage: step-by-step centered wizard instead of the full form
  const wizardContent = (
    <TripWizard
      preferences={preferences}
      onPreferenceChange={handlePreferenceChange}
      note={smartSearchQuery}
      onNoteChange={setSmartSearchQuery}
      onGenerate={() => handleGenerateItinerary()}
      isLoading={isLoading}
    />
  );

  // ⭐ Main Panel content (changes based on stage) ⭐
  const mainPanelContent = (
    <div className="relative h-full">
      {isTabSwitching && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
          <Loader2 size={28} className="animate-spin text-brand-500" aria-hidden="true" />
        </div>
      )}
      {stage === "routes" && (
        <div className="h-full min-h-0 bg-white border border-line rounded-xl overflow-hidden flex flex-col">
          {isLoading ? (
            <LoadingView />
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4 mx-auto">
                  <TriangleAlert size={30} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Something went wrong
                </h3>
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={handleBackToInitial}
                  className="px-5 h-10 bg-brand-900 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
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
          <div className="flex-1 min-h-0 min-w-0 bg-white border border-line rounded-xl overflow-hidden flex flex-col">
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
                  transportationModes={preferences.transportation}
                  userId={currentUserId}
                  onSave={handleSaveItinerary}
                  isSaving={false}
                />
              )}
            </div>
          </div>

          <div className="h-64 md:h-auto md:flex-1 min-h-0 min-w-0 bg-white border border-line rounded-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-line flex-shrink-0">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <MapPin size={16} className="text-brand-500" aria-hidden="true" />
                Route map
              </h3>
            </div>
            <div className="flex-1 p-3 min-h-0">
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
        sidebar={stage === "initial" ? wizardContent : sidebarContent}
        mainContent={mainPanelContent}
        username={currentUsername}
        onLogout={handleLogout}
        stage={stage}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
