// src/app/App.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";
import { GeneratedItinerary, DayItinerary } from "./types/itinerary"; // 导入新定义的类型

interface Location {
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
  imageUrl?: string;
}

const App: React.FC = () => {
  const router = useRouter();

  const [preferences, setPreferences] = useState({
    destination: "",
    travelStartDate: "",
    travelEndDate: "",
    budget: 15000,
    travelers: "2",
    travelType: ["history", "nature"],
    accommodation: "comfort",
    transportation: ["train"],
    activityIntensity: "moderate",
    specialNeeds: [],
  });

  const [smartSearchQuery, setSmartSearchQuery] = useState(
    "Tell me what kind of trip you want... e.g., Beach hiking July Europe"
  );

  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // 类型为 string | null
  // ⭐ 新增状态：选中地点 ⭐
  const [highlightedLocation, setHighlightedLocation] =
    useState<Location | null>(null);

  // ⭐ ADD THIS LOG IMMEDIATELY AFTER STATE DECLARATIONS ⭐
  console.log("App component render: typeof setError is", typeof setError);
  console.log("App component render: error state value is", error);

  const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") {
      return null;
    }
    const value = `; ${document.cookie}`;
    console.log("Full document.cookie:", document.cookie); // 打印原始 cookie 字符串

    const parts = value.split(`; ${name}=`);
    console.log(`Parts for ${name}:`, parts); // 打印分割后的 parts 数组
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(";").shift() || null;
      console.log(`Extracted cookieValue for ${name}:`, cookieValue); //
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
      console.log(
        "App: User ID successfully read from 'userId' cookie:",
        storedUserId
      );
    } else {
      console.log("App: 'userId' cookie not found or is empty.");
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      const fetchUsername = async () => {
        try {
          const response = await fetch(`/api/user/${currentUserId}`);
          if (!response.ok) {
            console.error("Failed to fetch user data:", response.statusText);
            setCurrentUsername(null);
            handleLogout();
            return;
          }
          const userData = await response.json();
          if (userData && userData.username) {
            setCurrentUsername(userData.username);
            console.log("App: Username fetched:", userData.username);
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
      "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure;";
    document.cookie =
      "userId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure;";
    setCurrentUserId(null);
    setCurrentUsername(null);
    router.push("/auth/login");
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    console.log("Smart search:", query);
    setPreferences((prev) => ({ ...prev, destination: query }));
  };

  const handleGenerateItinerary = async () => {
    setIsLoading(true);
    setError(null);
    setItinerary([]); // Clear previous itinerary - already good
    setHighlightedLocation(null); // ⭐ IMPORTANT: Clear highlighted location when generating new itinerary ⭐

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
        throw new Error(errorData.error || "Failed to generate itinerary.");
      }

      const data = await response.json(); // Don't explicitly type here yet

      // ⭐ NEW: Add a robust check before setting the state ⭐
      if (Array.isArray(data)) {
        setItinerary(data); // If data is an array, set it directly
        console.log("Itinerary generated successfully:", data);
      } else {
        // If the AI didn't return an array, log and set to empty array
        console.error("AI response data is not an array:", data);
        setItinerary([]);
        setError("AI generated an unexpected itinerary format.");
      }
    } catch (error: any) {
      console.error("Error generating itinerary:", error.message);
      setError(error.message); // Set the error state
      setItinerary([]); // Keep itinerary empty on error
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      document.addEventListener("touchstart", () => {}, { passive: true });
    }
  }, []);

  const allLocations = useMemo(() => {
    // ⭐ 使用 useMemo 优化 ⭐
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
  }, [itinerary]); // 依赖 itinerary

  // const routeGeoJSON = useMemo(() => {
  //   // ⭐ 使用 useMemo 优化 ⭐
  //   if (allLocations.length < 2) {
  //     return null;
  //   }

  //   // 过滤掉无效坐标，并映射为 [longitude, latitude] 格式
  //   const coordinates = allLocations
  //     .filter(
  //       (loc) =>
  //         typeof loc.latitude === "number" &&
  //         typeof loc.longitude === "number" &&
  //         loc.latitude !== 0 &&
  //         loc.longitude !== 0
  //     )
  //     .map((loc) => [loc.longitude, loc.latitude]);

  //   if (coordinates.length < 2) {
  //     // 再次检查，确保过滤后仍有足够坐标
  //     return null;
  //   }

  //   return {
  //     type: "Feature",
  //     properties: {},
  //     geometry: {
  //       type: "LineString",
  //       coordinates: coordinates,
  //     },
  //   } as const;
  // }, [allLocations]); // 当 allLocations 变化时重新计算

  // ⭐ 新增函数：处理卡片点击事件 ⭐
  const handleCardClick = useCallback((location: Location) => {
    setHighlightedLocation(location);
    // 可以在这里添加滚动到地图视图的逻辑，如果地图不在当前屏幕内的话
    // For now, let MapView handle the flyTo
  }, []);

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <SmartSearch
        query={smartSearchQuery}
        setQuery={setSmartSearchQuery}
        onSearch={handleSmartSearch}
        onSuggestionClick={(s) => setSmartSearchQuery(s)}
      />
      <PreferenceForm
        preferences={preferences}
        onPreferenceChange={handlePreferenceChange}
      />
      <GenerateButton onClick={handleGenerateItinerary} isLoading={isLoading} />
    </div>
  );

  const mainPanelContent = (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* 行程列表面板 */}
      <div className="lg:w-1/2 flex-shrink-0 bg-white rounded-lg shadow-md p-6 overflow-y-auto">
        {/* ⭐ ADDED: ItineraryPanel rendering logic ⭐ */}
        {itinerary.length === 0 && !isLoading && !error && (
          <p className="text-gray-500 text-center py-8">
            请在左侧输入偏好并生成行程。
          </p>
        )}
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <p className="text-blue-500 text-lg">正在生成行程，请稍候...</p>
          </div>
        )}
        {error && (
          <p className="text-red-500 text-center py-8">错误: {error}</p>
        )}
        {!isLoading && !error && itinerary.length > 0 && (
          // ⭐ 传递 handleCardClick 给 ItineraryPanel ⭐
          <ItineraryPanel
            itinerary={itinerary}
            onActivityClick={handleCardClick}
          />
        )}
      </div>

      {/* 地图视图面板 */}
      <div className="lg:w-1/2 flex-shrink-0 bg-gray-100 rounded-lg shadow-md p-6 flex flex-col">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">景点地图</h3>
        <div
          className="w-full flex-grow relative"
          style={{ minHeight: "300px" }}
        >
          {/* ⭐ MODIFIED: Pass highlightedLocation to MapView ⭐ */}
          <MapView
            locations={allLocations}
            // route={routeGeoJSON}
            highlightedLocation={highlightedLocation} // ⭐ NEW PROP ⭐
          />
        </div>
      </div>
    </div>
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
      />
      <FloatingActions />
    </div>
  );
};

export default App;
