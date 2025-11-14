// src/components/RouteSelection/RouteCard.tsx

import React from "react";
import { RouteOption } from "@/types/routes";
import { FavoriteButton } from "../UI";

interface RouteCardProps {
  route: RouteOption;
  onSelect: (routeId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (routeId: string) => void;
}

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onSelect,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片的 onClick
    if (onToggleFavorite) {
      onToggleFavorite(route.id); // 直接调用收藏切换
    }
  };

  return (
    <div
      onClick={() => onSelect(route.id)}
      className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl
                 transition-all duration-500 cursor-pointer
                 border-3 border-transparent hover:border-blue-500
                 transform hover:-translate-y-2 active:scale-98 relative"
    >
      {/* 收藏按钮 */}
      {onToggleFavorite && (
        <div className="absolute top-4 right-4 z-10" onClick={handleFavoriteClick}>
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={() => {}} // 空函数，因为已经在 handleFavoriteClick 中处理了
            size="medium"
          />
        </div>
      )}

      {/* Badge */}
      <div
        className="inline-block px-4 py-2 rounded-full text-white font-bold text-sm mb-4"
        style={{
          background: `linear-gradient(135deg, ${
            route.badgeColor || "#667eea"
          } 0%, #764ba2 100%)`,
        }}
      >
        {route.badge}
      </div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-gray-800 mb-3">{route.title}</h3>

      {/* Description */}
      <p className="text-gray-600 leading-relaxed mb-4 line-clamp-3">
        {route.description}
      </p>

      {/* Highlights */}
      <div className="flex flex-wrap gap-2">
        {(route.highlights || []).map((highlight, index) => (
          <span
            key={index}
            className="px-3 py-1.5 bg-gray-100 rounded-full text-sm text-gray-700
                       flex items-center gap-1"
          >
            {highlight.icon && <span>{highlight.icon}</span>}
            {highlight.label}
          </span>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
        <span className="text-gray-500">
          📅 {route.days} {route.days === 1 ? "Day" : "Days"}
        </span>
        {route.intensity && (
          <span className="text-gray-500 capitalize">
            {route.intensity === "easy" && "⚡ Relaxed"}
            {route.intensity === "moderate" && "⚡⚡ Moderate"}
            {route.intensity === "high" && "⚡⚡⚡ Intense"}
          </span>
        )}
      </div>
    </div>
  );
};

export default RouteCard;
