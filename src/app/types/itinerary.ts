// src/app/types/itinerary.ts (或者直接添加到 src/app/types/index.ts)

export interface Activity {
  title: string;
  description: string;
  time: string;
  rating?: number; // 可选
  price?: string; // 可选，可以是"Free"或具体金额
  imageUrl?: string; // 可选
  latitude?: number; // 活动地点的纬度
  longitude?: number; // 活动地点的经度
}

export interface DayItinerary {
  day: number;
  title: string;
  date: string; // 格式通常为 "YYYY-MM-DD"
  theme: string;
  activities: Activity[];
}

export interface GeneratedItinerary {
  id?: string; // 如果后端会保存行程并返回ID
  name: string; // 行程总名称，例如 "欧洲文化之旅"
  startDate: string; // 行程开始日期 "YYYY-MM-DD"
  endDate: string; // 行程结束日期 "YYYY-MM-DD"
  itineraryDays: DayItinerary[];
}
