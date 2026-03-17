// src/components/MainPanel/ItineraryPanel.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { DayItinerary, Activity, Location } from "../../types/itinerary";

interface ItineraryPanelProps {
  itinerary: DayItinerary[];
  onActivityClick: (location: Location) => void;
  onDayClick?: (dayNumber: number) => void;
  highlightedDay?: number | null;
  routeId?: string; // accepted but unused — for caller compatibility
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onBackToRoutes?: () => void;
}

// ─── Draggable Card ───────────────────────────────────────────────────────────

interface DraggableCardProps {
  activity: Activity;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  isDragging: boolean;
  removeMode: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  onActivityClick: (location: Location) => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  activity,
  dragHandleProps,
  isDragging,
  removeMode,
  isRemoving,
  onRemove,
  onActivityClick,
}) => {
  const [hovered, setHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      typeof activity.latitude === "number" &&
      typeof activity.longitude === "number" &&
      activity.latitude !== 0 &&
      activity.longitude !== 0
    ) {
      onActivityClick({
        name: activity.title,
        latitude: activity.latitude,
        longitude: activity.longitude,
        description: activity.description,
        imageUrl: activity.imageUrl,
      });
    }
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(activity.title);
    window.open(`https://en.wikipedia.org/wiki/${encoded}`, "_blank");
  };

  return (
    <div
      className={`
        flex items-stretch bg-white rounded-xl shadow-sm border-2 overflow-hidden
        cursor-pointer select-none
        transition-all duration-200
        ${isRemoving ? "opacity-0 -translate-x-6 scale-95" : "opacity-100"}
        ${
          isDragging
            ? "opacity-25 shadow-none"
            : "hover:shadow-md hover:-translate-y-px"
        }
      `}
      style={
        isDragging
          ? { borderStyle: "dashed", borderColor: "#2d9e8a", borderWidth: 2 }
          : { borderColor: hovered ? "#2d9e8a" : "transparent" }
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleCardClick}
    >
      {/* Drag handle — 28 px wide, visible on hover */}
      <div
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        className={`
          flex items-center justify-center w-7 flex-shrink-0
          cursor-grab active:cursor-grabbing
          text-[#2d9e8a] bg-[#f5faf9] border-r border-[#e8f0ef]
          transition-opacity duration-150
          ${hovered || isDragging ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Six-dot handle */}
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2.5" cy="2"  r="1.5" />
          <circle cx="7.5" cy="2"  r="1.5" />
          <circle cx="2.5" cy="8"  r="1.5" />
          <circle cx="7.5" cy="8"  r="1.5" />
          <circle cx="2.5" cy="14" r="1.5" />
          <circle cx="7.5" cy="14" r="1.5" />
        </svg>
      </div>

      {/* Content: image + text */}
      <div className="flex flex-1 items-center gap-3 p-3 min-w-0">
        {activity.imageUrl && (
          <img
            src={activity.imageUrl}
            alt={activity.title}
            className="w-14 h-14 object-cover rounded-lg flex-shrink-0 shadow-sm"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3
            className="text-sm font-bold text-[#0d3d38] mb-1 hover:underline cursor-pointer truncate"
            onClick={handleTitleClick}
          >
            {activity.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {activity.time && (
              <span className="flex items-center gap-0.5">
                <span className="text-[#2d9e8a]">⏰</span>
                {activity.time}
              </span>
            )}
            {activity.rating != null && (
              <span className="flex items-center gap-0.5">
                <span className="text-yellow-400">★</span>
                {activity.rating}
              </span>
            )}
            {activity.price && (
              <span className="flex items-center gap-0.5">
                <span className="text-green-600">£</span>
                {activity.price}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Remove button — 0 → 44 px slide-in */}
      <div
        className={`
          flex items-center justify-center flex-shrink-0 bg-red-50 border-l border-red-100
          overflow-hidden transition-all duration-300 ease-out
          ${removeMode ? "w-11 opacity-100" : "w-0 opacity-0"}
        `}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-full h-full flex items-center justify-center text-xl font-light
                     text-red-400 hover:text-white hover:bg-red-400
                     transition-colors duration-150"
          title="Remove activity"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

const ItineraryPanel: React.FC<ItineraryPanelProps> = ({
  itinerary,
  onActivityClick,
  onDayClick,
  highlightedDay = null,
  isFavorite = false,
  onToggleFavorite,
  onBackToRoutes,
}) => {
  const [localItinerary, setLocalItinerary] = useState<DayItinerary[]>(itinerary);
  const [removeMode, setRemoveMode] = useState(false);
  // Track which cards are animating out: "dayNumber-activityIndex"
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local state when prop changes (e.g. new route selected)
  useEffect(() => {
    setLocalItinerary(itinerary);
    setRemoveMode(false);
    setRemovingKeys(new Set());
  }, [itinerary]);

  // Fade-in animation for day sections
  useEffect(() => {
    if (!localItinerary || localItinerary.length === 0) return;
    const opts = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.remove("opacity-0", "translate-y-8");
        }
      });
    }, opts);
    if (panelRef.current) {
      panelRef.current.querySelectorAll(".itinerary-day-animated").forEach((el) => {
        (el as HTMLElement).classList.add("opacity-0", "translate-y-8");
        observer.observe(el);
      });
    }
    return () => {
      if (panelRef.current) {
        panelRef.current.querySelectorAll(".itinerary-day-animated").forEach((el) =>
          observer.unobserve(el)
        );
      }
    };
  }, [localItinerary]);

  // ── Drag end ──────────────────────────────────────────────────────────────
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const next = localItinerary.map((d) => ({
      ...d,
      activities: [...d.activities],
    }));

    const srcDay = next.find((d) => `day-${d.day}` === source.droppableId);
    const dstDay = next.find((d) => `day-${d.day}` === destination.droppableId);
    if (!srcDay || !dstDay) return;

    const [moved] = srcDay.activities.splice(source.index, 1);
    dstDay.activities.splice(destination.index, 0, moved);

    setLocalItinerary(next);
  };

  // ── Remove activity ───────────────────────────────────────────────────────
  const handleRemoveActivity = (dayNumber: number, activityIndex: number) => {
    const key = `${dayNumber}-${activityIndex}`;
    setRemovingKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setLocalItinerary((prev) =>
        prev.map((d) =>
          d.day === dayNumber
            ? { ...d, activities: d.activities.filter((_, i) => i !== activityIndex) }
            : d
        )
      );
      setRemovingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 300);
  };

  return (
    <div>
      {/* Back button */}
      {onBackToRoutes && (
        <button
          onClick={onBackToRoutes}
          className="flex items-center gap-1.5 text-sm text-[#1a6b5e] hover:text-[#0d3d38] font-medium mb-4 transition-colors group"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="group-hover:underline">Back to routes</span>
        </button>
      )}

      {/* Header */}
      <div
        className="mb-5 pb-4 border-b-2 border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-4 -mx-4 transition-colors duration-200"
        onClick={() => onDayClick && onDayClick(0)}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Title + subtitle */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Your Itinerary</h2>
            <p className="text-gray-500 text-sm">
              {highlightedDay === null || highlightedDay === 0
                ? "Click a day to filter · drag to reorder"
                : "Click here to show all days again"}
            </p>
          </div>

          {/* Buttons row — favorite + remove, side by side, no overlap */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onToggleFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                className={`w-9 h-9 rounded-full flex items-center justify-center
                           text-base leading-none transition-all duration-150
                           ${isFavorite
                             ? "bg-[#c9a96e] border-[1.5px] border-[#c9a96e] text-white"
                             : "bg-white border-[1.5px] border-[#e8e4df] text-[#b0b0b0] hover:border-[#c9a96e]"
                           }`}
              >
                {isFavorite ? "★" : "☆"}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setRemoveMode((m) => !m); }}
              className={`
                flex items-center gap-1 text-xs font-semibold
                px-3 py-1.5 rounded-full border transition-all duration-200
                ${removeMode
                  ? "bg-red-500 text-white border-red-500 shadow-sm"
                  : "bg-white text-gray-400 border-[#e8e4df] hover:text-red-400 hover:border-red-300"
                }
              `}
            >
              {removeMode ? "✓ Done" : "✎ Edit"}
            </button>
          </div>
        </div>
      </div>

      {/* Drag hint */}
      <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-[#e8f7f5] border border-[#cde8e4] text-xs text-[#2d9e8a]">
        <span className="text-base leading-none select-none">⠿</span>
        <span>Hover a card and drag the <strong>⠿ handle</strong> to reorder · drag across days</span>
      </div>

      {localItinerary.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No itinerary available.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div ref={panelRef}>
            {localItinerary.map((dayItem) => (
              <div
                key={dayItem.day}
                onClick={() => onDayClick && onDayClick(dayItem.day)}
                className={`
                  itinerary-day-animated relative border-l-4 pl-6 mb-8 cursor-pointer
                  transition-all duration-500 ease-in-out
                  ${highlightedDay === dayItem.day
                    ? "border-[#1a6b5e] bg-[#f0faf8]/50 -ml-4 pl-10 rounded-r-2xl py-2"
                    : "border-[#2d9e8a] hover:border-[#1a6b5e]"
                  }
                `}
              >
                {/* Day circle */}
                <div
                  className={`
                    absolute -left-5 top-0 w-10 h-10 rounded-full
                    text-white font-bold flex items-center justify-center shadow-md
                    transition-all duration-500
                    ${highlightedDay === dayItem.day
                      ? "bg-gradient-to-br from-[#0d3d38] to-[#2d9e8a] scale-125"
                      : "bg-gradient-to-br from-[#0d3d38] to-[#1a6b5e]"
                    }
                  `}
                >
                  {dayItem.day}
                </div>

                {/* Day header + activity count badge */}
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{dayItem.title}</h3>
                    <p className="text-gray-500 text-sm mt-0.5">{dayItem.date}</p>
                  </div>
                  <span
                    className={`
                      mt-1 text-xs font-medium px-2.5 py-1 rounded-full border
                      ${dayItem.activities.length === 0
                        ? "text-gray-400 bg-gray-50 border-gray-200"
                        : "text-[#2d9e8a] bg-[#e8f7f5] border-[#cde8e4]"
                      }
                    `}
                  >
                    {dayItem.activities.length === 0
                      ? "Empty"
                      : `${dayItem.activities.length} activit${dayItem.activities.length === 1 ? "y" : "ies"}`}
                  </span>
                </div>

                {/* Drop zone */}
                <Droppable droppableId={`day-${dayItem.day}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`
                        space-y-2 rounded-2xl transition-all duration-200
                        ${snapshot.isDraggingOver
                          ? "bg-[#e8f7f5]/60 ring-2 ring-[#2d9e8a]/50 ring-offset-2 p-1"
                          : "p-0"
                        }
                      `}
                    >
                      {dayItem.activities.length === 0 ? (
                        /* Empty placeholder */
                        <div
                          className={`
                            flex items-center justify-center h-[54px] rounded-2xl
                            transition-all duration-200
                            ${snapshot.isDraggingOver
                              ? "border-2 border-[#2d9e8a] bg-[#e8f7f5]"
                              : "border-[1.5px] border-dashed border-[#cde8e4]"
                            }
                          `}
                        >
                          <span
                            className={`text-sm transition-colors duration-200 ${
                              snapshot.isDraggingOver ? "text-[#2d9e8a] font-medium" : "text-[#a8d5cf]"
                            }`}
                          >
                            ⊕ Drop an activity here
                          </span>
                        </div>
                      ) : (
                        dayItem.activities.map((activity, index) => {
                          const removeKey = `${dayItem.day}-${index}`;
                          return (
                            <Draggable
                              key={`${dayItem.day}-${activity.title}-${index}`}
                              draggableId={`${dayItem.day}-${activity.title}-${index}`}
                              index={index}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DraggableCard
                                    activity={activity}
                                    dragHandleProps={provided.dragHandleProps}
                                    isDragging={snapshot.isDragging}
                                    removeMode={removeMode}
                                    isRemoving={removingKeys.has(removeKey)}
                                    onRemove={() =>
                                      handleRemoveActivity(dayItem.day, index)
                                    }
                                    onActivityClick={onActivityClick}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};

export default ItineraryPanel;
