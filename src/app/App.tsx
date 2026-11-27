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
import RouteOpening, { type OpeningHighlight } from "../components/MainPanel/RouteOpening";
import { usePhotoTone } from "@/lib/photoTone";
import { useScrollFade } from "@/lib/useScrollFade";
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
          showToast("Kept with your trips.", "success");
        })
        .catch(() => showToast("That trip slipped away. Try saving it again.", "error"));
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
        showToast("Couldn’t update your saved trips. Try again.", "error");
      }
    } catch (error) {
      console.error("Error saving favorite:", error);
      setFavoriteRoutes((prev) => applyFavorite(prev, isFavorited));
      if (isFavorited && activeTab === "Favorites") {
        handleTabChange("Favorites");
      }
      showToast("Couldn’t update your saved trips. Try again.", "error");
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

  // Only the latest generation may update the page: going home or starting a
  // new trip cancels the one in flight, so a late reply can't take over.
  const generationRef = useRef<{ id: number; controller: AbortController | null }>({ id: 0, controller: null });
  const cancelGeneration = () => {
    generationRef.current.controller?.abort();
    generationRef.current = { id: generationRef.current.id + 1, controller: null };
    setIsLoading(false);
  };

  // ⭐ Tab switch handler ⭐
  const handleTabChange = async (tab: string) => {
    setIsTabSwitching(true);
    setActiveTab(tab);

    try {
      if (tab === "Home") {
        cancelGeneration();
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
      showToast("First, tell us where you’re headed.", "error");
      return;
    }
    if (!prefs.travelStartDate || !prefs.travelEndDate) {
      showToast("First, choose when you’ll set out.", "error");
      return;
    }

    cancelGeneration();
    const controller = new AbortController();
    const id = generationRef.current.id;
    generationRef.current.controller = controller;
    const isCurrent = () => generationRef.current.id === id;

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
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...prefs,
          userRequest: smartSearchQuery,
        }),
      });

      if (!isCurrent()) return;
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate routes.");
      }

      const data = await response.json();
      if (!isCurrent()) return;
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
      if (!isCurrent()) return; // cancelled: nothing to report
      console.error("Error generating routes:", error.message);
      setError(error.message);
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
        generationRef.current.controller = null;
      }
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
    cancelGeneration();
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

    openPaneForDay();

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
  // Colour field behind the itinerary title: a pale tone of the route's cover photo
  const heroTone = usePhotoTone(selectedRoute?.coverImageUrl ?? destinationPhoto?.url ?? null);
  // Inner scroll areas fade at the edge where there's more (scrollbars are hidden)
  const sidebarScrollRef = useScrollFade<HTMLDivElement>();
  const listScrollRef = useScrollFade<HTMLDivElement>();
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

  // The opening spread: up to four of the trip's own photos, one per stop
  const openingHighlights: OpeningHighlight[] = useMemo(() => {
    const seen = new Set<string>();
    const out: OpeningHighlight[] = [];
    for (const d of liveItinerary ?? []) {
      for (const [index, a] of d.activities.entries()) {
        const key = a.imageUrl?.split("?")[0];
        if (!a.imageUrl || !key || seen.has(key)) continue;
        seen.add(key);
        out.push({ title: a.title, url: a.imageUrl, credit: a.imageAttribution ?? null, day: d.day, index });
        if (out.length === 4) return out;
      }
    }
    return out;
  }, [liveItinerary]);
  // A highlight in the opening: open that stop in the list and bring it into view
  const openHighlightStop = (h: OpeningHighlight) => {
    if (h.day == null || h.index == null) return;
    const el = document.getElementById(`stop-${h.day}-${h.index}`);
    const row = el?.querySelector<HTMLElement>("[aria-expanded]");
    if (row?.getAttribute("aria-expanded") === "false") row.click();
    window.setTimeout(() => el?.scrollIntoView({ behavior: "smooth", block: "start" }), 480);
  };
  const openingProps = selectedRoute
    ? {
        title: selectedRoute.title,
        subtitle: routeSubtitle,
        lede: selectedRoute.description,
        coverUrl: selectedRoute.coverImageUrl ?? destinationPhoto?.url ?? null,
        coverCredit: selectedRoute.coverImageUrl
          ? selectedRoute.coverImageAttribution ?? null
          : destinationPhoto
          ? { photographerName: destinationPhoto.photographerName, photographerUrl: destinationPhoto.photographerUrl }
          : null,
        tone: heroTone,
        highlights: openingHighlights,
        onHighlightClick: openHighlightStop,
        onBack: handleBackToRoutes,
        isFavorite: favoriteRoutes.has(selectedRoute.id),
        onToggleFavorite: () => toggleFavorite(selectedRoute.id),
      }
    : null;

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
  // Right-hand pane on wide screens (map, or a stop's photos). Closed by default.
  //  - choosing a day opens it
  //  - opening a stop opens it, and closing that stop closes it again
  //  - once the traveller closes it with the icon, opening stops won't reopen it
  //    (choosing a day or the icon will)
  type PaneOrigin = "intro" | "stop" | "user" | null;
  const [paneOpen, setPaneOpenState] = useState(false);
  const pane = useRef<{ open: boolean; origin: PaneOrigin; userClosed: boolean }>({ open: false, origin: null, userClosed: false });
  const setPane = (open: boolean, origin: PaneOrigin = null) => {
    pane.current.open = open;
    pane.current.origin = open ? origin : null;
    setPaneOpenState(open);
  };
  const isWide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;

  // Opening a route: the map pane starts open on wide screens, beside the overview
  // and the days. (mapTimers is kept for any future timed behaviour.)
  const mapTimers = useRef<number[]>([]);
  const stopMapIntro = () => {
    mapTimers.current.forEach((t) => window.clearTimeout(t));
    mapTimers.current = [];
  };
  useEffect(() => {
    if (stage !== "details" || !selectedRouteId) return;
    pane.current.userClosed = false;
    setPane(isWide(), "user");
    return () => stopMapIntro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, selectedRouteId]);

  // A day chosen (day tabs or a day's heading): show it on the map
  // Phones: the map folds into a slim bar under the list; tap (or pick a day) to open it
  const [phoneMapOpen, setPhoneMapOpen] = useState(false);
  useEffect(() => { setPhoneMapOpen(false); }, [selectedRouteId]);

  const openPaneForDay = () => {
    if (!isWide()) setPhoneMapOpen(true);
    stopMapIntro();
    pane.current.userClosed = false;
    setPane(true, "user");
  };

  // A stop opened or closed in the list
  const handleStopOpenChange = (open: boolean) => {
    stopMapIntro();
    setPhotoView(null);
    const p = pane.current;
    if (open) {
      if (p.open) {
        if (p.origin === "intro") p.origin = "stop";
      } else if (!p.userClosed && isWide()) {
        setPane(true, "stop");
      }
    } else if (p.open && p.origin === "stop") {
      setPane(false);
    }
  };

  // Scrolling: the overview shows the whole trip, a day's section shows that day
  const handleVisibleDay = useCallback((day: number) => {
    setHighlightedLocation(null);
    setHighlightedDay(day === 0 ? null : day);
  }, []);

  // The icon in the header's day index
  const togglePane = () => {
    stopMapIntro();
    setPhotoView(null);
    if (pane.current.open) {
      pane.current.userClosed = true;
      setPane(false);
    } else {
      pane.current.userClosed = false;
      setPane(true, "user");
    }
  };

  // A marker clicked on the map: open that stop's row in the list
  const [focusStop, setFocusStop] = useState<{ name: string; latitude: number; longitude: number; nonce: number } | null>(null);
  const handleMarkerClick = useCallback((location: Location) => {
    stopMapIntro(); // they're using the map: keep it open
    if (pane.current.origin === "intro") pane.current.origin = "user";
    setHighlightedLocation(location);
    setFocusStop({ name: location.name, latitude: location.latitude, longitude: location.longitude, nonce: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPhotosInPane = (view: PhotoViewState) => {
    // Phones have no side pane: use the fullscreen viewer
    if (!isWide()) return false;
    stopMapIntro();
    if (!pane.current.open) setPane(true, "stop");
    else if (pane.current.origin === "intro") pane.current.origin = "stop";
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
      <div ref={sidebarScrollRef} className="flex-1 overflow-y-auto pr-2 pb-4 scroll-fade">
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
                <p className="eyebrow">A small detour</p>
                <h3 className="mt-3 font-display text-[36px] leading-[1.06] uppercase text-ink">Your routes didn&apos;t come together</h3>
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
              tripLine={routeSubtitle}
              onChangeTrip={() => handleTabChange("Home")}
              onSelectDestination={(city) => {
                handlePreferenceChange("destination", city);
                handleTabChange("Home");
              }}
            />
          )}
        </div>
      )}

      {stage === "details" && (
        <>
        {/* Wide screens: the trip's opening spread, full width, above everything */}
        {openingProps && (
          <div className="hidden md:block md:-mx-5 lg:-mx-12">
            <RouteOpening {...openingProps} layout="spread" />
          </div>
        )}
        {/* Wide screens: the page itself scrolls; list and pane are both half width and
            never resize. Opening slides the list from the centre to the left and the pane
            in from the right (transform only, so the map isn't redrawn on every frame).
            Phones keep a fixed layout: the list scrolls above a short map. */}
        <div className="relative flex flex-col gap-3 h-full min-h-0 md:block md:h-auto">
          <div
            className={`flex-1 min-h-0 min-w-0 bg-white overflow-hidden flex flex-col md:block md:overflow-visible md:w-[calc(50%-20px)] md:transition-transform md:duration-700 md:ease-editorial ${paneOpen ? "md:translate-x-0" : "md:translate-x-[calc(50%+20px)]"}`}
          >
            <div ref={listScrollRef} className="flex-1 overflow-y-auto pr-3 pb-6 scroll-fade md:overflow-visible md:pr-0 md:pb-16 md:[mask-image:none] md:[-webkit-mask-image:none]">
              <div>
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
                  paneOpen={paneOpen}
                  onTogglePane={togglePane}
                  onStopOpenChange={handleStopOpenChange}
                  opening={openingProps ? <RouteOpening {...openingProps} layout="stack" /> : undefined}
                  onVisibleDayChange={handleVisibleDay}
                />
              )}
              </div>
            </div>
          </div>

          <div
            className={`${phoneMapOpen ? "h-[46vh] pb-4" : "h-11 pb-0"} transition-[height] duration-500 ease-editorial md:absolute md:inset-y-0 md:right-0 md:h-auto md:w-[calc(50%-20px)] min-h-0 min-w-0 bg-white overflow-hidden flex flex-col md:block md:overflow-visible md:pb-0 md:transition-[transform,opacity] md:duration-700 md:ease-editorial ${paneOpen ? "md:translate-x-0 md:opacity-100" : "md:translate-x-[calc(100%+40px)] md:opacity-0 md:pointer-events-none"}`}
          >
            {/* Phones: the folded map is a slim bar; tap to open or close it */}
            <button
              type="button"
              onClick={() => setPhoneMapOpen((o) => !o)}
              aria-expanded={phoneMapOpen}
              className="md:hidden flex-shrink-0 h-11 flex items-center justify-between gap-4 border-t border-ink text-left"
            >
              <span className="font-display text-[17px] text-ink truncate">{mapSummary?.title ?? "Map"}</span>
              <span className="text-xs tracking-[0.06em] uppercase text-ink-muted flex-shrink-0">{phoneMapOpen ? "Fold map" : "Open map"}</span>
            </button>
            {/* Stays in view under the slim index bar while the page scrolls */}
            <div className="relative flex-1 min-h-0 md:sticky md:top-16 md:h-[calc(100vh-88px)]">
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
        </>
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
