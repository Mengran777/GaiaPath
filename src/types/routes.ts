// src/types/routes.ts

import { DayItinerary } from "./itinerary";

/**
 * 路线选项的单个标签/亮点
 */
export interface RouteHighlight {
  label: string;
  icon?: string;
}

/**
 * 单条路线选项
 */
export interface RouteOption {
  id: string;
  badge: string; // 例如: "🏛️ Classic Route"
  badgeColor?: string; // 例如: "#667eea"
  title: string;
  description: string;
  highlights: RouteHighlight[];
  days: number;
  estimatedBudget?: string;
  intensity?: "easy" | "moderate" | "high";
  itinerary: DayItinerary[]; // 完整的行程数据
}

/**
 * AI 生成的多路线响应
 */
export interface MultiRouteResponse {
  destination: string;
  startDate: string;
  endDate: string;
  routes: RouteOption[];
}

/**
 * 路线生成请求参数
 */
export interface RouteGenerationRequest {
  destination: string;
  travelStartDate: string;
  travelEndDate: string;
  travelers: string;
  travelType: string[];
  transportation: string[];
  activityIntensity: string;
  specialNeeds: string[];
  userId: string;
}
