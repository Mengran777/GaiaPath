"use client"; // This directive marks the file as a Client Component

import React, { useState, useEffect } from "react";

// Direct imports for all components, bypassing barrel files
// 导入路径已根据 App.tsx 的新位置 (src/app) 进行调整
import Header from "../components/Header/Header";
import PageContainer from "../components/Layout/PageContainer";
import SmartSearch from "../components/Sidebar/SmartSearch";
import PreferenceForm from "../components/Sidebar/PreferenceForm";
import GenerateButton from "../components/Sidebar/GenerateButton";
import ItineraryPanel from "../components/MainPanel/ItineraryPanel";
import MapView from "../components/MainPanel/MapView";
import FloatingActions from "../components/Controls/FloatingActions";

// Note: Individual UI components (Input, Select, Slider, Tag, TypeCard) are now imported directly
// within the components that use them (e.g., SmartSearch, PreferenceForm).
// The App component itself does not directly use these UI components, so no imports are needed here.

// --- TOP-LEVEL DEBUGGING LOGS ---
// These logs run as soon as the module is loaded, before any React rendering.
console.log("--- App.tsx Top-Level Import Debugging ---");
console.log("Type of Header:", typeof Header, Header);
console.log("Type of PageContainer:", typeof PageContainer, PageContainer);
console.log("Type of SmartSearch:", typeof SmartSearch, SmartSearch);
console.log("Type of PreferenceForm:", typeof PreferenceForm, PreferenceForm);
console.log("Type of GenerateButton:", typeof GenerateButton, GenerateButton);
console.log("Type of ItineraryPanel:", typeof ItineraryPanel, ItineraryPanel);
console.log("Type of MapView:", typeof MapView, MapView);
console.log(
  "Type of FloatingActions:",
  typeof FloatingActions,
  FloatingActions
);
console.log("----------------------------------------");
// --- END TOP-LEVEL DEBUGGING LOGS ---

const App: React.FC = () => {
  // State for user preferences
  const [preferences, setPreferences] = useState({
    destination: "",
    travelStartDate: "",
    travelEndDate: "",
    budget: 15000,
    travelers: "2",
    travelType: ["history", "nature"], // Default selected types
    accommodation: "comfort",
    transportation: ["train"], // Default selected transportation
    activityIntensity: "moderate",
    specialNeeds: [],
  });
  // State for smart search input query
  const [smartSearchQuery, setSmartSearchQuery] = useState(
    "Tell me what kind of trip you want... e.g., Beach hiking July Europe"
  );

  // State for AI-generated itinerary
  const [itinerary, setItinerary] = useState<any[]>([]);
  // State for loading indicator
  const [isLoading, setIsLoading] = useState(false);

  // Handler for preference changes
  const handlePreferenceChange = (key: string, value: any) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  // Handler for smart search
  const handleSmartSearch = (query: string) => {
    console.log("Smart search query:", query);
    // Here you would trigger an API call to get destination suggestions
    // For now, simulate a suggestion
    setPreferences((prev) => ({ ...prev, destination: query }));
  };

  // Function to simulate itinerary generation
  const handleGenerateItinerary = () => {
    setIsLoading(true);
    console.log("Generating itinerary with current preferences:", preferences);

    setTimeout(() => {
      // Mock AI-generated itinerary data
      const mockItinerary = [
        {
          day: 1,
          title: "Rome - The Eternal City",
          date: "August 15, 2025",
          activities: [
            {
              title: "Colosseum & Roman Forum",
              description:
                "Witness two millennia of history, feel the glory of the Roman Empire. Recommended to book tickets in advance to avoid queues.",
              time: "09:00-12:00",
              rating: 4.8,
              price: "180",
              imageUrl:
                "https://placehold.co/400x200/FF5733/FFFFFF?text=Colosseum",
            },
            {
              title: "Trevi Fountain & Spanish Steps",
              description:
                "Toss a coin into the Trevi Fountain and enjoy an afternoon at the Spanish Steps.",
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
              description:
                "Admire Michelangelo's ceiling frescoes, a treasure trove of world art.",
              time: "08:00-12:00",
              rating: 4.9,
              price: "220",
              imageUrl:
                "https://placehold.co/400x200/3357FF/FFFFFF?text=Vatican+Museum",
            },
            {
              title: "St. Peter's Basilica",
              description:
                "Climb to the top for panoramic views of Rome and experience the awe of religious art.",
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
              description:
                "A collection of works by Da Vinci, Michelangelo, and more, a treasure house of Renaissance art.",
              time: "09:00-13:00",
              rating: 4.8,
              price: "280",
              imageUrl:
                "https://placehold.co/400x200/A133FF/FFFFFF?text=Uffizi",
            },
          ],
        },
      ];
      setItinerary(mockItinerary);
      setIsLoading(false);
    }, 2000); // Simulate 2 seconds delay
  };

  // Keyboard shortcuts (remains in App.tsx as it's global)
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
            const searchInput = document.querySelector(
              ".search-input"
            ) as HTMLInputElement;
            if (searchInput) searchInput.focus();
            break;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Touch device support (remains in App.tsx as it's global)
  useEffect(() => {
    if ("ontouchstart" in window) {
      document.addEventListener("touchstart", () => {}, { passive: true });
      // Note: Specific card touch effects are now handled within ItineraryCard and TypeCard
    }
  }, []);

  // Content for the sidebar
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

  // Content for the main panel (itinerary and map displayed simultaneously)
  const mainPanelContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
      <ItineraryPanel itinerary={itinerary} />
      <MapView />
    </div>
  );

  return (
    <div className="App">
      <PageContainer sidebar={sidebarContent} mainContent={mainPanelContent} />
      <FloatingActions />
    </div>
  );
};

export default App;
