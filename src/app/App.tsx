// src/app/App.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import TripWizard, { type DestinationPhoto } from "../components/Wizard/TripWizard";
import GenerateButton from "../components/Sidebar/GenerateButton";
import { RouteList } from "../components/RouteSelection";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import PhotoViewer, { type PhotoViewState } from "../components/MainPanel/PhotoViewer";
import { useDayRoute } from "@/lib/travelTimes";
import { DayItinerary, Location } from "../types/itinerary";
import { RouteOption } from "@/types/routes";
import { useToast, ToastContainer } from "../components/UI";
import { Loader2 } from "lucide-react";
import RoutesLoading from "../components/RouteSelection/RoutesLoading";
import SaveAccountPrompt from "../components/Auth/SaveAccountPrompt";

// Guest hand-off: when a signed-out visitor goes to log in or sign up, their
// in-progress trip is parked in sessionStorage and restored once they're back
// (and the route they tried to save gets saved).
const HANDOFF_KEY = "gaia:guest-handoff";
const HANDOFF_MAX_AGE_MS = 60 * 60 * 1000;

// ⭐ Define three app stages ⭐
type AppStage = "initial" | "routes" | "details";

const App: React.FC = () => {
  const { toasts, showToast, dismissToast } = useToast();

  // ⭐ Core state: current stage ⭐
  // ⭐ NextAuth session ⭐
  const { data: session, status: sessionStatus } = useSession();
  const [savePromptRouteId, setSavePromptRouteId] = useState<string | null>(null);

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
  // The trip's photo (see ensureDestinationPhoto below)
  const [destinationPhoto, setDestinationPhoto] = useState<DestinationPhoto | null>(null);
  const photoRequestFor = useRef<string | null>(null);

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
  // Signed out is a normal state (guest mode), not a reason to redirect.
  useEffect(() => {
    if (session?.user) {
      setCurrentUserId(session.user.id ?? null);
      setCurrentUsername(session.user.name ?? null);
    } else if (sessionStatus === "unauthenticated") {
      setCurrentUserId(null);
      setCurrentUsername(null);
    }
  }, [session, sessionStatus]);

  // Keep this tab's trip across refreshes: routes, preferences and note live in
  // sessionStorage (cleared when the tab closes). Restored once on load.
  const SESSION_KEY = "gaia:session";
  const restoredSession = useRef(false);
  useEffect(() => {
    if (restoredSession.current) return;
    restoredSession.current = true;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.preferences) setPreferences(saved.preferences);
      if (typeof saved?.note === "string") setSmartSearchQuery(saved.note);
      if (Array.isArray(saved?.routes) && saved.routes.length > 0) setMyItineraries(saved.routes);
      if (saved?.destinationPhoto?.url) {
        setDestinationPhoto(saved.destinationPhoto);
        photoRequestFor.current = saved.destinationPhoto.destination;
      }
    } catch {
      // storage unavailable or corrupt: start fresh
    }
  }, []);
  useEffect(() => {
    if (!restoredSession.current) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ preferences, note: smartSearchQuery, routes: myItineraries, destinationPhoto }));
    } catch {
      // ignore (private mode / quota)
    }
  }, [preferences, smartSearchQuery, myItineraries, destinationPhoto]);

  // Back from log in / sign up: restore the guest's trip and save the route
  // they tried to save before signing in.
  useEffect(() => {
    if (!currentUserId) return;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(HANDOFF_KEY);
      sessionStorage.removeItem(HANDOFF_KEY);
    } catch {
      return;
    }
    if (!raw) return;
    let handoff: any;
    try {
      handoff = JSON.parse(raw);
    } catch {
      return;
    }
    if (!handoff || Date.now() - (handoff.savedAt ?? 0) > HANDOFF_MAX_AGE_MS) return;

    if (handoff.preferences) setPreferences(handoff.preferences);
    if (typeof handoff.note === "string") setSmartSearchQuery(handoff.note);
    const routes: RouteOption[] = Array.isArray(handoff.routes) ? handoff.routes : [];
    if (routes.length > 0) {
      setMyItineraries(routes);
      setRouteOptions(routes);
      setStage("routes");
      setActiveTab("My Itineraries");
    }
    const pending: RouteOption | null = handoff.pendingFavorite ?? null;
    if (pending?.id) {
      fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: pending.id, routeData: pending, action: "add" }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText);
          setFavoriteRoutes((prev) => new Set(prev).add(pending.id));
          showToast("Saved to your trips.", "success");
        })
        .catch(() => showToast("Couldn't save that trip. Try saving it again.", "error"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

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

      // Back to the planner, now as a guest
      window.location.replace("/");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/");
    }
  };

  // Guest going to log in / sign up: park the current trip, then navigate
  const goToAuth = (path: "/auth/login" | "/auth/register", pendingRouteId?: string | null) => {
    try {
      const routes = myItineraries.length > 0 ? myItineraries : routeOptions;
      const pending = pendingRouteId
        ? routeOptions.find((r) => r.id === pendingRouteId) ?? routes.find((r) => r.id === pendingRouteId) ?? null
        : null;
      sessionStorage.setItem(
        HANDOFF_KEY,
        JSON.stringify({ savedAt: Date.now(), preferences, note: smartSearchQuery, routes, pendingFavorite: pending })
      );
    } catch {
      // Storage unavailable (private mode): sign-in still works, the trip just isn't carried over
    }
    window.location.href = path;
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    setSmartSearchQuery(query);
  };

  // ⭐ Favorites feature handler ⭐
  const toggleFavorite = async (routeId: string) => {
    if (!currentUserId) {
      setSavePromptRouteId(routeId);
      return;
    }
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

  // Every itinerary edit updates the session copy (so "All routes" and back
  // keeps it). Favorited routes are also saved to the account, debounced.
  const favoriteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleItineraryDraft = (updatedItinerary: DayItinerary[]) => {
    if (!selectedRouteId) return;
    const routeId = selectedRouteId;
    const apply = (list: RouteOption[]) =>
      list.map((r) => (r.id === routeId ? { ...r, itinerary: updatedItinerary } : r));
    setRouteOptions(apply);
    setMyItineraries(apply);

    if (favoriteRoutes.has(routeId)) {
      const route = routeOptions.find((r) => r.id === routeId);
      if (favoriteSaveTimer.current) clearTimeout(favoriteSaveTimer.current);
      favoriteSaveTimer.current = setTimeout(() => {
        if (!route) return;
        fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId, routeData: { ...route, itinerary: updatedItinerary }, action: "add" }),
        }).catch(() => showToast("Couldn't save your edits to Saved. Try again.", "error"));
      }, 900);
    }
  };

  // The trip's photo: the gallery photo picked in step 1, or, for a typed city,
  // one fetched from Unsplash as soon as step 1 is done, so the results
  // sidebar can show it while the routes are still generating.
  const ensureDestinationPhoto = (destination: string) => {
    const dest = destination.trim();
    if (!dest || destinationPhoto?.destination === dest || photoRequestFor.current === dest) return;
    photoRequestFor.current = dest;
    fetch("/api/activity-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: dest }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (photoRequestFor.current !== dest || !d?.imageUrl) return;
        setDestinationPhoto({
          destination: dest,
          // The search returns a small size; ask for a sharper one for the header
          url: String(d.imageUrl).replace(/([?&]w=)\d+/, "$1900"),
          photographerName: d.imageAttribution?.photographerName ?? "",
          photographerUrl: d.imageAttribution?.photographerUrl ?? "",
        });
      })
      .catch(() => {
        if (photoRequestFor.current === dest) photoRequestFor.current = null;
      });
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

    ensureDestinationPhoto(prefs.destination);
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
    // Clear location detail popup and bring the map back
    setHighlightedLocation(null);
    setPhotoView(null);

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
    setPhotoView(null);
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

  // Title and one-line subtitle for the itinerary page
  const selectedRoute = routeOptions.find((r) => r.id === selectedRouteId);
  const routeSubtitle = (() => {
    const fmt = (s: string) =>
      new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const place = preferences.destination.trim();
    if (place && preferences.travelStartDate && preferences.travelEndDate) {
      return `${place}, ${fmt(preferences.travelStartDate)} — ${fmt(preferences.travelEndDate)}`;
    }
    return selectedRoute ? `${selectedRoute.days} ${selectedRoute.days === 1 ? "day" : "days"}` : undefined;
  })();

  // The map follows the edited trip (drags, removals, AI changes), not the
  // itinerary as first opened
  const liveItinerary = routeOptions.find((r) => r.id === selectedRouteId)?.itinerary ?? itinerary;

  // ⭐ Currently displayed locations (based on selected day) ⭐
  const displayedLocations = useMemo(() => {
    const itinerary = liveItinerary;
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
  }, [liveItinerary, highlightedDay]);

  // A single day selected: its route, travel times and a one-line summary
  const singleDay = highlightedDay !== null && highlightedDay > 0;
  const dayRoute = useDayRoute(singleDay ? displayedLocations : [], (preferences.transportation as string[]).includes("car"));
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const mapSummary = singleDay
    ? {
        title: `Day ${ROMAN[(highlightedDay ?? 1) - 1] ?? highlightedDay} · ${displayedLocations.length} ${displayedLocations.length === 1 ? "stop" : "stops"}`,
        detail: dayRoute && dayRoute.totalKm > 0
          ? `${dayRoute.totalKm.toFixed(1)} km · ${dayRoute.movingMin} min moving`
          : undefined,
      }
    : displayedLocations.length > 0
    ? { title: `Whole trip · ${displayedLocations.length} stops`, detail: "Choose a day to see its route" }
    : null;

  // Right-hand pane: the map, or a stop's photos when one is opened
  const [photoView, setPhotoView] = useState<PhotoViewState | null>(null);
  useEffect(() => {
    if (stage !== "details") setPhotoView(null);
  }, [stage]);
  // Wide screens can hide the map so the itinerary reads full width (kept for the session)
  const [mapHidden, setMapHidden] = useState(false);
  useEffect(() => {
    try { setMapHidden(sessionStorage.getItem("gaia:map-hidden") === "1"); } catch {}
  }, []);
  const toggleMap = () => {
    setMapHidden((h) => {
      try { sessionStorage.setItem("gaia:map-hidden", h ? "0" : "1"); } catch {}
      return !h;
    });
    setPhotoView(null);
  };

  // A marker clicked on the map: open that stop's row in the list
  const [focusStop, setFocusStop] = useState<{ name: string; latitude: number; longitude: number; nonce: number } | null>(null);
  const handleMarkerClick = useCallback((location: Location) => {
    setHighlightedLocation(location);
    setFocusStop({ name: location.name, latitude: location.latitude, longitude: location.longitude, nonce: Date.now() });
  }, []);

  const openPhotosInPane = (view: PhotoViewState) => {
    // Phones have no side pane, and a hidden map leaves none: use the fullscreen viewer
    if (mapHidden || typeof window === "undefined" || !window.matchMedia("(min-width: 768px)").matches) return false;
    setPhotoView(view);
    return true;
  };

  // Sidebar photo: the trip's own photo when it matches the current destination,
  // else the first route's cover
  const tripPhoto =
    destinationPhoto && destinationPhoto.destination === preferences.destination.trim()
      ? {
          url: destinationPhoto.url,
          attribution: destinationPhoto.photographerName
            ? { photographerName: destinationPhoto.photographerName, photographerUrl: destinationPhoto.photographerUrl }
            : null,
        }
      : routeOptions[0]?.coverImageUrl
      ? { url: routeOptions[0].coverImageUrl, attribution: routeOptions[0].coverImageAttribution ?? null }
      : null;

  // ⭐ Sidebar content (changes based on stage) ⭐
  // Sidebar: the trip planning form (PageContainer hides it on Favorites and the details view)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pr-2 pb-4 custom-scrollbar">
        <PreferenceForm
          preferences={preferences}
          onPreferenceChange={handlePreferenceChange}
          coverImageUrl={tripPhoto?.url ?? null}
          coverAttribution={tripPhoto?.attribution ?? null}
        />
        <div className="pt-6">
          <SmartSearch
            query={smartSearchQuery}
            setQuery={setSmartSearchQuery}
            onSearch={handleSmartSearch}
          />
        </div>
      </div>

      <div className="pt-4 flex-shrink-0">
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
      onDestinationPhoto={(photo) => {
        photoRequestFor.current = photo.destination;
        setDestinationPhoto(photo);
      }}
      onDestinationConfirmed={ensureDestinationPhoto}
    />
  );

  // ⭐ Main Panel content (changes based on stage) ⭐
  const mainPanelContent = (
    <div className="relative h-full">
      {isTabSwitching && (
        <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-ink" aria-hidden="true" />
        </div>
      )}
      {stage === "routes" && (
        <div className="h-full min-h-0 bg-white overflow-hidden flex flex-col">
          {isLoading ? (
            <RoutesLoading />
          ) : error ? (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center max-w-md">
                <p className="eyebrow">Something went wrong</p>
                <h3 className="mt-3 font-display text-[36px] leading-[1.06] uppercase text-ink">We couldn&apos;t build your routes</h3>
                <p className="mt-4 text-sm text-red-700">{error}</p>
                <button type="button" onClick={handleBackToInitial} className="btn-ink mt-8">
                  Try again
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
              isGuest={sessionStatus === "unauthenticated"}
              onCreateAccount={() => goToAuth("/auth/register")}
              onLogIn={() => goToAuth("/auth/login")}
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
        <div className="relative flex flex-col md:flex-row gap-10 h-full min-h-0">
          {/* Same corner in both states: over the map, or above the empty right margin */}
          <button
            type="button"
            onClick={toggleMap}
            aria-pressed={mapHidden}
            className="hidden md:block absolute top-0 right-0 z-20 bg-white px-3 py-2 text-[11px] tracking-[0.08em] uppercase text-ink-soft hover:text-ink transition-colors duration-300 active:scale-[0.97]"
          >
            {mapHidden ? "Show map" : "Hide map"}
          </button>
          <div className="flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto pr-3 pb-6 custom-scrollbar">
              <div className={mapHidden ? "md:max-w-[760px] md:mx-auto md:pr-24 lg:pr-0" : undefined}>
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
                  onDraftChange={handleItineraryDraft}
                  onOpenPhotos={openPhotosInPane}
                  routeTitle={selectedRoute?.title}
                  routeSubtitle={routeSubtitle}
                  focusStop={focusStop}
                />
              )}
              </div>
            </div>
          </div>

          <div className={`h-64 md:h-auto md:flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col pb-6 ${mapHidden ? "md:hidden" : ""}`}>
            <div className="relative flex-1 min-h-0">
              {/* The map stays mounted underneath so it keeps its position */}
              <div
                className={`absolute inset-0 bg-surface-dim transition-opacity duration-500 ease-editorial ${photoView ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                aria-hidden={photoView ? true : undefined}
              >
                <MapView
                  locations={displayedLocations}
                  highlightedLocation={highlightedLocation}
                  dayRoute={singleDay ? dayRoute : null}
                  numbered={singleDay}
                  summary={mapSummary}
                  onMarkerClick={handleMarkerClick}
                />
              </div>
              {photoView && (
                <div className="absolute inset-0 animate-card-enter">
                  <PhotoViewer
                    view={photoView}
                    onIndexChange={(index) => setPhotoView((v) => (v ? { ...v, index } : v))}
                    onBack={() => setPhotoView(null)}
                  />
                </div>
              )}
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
        isGuest={sessionStatus === "unauthenticated"}
        onAuthNavigate={(path) => goToAuth(path)}
        stage={stage}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <SaveAccountPrompt
        open={savePromptRouteId !== null}
        onClose={() => setSavePromptRouteId(null)}
        onCreateAccount={() => goToAuth("/auth/register", savePromptRouteId)}
        onLogIn={() => goToAuth("/auth/login", savePromptRouteId)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default App;
