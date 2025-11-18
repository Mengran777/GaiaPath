// src/app/App.tsx (MAJOR REWRITE)
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  // ⭐ 核心状态：当前阶段 ⭐
  const [stage, setStage] = useState<AppStage>("initial");

  // ⭐ 当前活动标签 ⭐
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

  const [smartSearchQuery, setSmartSearchQuery] = useState(
    "Tell me what kind of trip you want..."
  );

  // ⭐ 路线选项状态 ⭐
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [myItineraries, setMyItineraries] = useState<RouteOption[]>([]); // 保存生成的路线
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

  // ⭐ 收藏功能状态 ⭐
  const [favoriteRoutes, setFavoriteRoutes] = useState<Set<string>>(new Set());

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

  // ⭐ 从数据库加载用户的收藏路线 ⭐
  useEffect(() => {
    if (currentUserId) {
      const fetchFavorites = async () => {
        try {
          const response = await fetch("/api/favorites", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${getCookie("authToken")}`,
            },
          });

          if (response.ok) {
            const favoritesData = await response.json();
            // 提取所有收藏路线的 ID
            const favoriteIds = favoritesData.map((route: any) => route.id);
            setFavoriteRoutes(new Set(favoriteIds));
            console.log("Loaded favorites from database:", favoriteIds);
          } else {
            console.error("Failed to load favorites:", response.statusText);
          }
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      };
      fetchFavorites();
    } else {
      // 用户未登录，清空收藏
      setFavoriteRoutes(new Set());
    }
  }, [currentUserId]);

  const handleLogout = async () => {
    try {
      // 调用服务器端登出 API 来清除 httpOnly cookies
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // 清除客户端状态
      setCurrentUserId(null);
      setCurrentUsername(null);
      setFavoriteRoutes(new Set());
      setRouteOptions([]);
      setMyItineraries([]);
      setItinerary([]);

      // 清除客户端可访问的 cookies
      const cookiesToClear = ["userId", "isLoggedIn"];
      cookiesToClear.forEach((cookieName) => {
        document.cookie = `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`;
      });

      // 使用 replace 强制跳转到登录页
      window.location.replace("/auth/login");
    } catch (error) {
      console.error("Logout error:", error);
      // 即使出错也要跳转到登录页
      window.location.replace("/auth/login");
    }
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    console.log("Smart search:", query);
    // 不再将 query 设置为 destination，而是保持在 smartSearchQuery 中
    setSmartSearchQuery(query);
  };

  // ⭐ 收藏功能处理 ⭐
  const toggleFavorite = async (routeId: string) => {
    const isFavorited = favoriteRoutes.has(routeId);
    const action = isFavorited ? "remove" : "add";

    // 先更新 UI 状态（乐观更新）
    setFavoriteRoutes((prev) => {
      const newFavorites = new Set(prev);
      if (isFavorited) {
        newFavorites.delete(routeId);
      } else {
        newFavorites.add(routeId);
      }
      return newFavorites;
    });

    // 然后同步到数据库
    try {
      const route = routeOptions.find((r) => r.id === routeId);

      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getCookie("authToken")}`,
        },
        body: JSON.stringify({
          routeId: routeId,
          routeData: route, // 保存完整的路线数据
          action: action,
        }),
      });

      if (!response.ok) {
        // 如果保存失败，回滚 UI 状态
        setFavoriteRoutes((prev) => {
          const newFavorites = new Set(prev);
          if (isFavorited) {
            newFavorites.add(routeId);
          } else {
            newFavorites.delete(routeId);
          }
          return newFavorites;
        });
        console.error("Failed to save favorite to database");
      } else {
        console.log(`Favorite ${action}ed successfully:`, routeId);
      }
    } catch (error) {
      console.error("Error saving favorite:", error);
      // 回滚 UI 状态
      setFavoriteRoutes((prev) => {
        const newFavorites = new Set(prev);
        if (isFavorited) {
          newFavorites.add(routeId);
        } else {
          newFavorites.delete(routeId);
        }
        return newFavorites;
      });
    }
  };

  // ⭐ 从数据库加载收藏路线 ⭐
  const loadFavoritesFromDatabase = async () => {
    if (!currentUserId) {
      console.log("No user logged in, skipping favorites load");
      return [];
    }

    try {
      const response = await fetch("/api/favorites", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getCookie("authToken")}`,
        },
      });

      if (response.ok) {
        const favoritesData = await response.json();
        console.log("Loaded favorite routes from database:", favoritesData);
        return favoritesData;
      } else {
        console.error("Failed to load favorite routes:", response.statusText);
        return [];
      }
    } catch (error) {
      console.error("Error loading favorite routes:", error);
      return [];
    }
  };

  // ⭐ 标签切换处理 ⭐
  const handleTabChange = async (tab: string) => {
    console.log("Tab changed to:", tab);
    setActiveTab(tab);

    if (tab === "Home") {
      setStage("initial");
    } else if (tab === "Favorites") {
      // 切换到 Favorites 时，从数据库加载收藏的路线
      const favoritesData = await loadFavoritesFromDatabase();

      if (favoritesData.length > 0) {
        // 更新收藏的路线 ID（不覆盖，而是合并）
        const favoriteIds = favoritesData.map((route: any) => route.id);
        setFavoriteRoutes(new Set(favoriteIds));

        // 更新显示的路线为收藏的路线
        setRouteOptions(favoritesData);
        setStage("routes");
      } else {
        // 没有收藏的路线，显示空状态
        setRouteOptions([]);
        setStage("routes");
      }
    } else if (tab === "My Itineraries") {
      // 切换到 My Itineraries 时，显示所有生成的路线
      if (myItineraries.length > 0) {
        setRouteOptions(myItineraries);
        setStage("routes");
      } else {
        // 如果没有生成过路线，显示初始状态
        setRouteOptions([]);
        setStage("initial");
      }
    } else if (tab === "Community") {
      // Community 功能暂未实现，保持当前状态
      console.log("Community feature coming soon...");
    }
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
          userRequest: smartSearchQuery, // ⭐ 新增：发送用户的自定义需求
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate routes.");
      }

      const data = await response.json();
      console.log("API 返回的数据：", data);
      console.log("第一个路线的结构：", data[0]);

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

      // 保存生成的路线并切换到 My Itineraries tab
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
    // 清除地点详情浮窗
    setHighlightedLocation(null);

    // 如果点击的是 0（头部），则重置为显示所有地点
    if (dayNumber === 0) {
      setHighlightedDay(null);
    } else {
      setHighlightedDay(dayNumber);
    }
    // 可以在这里添加滚动到地图的逻辑
  }, []);

  // ⭐ 处理点击活动卡片 ⭐
  const handleCardClick = useCallback((location: Location) => {
    console.log("handleCardClick called with location:", location);

    // 如果点击的是同一个地点，则关闭浮窗
    setHighlightedLocation((prev) => {
      console.log("Previous highlightedLocation:", prev);

      if (prev &&
          prev.name === location.name &&
          prev.latitude === location.latitude &&
          prev.longitude === location.longitude) {
        console.log("Same location clicked, closing popup");
        return null;
      }
      console.log("Different or new location, showing popup");
      return location;
    });
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
      ) : activeTab === "Favorites" ? (
        // Favorites 标签：显示提示信息
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
        // Home 和 My Itineraries: 显示完整表单
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
        </div>
      )}

      {stage === "details" && (
        <div className="flex gap-4 h-full">
          <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {error && (
                <p className="text-red-500 text-center py-8">错误: {error}</p>
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
        pathname={
          typeof window !== "undefined" ? window.location.pathname : "/"
        }
        stage={stage}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
      <FloatingActions />
    </div>
  );
};

export default App;
