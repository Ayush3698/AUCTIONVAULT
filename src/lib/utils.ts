import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
  return num.toLocaleString();
}

export function getTimeRemaining(endDate: string): { days: number; hours: number; minutes: number; seconds: number; total: number } {
  const total = new Date(endDate).getTime() - Date.now();
  if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  return {
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getRelativeTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", type: "fiat" as const },
  { code: "EUR", symbol: "€", name: "Euro", type: "fiat" as const },
  { code: "GBP", symbol: "£", name: "British Pound", type: "fiat" as const },
  { code: "INR", symbol: "₹", name: "Indian Rupee", type: "fiat" as const },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", type: "fiat" as const },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", type: "fiat" as const },
  { code: "BTC", symbol: "₿", name: "Bitcoin", type: "crypto" as const },
  { code: "ETH", symbol: "Ξ", name: "Ethereum", type: "crypto" as const },
  { code: "USDC", symbol: "$", name: "USD Coin", type: "stablecoin" as const },
  { code: "USDT", symbol: "$", name: "Tether", type: "stablecoin" as const },
];

export const CATEGORIES = [
  { id: "art", name: "Art", icon: "🎨", count: 1243 },
  { id: "watches", name: "Watches", icon: "⌚", count: 892 },
  { id: "cars", name: "Cars", icon: "🚗", count: 654 },
  { id: "jewelry", name: "Jewelry", icon: "💎", count: 1102 },
  { id: "collectibles", name: "Collectibles", icon: "🏆", count: 987 },
  { id: "electronics", name: "Electronics", icon: "📱", count: 2341 },
  { id: "fashion", name: "Fashion", icon: "👗", count: 756 },
  { id: "real-estate", name: "Real Estate", icon: "🏠", count: 321 },
  { id: "antiques", name: "Antiques", icon: "🏺", count: 543 },
  { id: "sports", name: "Sports Memorabilia", icon: "⚽", count: 678 },
  { id: "luxury", name: "Luxury Goods", icon: "👑", count: 432 },
  { id: "digital", name: "Digital Assets", icon: "🔗", count: 1567 },
];
