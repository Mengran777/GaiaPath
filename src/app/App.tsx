// src/app/App.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";
import { GeneratedItinerary, DayItinerary } from "./types/itinerary"; // 导入新定义的类型

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

  // 将 itinerary 的类型改为 GeneratedItinerary 或 DayItinerary[]
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null); // 类型为 string | null

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
        pathname={
          typeof window !== "undefined" ? window.location.pathname : "/"
        }
      />
      <FloatingActions />
    </div>
  );
};

export default App;
