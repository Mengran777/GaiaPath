// src/app/App.tsx (MAJOR REWRITE)
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import { RouteList } from "../components/RouteSelection";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";
import { DayItinerary } from "../types/itinerary";
import { RouteOption } from "@/types/routes";

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

// ⭐ 定义三个阶段 ⭐
type AppStage = "initial" | "routes" | "details";

const App: React.FC = () => {
  const router = useRouter();

  // ⭐ 核心状态：当前阶段 ⭐
  const [stage, setStage] = useState<AppStage>("initial");

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

  const [smartSearchQuery, setSmartSearchQuery] = useState(
    "Tell me what kind of trip you want..."
  );

  // ⭐ 路线选项状态 ⭐
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // ⭐ 当前选中的路线和行程 ⭐
  const selectedRoute = useMemo(() => {
    return routeOptions.find((route) => route.id === selectedRouteId) || null;
  }, [routeOptions, selectedRouteId]);

  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ⭐ 高亮的日期（用于地图显示） ⭐
  const [highlightedDay, setHighlightedDay] = useState<number | null>(null);
  const [highlightedLocation, setHighlightedLocation] =
    useState<Location | null>(null);

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") {
      return null;
    }
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(";").shift() || null;
      try {
        return cookieValue ? decodeURIComponent(cookieValue) : null;
      } catch (e) {
        console.error(`App: Error decoding cookie ${name}:`, e);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const storedUserId = getCookie("userId");
    if (storedUserId) {
      setCurrentUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      const fetchUsername = async () => {
        try {
          const response = await fetch(`/api/user/${currentUserId}`);
          if (!response.ok) {
            setCurrentUsername(null);
            handleLogout();
            return;
          }
          const userData = await response.json();
          if (userData && userData.username) {
            setCurrentUsername(userData.username);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
          setCurrentUsername(null);
        }
      };
      fetchUsername();
    } else {
      setCurrentUsername(null);
    }
  }, [currentUserId]);

  const handleLogout = () => {
    document.cookie =
      "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    document.cookie =
      "userId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";
    document.cookie =
      "isLoggedIn=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;";

    setCurrentUserId(null);
    setCurrentUsername(null);
    window.location.href = "/auth/login";
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    console.log("Smart search:", query);
    setPreferences((prev) => ({ ...prev, destination: query }));
  };

  // ⭐ 生成多条路线 ⭐
  const handleGenerateItinerary = async () => {
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
          Authorization: `Bearer ${getCookie("authToken")}`,
        },
        body: JSON.stringify({
          ...preferences,
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate routes.");
      }

      const data = await response.json();
      console.log("API 返回的数据：", data); // 添加这行
      console.log("第一个路线的结构：", data[0]); // 添加这行
      if (Array.isArray(data)) {
        setRouteOptions(data);
        setStage("routes");
      } else if (Array.isArray(data.routes)) {
        setRouteOptions(data.routes);
        setStage("routes");
      } else {
        console.error("AI response data is not in expected format:", data);
        setError("AI generated an unexpected response format.");
      }
    } catch (error: any) {
      console.error("Error generating routes:", error.message);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ⭐ 选择某条路线 ⭐
  const handleSelectRoute = useCallback(
    (routeId: string) => {
      setSelectedRouteId(routeId);
      const route = routeOptions.find((r) => r.id === routeId);
      if (route) {
        setItinerary(route.itinerary);
        setStage("details"); // ⭐ 切换到详情阶段 ⭐
      }
    },
    [routeOptions]
  );

  // ⭐ 从详情页返回路线选择 ⭐
  const handleBackToRoutes = useCallback(() => {
    setStage("routes");
    setSelectedRouteId(null);
    setItinerary([]);
    setHighlightedDay(null);
    setHighlightedLocation(null);
  }, []);

  // ⭐ 重新编辑偏好设置 ⭐
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
            alert("保存功能开发中...");
            break;
          case "f":
            e.preventDefault();
            const input = document.querySelector(
              ".search-input"
            ) as HTMLInputElement;
            input?.focus();
            break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ⭐ 处理点击某天的行程 ⭐
  const handleDayClick = useCallback((dayNumber: number) => {
    setHighlightedDay(dayNumber);
    // 可以在这里添加滚动到地图的逻辑
  }, []);

  // ⭐ 处理点击活动卡片 ⭐
  const handleCardClick = useCallback((location: Location) => {
    setHighlightedLocation(location);
  }, []);

  // ⭐ 当前显示的地点列表（基于选中的天数） ⭐
  const displayedLocations = useMemo(() => {
    if (!itinerary || itinerary.length === 0) return [];

    if (highlightedDay !== null) {
      // 只显示选中天数的地点
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

    // 显示所有地点
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

  // ⭐ Sidebar 内容（根据阶段变化） ⭐
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {stage === "details" ? (
        // Stage 3: 只显示一个返回按钮
        <button
          onClick={handleBackToRoutes}
          className="flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-800 transition-colors"
        >
          ← Back to Routes
        </button>
      ) : (
        // Stage 1 & 2: 显示完整表单
        <>
          <SmartSearch
            query={smartSearchQuery}
            setQuery={setSmartSearchQuery}
            onSearch={handleSmartSearch}
            onSuggestionClick={(s) => setSmartSearchQuery(s)}
          />
          <div className="flex-1 mt-4 overflow-y-auto custom-scrollbar">
            <PreferenceForm
              preferences={preferences}
              onPreferenceChange={handlePreferenceChange}
            />
          </div>
          <GenerateButton
            onClick={handleGenerateItinerary}
            isLoading={isLoading}
          />
          {stage === "routes" && (
            <button
              onClick={handleBackToInitial}
              className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              ✏️ Edit Preferences
            </button>
          )}
        </>
      )}
    </div>
  );

  // ⭐ Main Panel 内容（根据阶段变化） ⭐
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
          <RouteList
            routes={routeOptions}
            onSelectRoute={handleSelectRoute}
            isLoading={isLoading}
          />
        </div>
      )}

      {stage === "details" && (
        <div className="flex gap-0 h-full">
          <div className="flex-1 bg-white rounded-l-2xl shadow-xl overflow-hidden">
            <div className="h-full overflow-y-auto p-6 custom-scrollbar">
              {error && (
                <p className="text-red-500 text-center py-8">错误: {error}</p>
              )}
              {!error && itinerary.length > 0 && (
                <ItineraryPanel
                  itinerary={itinerary}
                  onActivityClick={handleCardClick}
                  onDayClick={handleDayClick}
                  highlightedDay={highlightedDay}
                />
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-r-2xl shadow-xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              📍 Route Map
            </h3>
            <div className="w-full h-[calc(100%-3rem)]">
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
        pathname={
          typeof window !== "undefined" ? window.location.pathname : "/"
        }
        stage={stage}
      />
      <FloatingActions />
    </div>
  );
};

export default App;
