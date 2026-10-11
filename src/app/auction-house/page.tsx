"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpDown,
  BadgeCheck,
  ChevronDown,
  Clock,
  Eye,
  Filter,
  Flame,
  Gavel,
  Grid,
  Heart,
  List,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { mockAuctions } from "@/lib/data";
import {
  CATEGORIES,
  CURRENCIES,
  cn,
  formatCurrency,
  formatNumber,
  getTimeRemaining,
} from "@/lib/utils";
import type { Auction } from "@/lib/types";

const PAGE_SIZE = 6;

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  ...CATEGORIES.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "live", label: "Live" },
  { value: "ending-soon", label: "Ending Soon" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sold", label: "Sold" },
];

const STATUS_LABELS: Record<string, string> = {
  live: "Live",
  "ending-soon": "Ending Soon",
  scheduled: "Scheduled",
  sold: "Sold",
};

const CONDITION_OPTIONS = [
  { value: "all", label: "All Conditions" },
  ...["New", "Like New", "Excellent", "Good", "Fair"].map((condition) => ({
    value: condition,
    label: condition,
  })),
];

const CURRENCY_OPTIONS = [
  { value: "all", label: "All Currencies" },
  ...CURRENCIES.map((currency) => ({
    value: currency.code,
    label: `${currency.symbol} ${currency.code}`,
  })),
];

const COUNTRY_OPTIONS = [
  { value: "all", label: "All Locations" },
  ...Array.from(
    new Set(
      mockAuctions
        .map((auction) => auction.location.split(",").pop()?.trim() ?? "")
        .filter(Boolean)
    )
  )
    .sort()
    .map((country) => ({ value: country, label: country })),
];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "ending-soon", label: "Ending Soon" },
  { value: "highest-bid", label: "Highest Bid" },
  { value: "lowest-bid", label: "Lowest Bid" },
  { value: "most-bids", label: "Most Bids" },
  { value: "most-viewed", label: "Most Viewed" },
  { value: "trending", label: "Trending" },
];

type TimeRemaining = ReturnType<typeof getTimeRemaining>;

function useNow() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}

function formatCompact(t: TimeRemaining): string {
  if (t.days > 0) return `${t.days}d ${t.hours}h`;
  if (t.hours > 0) return `${t.hours}h ${t.minutes}m`;
  if (t.minutes > 0) return `${t.minutes}m ${t.seconds}s`;
  return `${t.seconds}s`;
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon?: LucideIcon;
  active?: boolean;
  align?: "left" | "right";
  className?: string;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon,
  active = false,
  align = "left",
  className,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative z-40 inline-flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
          active || open
            ? "border-[#c8a44e]/40 bg-[#c8a44e]/10 text-[#e8d48b]"
            : "border-zinc-800 bg-[#0b0b0e] text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{selected?.label ?? label}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute top-full z-50 mt-2 max-h-72 w-full min-w-[180px] overflow-auto rounded-xl border border-zinc-800 bg-[#121216]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-xl",
              align === "right" ? "right-0" : "left-0"
            )}
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    option.value === value
                      ? "bg-[#c8a44e]/15 text-[#d4b565]"
                      : "text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200"
                  )}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-white/80" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
        </span>
        Live
      </span>
    );
  }

  if (status === "ending-soon") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f59e0b]/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-black">
        <Clock className="h-3 w-3" />
        Ending Soon
      </span>
    );
  }

  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
        Scheduled
      </span>
    );
  }

  if (status === "sold") {
    return (
      <span className="inline-flex items-center rounded-full bg-zinc-700/90 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-200">
        Sold
      </span>
    );
  }

  return null;
}

function TrendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#c8a44e]/30 bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-[#e8d48b]">
      <Flame className="h-3 w-3" />
      Trending
    </span>
  );
}

interface CardProps {
  auction: Auction;
  watched: boolean;
  onToggleWatch: (id: string) => void;
}

function AuctionCard({ auction, watched, onToggleWatch }: CardProps) {
  const now = useNow();
  const remaining = now ? getTimeRemaining(auction.endTime) : null;
  const urgent = remaining !== null && remaining.total < 6 * 60 * 60 * 1000;
  const category = CATEGORIES.find((c) => c.id === auction.category);
  const isNew = now !== null && now - new Date(auction.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25 }}
      className="glass card-glow group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 transition-all duration-300 hover:border-[#c8a44e]/40"
    >
      <div className="relative h-44 overflow-hidden rounded-t-2xl bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,164,78,0.16),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-lg">
          {category?.icon ?? "🔖"}
        </span>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StatusBadge status={auction.status} />
          {auction.trending && <TrendingBadge />}
        </div>

        <button
          type="button"
          onClick={() => onToggleWatch(auction.id)}
          aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
          className={cn(
            "absolute right-3 top-3 rounded-full border p-2 transition-all duration-200",
            watched
              ? "border-red-500/40 bg-red-500/20"
              : "border-zinc-700/60 bg-black/60 hover:border-red-500/40 hover:bg-red-500/10"
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              watched ? "fill-red-500 text-red-500" : "text-zinc-200"
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-100">
          {auction.title}
        </h3>

        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700/70 text-[10px] font-semibold text-zinc-300">
            {auction.seller.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span className="truncate text-xs text-zinc-400">
            {auction.seller.displayName}
          </span>
          {auction.seller.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#c8a44e]" />
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500">
            <Users className="h-3 w-3" />
            {formatNumber(auction.participantCount)} bidders
          </span>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-bold leading-none text-gradient-gold tabular-nums">
              {formatCurrency(auction.currentBid, auction.currency)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Starting bid {formatCurrency(auction.startingBid, auction.currency)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Gavel className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatNumber(auction.bidCount)}</span>
            bids
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatNumber(auction.watcherCount)}</span>
            watching
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className={cn("h-3.5 w-3.5", urgent ? "text-[#f59e0b]" : "text-zinc-500")} />
            {remaining ? (
              <span
                className={cn(
                  "font-mono text-sm font-bold tabular-nums",
                  urgent ? "text-[#f59e0b]" : "text-zinc-200"
                )}
              >
                {formatCompact(remaining)}
              </span>
            ) : (
              <span className="font-semibold text-zinc-500">—</span>
            )}
            {remaining && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">left</span>
            )}
          </span>
          {isNew && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              New
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            <MapPin className="h-3 w-3 text-zinc-500" />
            {auction.location}
          </span>
          <span className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
            {category?.name ?? auction.category}
          </span>
          <span className="rounded-full border border-[#c8a44e]/20 bg-[#c8a44e]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#d4b565]">
            {auction.condition}
          </span>
        </div>

        <Link
          href={`/auction/${auction.id}`}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] text-sm font-semibold text-black transition-all duration-300 hover:bg-[#d4b565] hover:shadow-[0_0_24px_rgba(200,164,78,0.35)]"
        >
          View Auction
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}

function AuctionListRow({ auction, watched, onToggleWatch }: CardProps) {
  const now = useNow();
  const remaining = now ? getTimeRemaining(auction.endTime) : null;
  const urgent = remaining !== null && remaining.total < 6 * 60 * 60 * 1000;
  const category = CATEGORIES.find((c) => c.id === auction.category);
  const isNew = now !== null && now - new Date(auction.createdAt).getTime() < 2 * 24 * 60 * 60 * 1000;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="glass card-glow group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/60 transition-all duration-300 hover:border-[#c8a44e]/40 sm:flex-row"
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-800 sm:h-auto sm:w-56">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,164,78,0.16),transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent sm:bg-gradient-to-r" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl drop-shadow-lg">
          {category?.icon ?? "🔖"}
        </span>

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StatusBadge status={auction.status} />
          {auction.trending && <TrendingBadge />}
        </div>

        <button
          type="button"
          onClick={() => onToggleWatch(auction.id)}
          aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
          className={cn(
            "absolute right-3 top-3 rounded-full border p-2 transition-all duration-200",
            watched
              ? "border-red-500/40 bg-red-500/20"
              : "border-zinc-700/60 bg-black/60 hover:border-red-500/40 hover:bg-red-500/10"
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              watched ? "fill-red-500 text-red-500" : "text-zinc-200"
            )}
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="max-w-2xl line-clamp-2 text-base font-semibold leading-snug text-zinc-100">
            {auction.title}
          </h3>
          <div className="flex items-center gap-1.5">
            {isNew && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                New
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700/70 text-[10px] font-semibold text-zinc-300">
            {auction.seller.displayName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span className="truncate text-xs text-zinc-400">
            {auction.seller.displayName}
          </span>
          {auction.seller.verified && (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[#c8a44e]" />
          )}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xl font-bold leading-none text-gradient-gold tabular-nums">
              {formatCurrency(auction.currentBid, auction.currency)}
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Starting bid {formatCurrency(auction.startingBid, auction.currency)}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Clock className={cn("h-3.5 w-3.5", urgent ? "text-[#f59e0b]" : "text-zinc-500")} />
            {remaining ? (
              <span
                className={cn(
                  "font-mono text-sm font-bold tabular-nums",
                  urgent ? "text-[#f59e0b]" : "text-zinc-200"
                )}
              >
                {formatCompact(remaining)}
              </span>
            ) : (
              <span className="font-semibold text-zinc-500">—</span>
            )}
            {remaining && (
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">left</span>
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-zinc-800/60 pt-3 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Gavel className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatNumber(auction.bidCount)}</span>
            bids
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatNumber(auction.watcherCount)}</span>
            watching
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold text-zinc-300">{formatNumber(auction.participantCount)}</span>
            bidders
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            {auction.location}
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-zinc-700/60 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
              {category?.name ?? auction.category}
            </span>
            <span className="rounded-full border border-[#c8a44e]/20 bg-[#c8a44e]/[0.08] px-2 py-0.5 text-[10px] font-medium text-[#d4b565]">
              {auction.condition}
            </span>
          </div>

          <Link
            href={`/auction/${auction.id}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-5 text-sm font-semibold text-black transition-all duration-300 hover:bg-[#d4b565] hover:shadow-[0_0_24px_rgba(200,164,78,0.35)]"
          >
            View Auction
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-[#0b0b0e]">
        <Filter className="h-8 w-8 text-[#c8a44e]" />
      </div>
      <h3 className="text-lg font-semibold text-zinc-100">No auctions found</h3>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
        We couldn&apos;t find any auctions matching your current filters. Try adjusting your search
        criteria or clearing all filters to browse the full marketplace.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#c8a44e] px-5 text-sm font-semibold text-black transition-all duration-300 hover:bg-[#d4b565] hover:shadow-[0_0_24px_rgba(200,164,78,0.35)]"
      >
        <X className="h-4 w-4" />
        Clear all filters
      </button>
    </motion.div>
  );
}

function AuctionHouseContent() {
  const searchParams = useSearchParams();
  const paramCategory = searchParams.get("category");

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(
    paramCategory && CATEGORIES.some((c) => c.id === paramCategory) ? paramCategory : "all"
  );
  const [status, setStatus] = useState("all");
  const [condition, setCondition] = useState("all");
  const [currency, setCurrency] = useState("all");
  const [country, setCountry] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recommended");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    let list = [...mockAuctions];

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (auction) =>
          auction.title.toLowerCase().includes(q) ||
          auction.description.toLowerCase().includes(q)
      );
    }

    if (category !== "all") list = list.filter((auction) => auction.category === category);
    if (status !== "all") list = list.filter((auction) => auction.status === status);
    if (condition !== "all") list = list.filter((auction) => auction.condition === condition);
    if (currency !== "all") list = list.filter((auction) => auction.currency === currency);
    if (country !== "all") {
      list = list.filter(
        (auction) => (auction.location.split(",").pop()?.trim() ?? "") === country
      );
    }
    if (verifiedOnly) list = list.filter((auction) => auction.seller.verified);

    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    if (min !== null || max !== null) {
      list = list.filter((auction) => {
        if (min !== null && auction.currentBid < min) return false;
        if (max !== null && auction.currentBid > max) return false;
        return true;
      });
    }

    switch (sort) {
      case "newest":
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "ending-soon":
        list.sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
        break;
      case "highest-bid":
        list.sort((a, b) => b.currentBid - a.currentBid);
        break;
      case "lowest-bid":
        list.sort((a, b) => a.currentBid - b.currentBid);
        break;
      case "most-bids":
        list.sort((a, b) => b.bidCount - a.bidCount);
        break;
      case "most-viewed":
        list.sort((a, b) => b.watcherCount - a.watcherCount);
        break;
      case "trending":
        list.sort(
          (a, b) => Number(b.trending) - Number(a.trending) || b.watcherCount - a.watcherCount
        );
        break;
      default:
        list.sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) || b.watcherCount - a.watcherCount
        );
    }

    return list;
  }, [query, category, status, condition, currency, country, verifiedOnly, minPrice, maxPrice, sort]);

  const visible = filtered.slice(0, visibleCount);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];

    if (query.trim()) {
      chips.push({
        key: "q",
        label: `"${query.trim()}"`,
        onRemove: () => setQuery(""),
      });
    }
    if (category !== "all") {
      chips.push({
        key: "category",
        label: CATEGORIES.find((c) => c.id === category)?.name ?? category,
        onRemove: () => setCategory("all"),
      });
    }
    if (status !== "all") {
      chips.push({
        key: "status",
        label: STATUS_LABELS[status] ?? status,
        onRemove: () => setStatus("all"),
      });
    }
    if (condition !== "all") {
      chips.push({
        key: "condition",
        label: condition,
        onRemove: () => setCondition("all"),
      });
    }
    if (currency !== "all") {
      chips.push({
        key: "currency",
        label: `Currency: ${currency}`,
        onRemove: () => setCurrency("all"),
      });
    }
    if (country !== "all") {
      chips.push({
        key: "country",
        label: `Location: ${country}`,
        onRemove: () => setCountry("all"),
      });
    }
    if (verifiedOnly) {
      chips.push({
        key: "verified",
        label: "Verified sellers only",
        onRemove: () => setVerifiedOnly(false),
      });
    }
    if (minPrice || maxPrice) {
      chips.push({
        key: "price",
        label: `Price ${minPrice ? formatCurrency(Number(minPrice), currency === "all" ? "USD" : currency) : "$0"} – ${
          maxPrice ? formatCurrency(Number(maxPrice), currency === "all" ? "USD" : currency) : "∞"
        }`,
        onRemove: () => {
          setMinPrice("");
          setMaxPrice("");
        },
      });
    }

    return chips;
  }, [query, category, status, condition, currency, country, verifiedOnly, minPrice, maxPrice]);

  const clearAllFilters = () => {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setCondition("all");
    setCurrency("all");
    setCountry("all");
    setVerifiedOnly(false);
    setMinPrice("");
    setMaxPrice("");
    setSort("recommended");
  };

  const filterSignature = [
    query,
    category,
    status,
    condition,
    currency,
    country,
    verifiedOnly,
    minPrice,
    maxPrice,
    sort,
    view,
  ].join("|");
  const [prevSignature, setPrevSignature] = useState(filterSignature);
  if (prevSignature !== filterSignature) {
    setPrevSignature(filterSignature);
    setVisibleCount(PAGE_SIZE);
  }

  const toggleWatchlist = (id: string) =>
    setWatchlist((w) => ({ ...w, [id]: !w[id] }));

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Recommended";
  const liveNow = mockAuctions.filter(
    (a) => a.status === "live" || a.status === "ending-soon"
  ).length;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <section className="relative overflow-hidden border-b border-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(200,164,78,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#c8a44e]/25 bg-[#c8a44e]/10 px-3 py-1 text-xs font-semibold text-[#e8d48b]">
                <Gavel className="h-3.5 w-3.5" />
                Marketplace
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
                Auction <span className="gold-gradient">House</span>
              </h1>
              <p className="mt-2 text-sm text-zinc-400 sm:text-base">
                Discover premium auctions from around the world
              </p>
            </div>

            <div className="flex items-center gap-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-gradient-gold tabular-nums">
                  {formatNumber(liveNow)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  Live now
                </p>
              </div>
              <div className="h-10 w-px bg-zinc-800" />
              <div className="text-center">
                <p className="text-2xl font-bold text-zinc-100 tabular-nums">
                  {formatNumber(mockAuctions.length)}
                </p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500">
                  <Users className="h-3 w-3" />
                  Total auctions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-16 z-40 border-b border-zinc-800/50 glass">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 basis-full sm:basis-auto sm:min-w-[260px] sm:flex-none sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search auctions, brands, sellers..."
                className="h-10 w-full rounded-xl border border-zinc-800 bg-[#0b0b0e] pl-9 pr-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#c8a44e]/50"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
                filtersOpen || activeFilters.length > 0
                  ? "border-[#c8a44e]/40 bg-[#c8a44e]/10 text-[#e8d48b]"
                  : "border-zinc-800 bg-[#0b0b0e] text-zinc-300 hover:border-zinc-700 hover:text-zinc-100"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilters.length > 0 && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#c8a44e] text-[10px] font-bold text-black">
                  {activeFilters.length}
                </span>
              )}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-200", filtersOpen && "rotate-180")}
              />
            </button>

            <FilterSelect
              label="Sort"
              value={sort}
              options={SORT_OPTIONS}
              onChange={setSort}
              icon={ArrowUpDown}
              align="right"
              className="min-w-[160px] flex-none"
            />

            <div className="flex h-10 flex-none items-center rounded-xl border border-zinc-800 bg-[#0b0b0e] p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                aria-label="Grid view"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === "grid"
                    ? "bg-[#c8a44e]/15 text-[#d4b565]"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                aria-label="List view"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  view === "list"
                    ? "bg-[#c8a44e]/15 text-[#d4b565]"
                    : "text-zinc-500 hover:text-zinc-200"
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-10 flex-none items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/20"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          <AnimatePresence initial={false}>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 pt-3 md:grid-cols-4 lg:flex lg:flex-wrap">
                  <FilterSelect
                    label="Category"
                    value={category}
                    options={CATEGORY_OPTIONS}
                    onChange={setCategory}
                    active={category !== "all"}
                    className="min-w-[150px] flex-none"
                  />
                  <FilterSelect
                    label="Status"
                    value={status}
                    options={STATUS_OPTIONS}
                    onChange={setStatus}
                    active={status !== "all"}
                    className="min-w-[150px] flex-none"
                  />
                  <FilterSelect
                    label="Condition"
                    value={condition}
                    options={CONDITION_OPTIONS}
                    onChange={setCondition}
                    active={condition !== "all"}
                    className="min-w-[150px] flex-none"
                  />
                  <FilterSelect
                    label="Currency"
                    value={currency}
                    options={CURRENCY_OPTIONS}
                    onChange={setCurrency}
                    active={currency !== "all"}
                    className="min-w-[150px] flex-none"
                  />
                  <FilterSelect
                    label="Location"
                    value={country}
                    options={COUNTRY_OPTIONS}
                    onChange={setCountry}
                    icon={MapPin}
                    active={country !== "all"}
                    className="min-w-[150px] flex-none"
                  />

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-zinc-500">Price</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="h-10 w-20 rounded-xl border border-zinc-800 bg-[#0b0b0e] px-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#c8a44e]/50"
                    />
                    <span className="text-xs text-zinc-600">—</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="h-10 w-20 rounded-xl border border-zinc-800 bg-[#0b0b0e] px-2.5 text-sm text-zinc-200 outline-none transition-colors placeholder:text-zinc-600 focus:border-[#c8a44e]/50"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setVerifiedOnly((v) => !v)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors",
                      verifiedOnly
                        ? "border-[#c8a44e]/40 bg-[#c8a44e]/15 text-[#e8d48b]"
                        : "border-zinc-800 bg-[#0b0b0e] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    <BadgeCheck className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Verified Sellers</span>
                    <span
                      className={cn(
                        "relative h-4 w-7 shrink-0 rounded-full transition-colors",
                        verifiedOnly ? "bg-[#c8a44e]" : "bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
                          verifiedOnly ? "left-[14px]" : "left-0.5"
                        )}
                      />
                    </span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeFilters.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {activeFilters.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#c8a44e]/25 bg-[#c8a44e]/10 px-3 py-1 text-xs font-medium text-[#e8d48b]"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter ${chip.label}`}
                  className="rounded-full p-0.5 text-[#e8d48b]/70 transition-colors hover:bg-[#c8a44e]/20 hover:text-[#e8d48b]"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            Showing{" "}
            <span className="font-semibold text-zinc-200">{visible.length}</span> of{" "}
            <span className="font-semibold text-zinc-200">{filtered.length}</span> auctions
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sorted by{" "}
            <span className="font-medium text-zinc-300">{currentSortLabel}</span>
          </p>
        </div>

        {filtered.length === 0 ? (
          <EmptyState onClear={clearAllFilters} />
        ) : view === "grid" ? (
          <motion.div layout className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {visible.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  watched={Boolean(watchlist[auction.id])}
                  onToggleWatch={toggleWatchlist}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div layout className="space-y-4">
            <AnimatePresence mode="popLayout">
              {visible.map((auction) => (
                <AuctionListRow
                  key={auction.id}
                  auction={auction}
                  watched={Boolean(watchlist[auction.id])}
                  onToggleWatch={toggleWatchlist}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filtered.length > 0 && visibleCount < filtered.length && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#c8a44e]/40 bg-[#c8a44e]/10 px-6 text-sm font-semibold text-[#e8d48b] transition-all duration-300 hover:bg-[#c8a44e]/20 hover:shadow-[0_0_20px_rgba(200,164,78,0.2)]"
            >
              Load More
              <ChevronDown className="h-4 w-4" />
            </button>
            <p className="text-xs text-zinc-500">
              {filtered.length - visibleCount} more auction{filtered.length - visibleCount === 1 ? "" : "s"} available
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="h-8 w-64 animate-pulse rounded-lg bg-zinc-800" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-zinc-800" />
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-[420px] animate-pulse rounded-2xl border border-zinc-800/60 bg-[#0f0f12]"
          />
        ))}
      </div>
    </div>
  );
}

export default function AuctionHousePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuctionHouseContent />
    </Suspense>
  );
}