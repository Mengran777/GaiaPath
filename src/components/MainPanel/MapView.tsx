import React, { useRef, useEffect } from "react";
import Section from "../Layout/Section"; // Import from Layout

const MapView: React.FC = () => {
  const mapControlBtnClass = `w-10 h-10 rounded-lg bg-white shadow-md hover:shadow-lg
                              flex items-center justify-center text-gray-700 text-xl
                              hover:bg-blue-500 hover:text-white transition-all duration-200 cursor-pointer active:scale-95`;

  const mapControlBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Touch/Click animation for map controls
  useEffect(() => {
    const handleInteractionStart = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      target.style.transform = "scale(0.9)";
    };
    const handleInteractionEnd = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      target.style.transform = "scale(1)";
    };

    mapControlBtnRefs.current.forEach((btn) => {
      if (btn) {
        btn.addEventListener("mousedown", handleInteractionStart);
        btn.addEventListener("mouseup", handleInteractionEnd);
        if ("ontouchstart" in window) {
          btn.addEventListener("touchstart", handleInteractionStart, {
            passive: true,
          });
          btn.addEventListener("touchend", handleInteractionEnd, {
            passive: true,
          });
        }
      }
    });

    return () => {
      mapControlBtnRefs.current.forEach((btn) => {
        if (btn) {
          btn.removeEventListener("mousedown", handleInteractionStart);
          btn.removeEventListener("mouseup", handleInteractionEnd);
          if ("ontouchstart" in window) {
            btn.removeEventListener("touchstart", handleInteractionStart);
            btn.removeEventListener("touchend", handleInteractionEnd);
          }
        }
      });
    };
  }, []);

  return (
    <Section title="Map Display" className="flex-1 relative">
      <div className="w-full h-full min-h-[400px] bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 text-lg overflow-hidden shadow-inner">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🗺️</div>
          <div className="font-semibold">Interactive Map</div>
          <div className="text-sm mt-2 text-gray-500">
            Displays recommended attractions and route planning
            <br />
            Supports drag-and-drop adjustment and real-time navigation
          </div>
        </div>
        <div className="absolute top-6 right-6 flex flex-col space-y-3">
          <button
            ref={(el) => (mapControlBtnRefs.current[0] = el!)}
            className={mapControlBtnClass}
            title="Zoom In"
          >
            +
          </button>
          <button
            ref={(el) => (mapControlBtnRefs.current[1] = el!)}
            className={mapControlBtnClass}
            title="Zoom Out"
          >
            -
          </button>
          <button
            ref={(el) => (mapControlBtnRefs.current[2] = el!)}
            className={mapControlBtnClass}
            title="Locate"
          >
            📍
          </button>
          <button
            ref={(el) => (mapControlBtnRefs.current[3] = el!)}
            className={mapControlBtnClass}
            title="Layers"
          >
            🗂️
          </button>
        </div>
      </div>
    </Section>
  );
};

export default MapView;
