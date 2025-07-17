// src/app/App.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // 导入 useRouter 以便安全地进行客户端导航

import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";

const App: React.FC = () => {
  const router = useRouter(); // 初始化 useRouter

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

  const [itinerary, setItinerary] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // 新增状态：存储用户名
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  // 获取 Cookie 的辅助函数保持不变
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

  // Effect 1: 从 Cookie 读取 userId
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

  // Effect 2: 当 userId 存在时，获取用户名
  useEffect(() => {
    if (currentUserId) {
      const fetchUsername = async () => {
        try {
          // 调用一个 API 路由来根据 ID 获取用户详细信息
          // 你需要创建一个 /api/user/[id]/route.ts 或 /api/user/me 路由
          const response = await fetch(`/api/user/${currentUserId}`); // 假设这个路由存在
          if (!response.ok) {
            // 如果 API 返回错误，例如用户不存在或未授权
            console.error("Failed to fetch user data:", response.statusText);
            setCurrentUsername(null);
            // 考虑在这里执行登出操作，如果用户ID无效
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
      setCurrentUsername(null); // 如果没有 userId，则清空用户名
    }
  }, [currentUserId]); // 依赖 currentUserId 变化而触发

  const handleLogout = () => {
    document.cookie =
      "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure;";
    document.cookie =
      "userId=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure;";
    setCurrentUserId(null);
    setCurrentUsername(null); // 清空用户名状态
    router.push("/auth/login");
  };

  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const handleSmartSearch = (query: string) => {
    console.log("Smart search:", query);
    setPreferences((prev) => ({ ...prev, destination: query }));
  };

  const handleGenerateItinerary = () => {
    setIsLoading(true);
    console.log("Generating itinerary with:", preferences);

    setTimeout(() => {
      setItinerary([
        {
          day: 1,
          title: "Rome - The Eternal City",
          date: "August 15, 2025",
          activities: [
            {
              title: "Colosseum & Roman Forum",
              description:
                "Witness two millennia of history, feel the glory of the Roman Empire.",
              time: "09:00-12:00",
              rating: 4.8,
              price: "180",
              imageUrl:
                "https://placehold.co/400x200/FF5733/FFFFFF?text=Colosseum",
            },
            {
              title: "Trevi Fountain & Spanish Steps",
              description: "Toss a coin and enjoy the Spanish Steps.",
              time: "14:00-17:00",
              rating: 4.6,
              price: "Free",
              imageUrl:
                "https://placehold.co/400x200/33FF57/FFFFFF?text=Trevi+Fountain",
            },
          ],
        },
        {
          day: 2,
          title: "Vatican City State",
          date: "August 16, 2025",
          activities: [
            {
              title: "Vatican Museums & Sistine Chapel",
              description: "Admire Michelangelo's ceiling frescoes.",
              time: "08:00-12:00",
              rating: 4.9,
              price: "220",
              imageUrl:
                "https://placehold.co/400x200/3357FF/FFFFFF?text=Vatican+Museum",
            },
            {
              title: "St. Peter's Basilica",
              description: "Climb to the top for panoramic views.",
              time: "14:00-16:00",
              rating: 4.7,
              price: "120",
              imageUrl:
                "https://placehold.co/400x200/FF33A1/FFFFFF?text=St+Peters",
            },
          ],
        },
        {
          day: 3,
          title: "Florence - Cradle of the Renaissance",
          date: "August 17, 2025",
          activities: [
            {
              title: "Uffizi Gallery",
              description: "Renaissance masterpieces await.",
              time: "09:00-13:00",
              rating: 4.8,
              price: "280",
              imageUrl:
                "https://placehold.co/400x200/A133FF/FFFFFF?text=Uffizi",
            },
          ],
        },
      ]);
      setIsLoading(false);
    }, 2000);
  };

  // 全局键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            alert("Save feature under development...");
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

  // 启用触摸支持
  useEffect(() => {
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      document.addEventListener("touchstart", () => {}, { passive: true });
    }
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <ItineraryPanel itinerary={itinerary} />
      <MapView />
    </div>
  );

  return (
    <div className="App">
      <PageContainer
        sidebar={sidebarContent}
        mainContent={mainPanelContent}
        currentUserId={currentUsername}
        onLogout={handleLogout}
        // pathname 可以在客户端组件中安全地访问 window.location.pathname
        pathname={
          typeof window !== "undefined" ? window.location.pathname : "/"
        }
      />
      <FloatingActions />
    </div>
  );
};

export default App;
