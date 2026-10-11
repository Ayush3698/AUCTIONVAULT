"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { cn, formatCurrency, getRelativeTime, getTimeRemaining } from "@/lib/utils";
import { mockHistory } from "@/lib/data";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
import {
  Clock,
  Trophy,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  ChevronDown,
  ExternalLink,
  Info,
  MessageSquare,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Send,
} from "lucide-react";
import { motion, AnimatePresence, type Variants, type Transition } from "framer-motion";

const springTransition: Transition = { type: "spring", damping: 22, stiffness: 220 };

const CATEGORY_EMOJI: Record<string, string> = {
  art: "🎨",
  watches: "⌚",
  cars: "🚗",
  jewelry: "💎",
  collectibles: "🏆",
  electronics: "📱",
  fashion: "👗",
  "real-estate": "🏠",
  antiques: "🏺",
  sports: "⚽",
  luxury: "👑",
  digital: "🔗",
};

const STATUS_TABS = ["All", "Active", "Won", "Lost", "Payment Pending", "Completed", "Disputed"] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const SORT_OPTIONS = ["Newest", "Oldest", "Highest Value", "Lowest Value"] as const;

type SortOption = (typeof SORT_OPTIONS)[number];

const COMPLAINT_CATEGORIES = [
  "Product not as described",
  "Damaged product",
  "Fraud/suspicious activity",
  "Payment issue",
  "Seller issue",
  "Delivery issue",
  "Wrong product",
  "Other",
];

const statusMeta: Record<
  string,
  { label: string; badgeClass: string; dotClass: string; iconClass: string }
> = {
  active: {
    label: "Active",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-400",
    iconClass: "text-blue-400",
  },
  won: {
    label: "Won",
    badgeClass: "bg-[#c8a44e]/10 text-[#c8a44e] border-[#c8a44e]/20",
    dotClass: "bg-[#c8a44e]",
    iconClass: "text-[#c8a44e]",
  },
  lost: {
    label: "Lost",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-400",
    iconClass: "text-red-400",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
    dotClass: "bg-green-400",
    iconClass: "text-green-400",
  },
  disputed: {
    label: "Disputed",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400",
    iconClass: "text-amber-400",
  },
};

const paymentMeta: Record<string, { label: string; badgeClass: string }> = {
  pending: {
    label: "Pending",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  paid: {
    label: "Paid",
    badgeClass: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  refunded: {
    label: "Refunded",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  disputed: {
    label: "Disputed",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springTransition,
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const modalOverlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalContentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", damping: 26, stiffness: 280 },
  },
  exit: { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.15 } },
};

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status];
  if (!meta) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.badgeClass
      )}
    >
      {status === "won" && <Trophy className="h-3 w-3" />}
      {status === "lost" && <XCircle className="h-3 w-3" />}
      {status === "disputed" && <AlertTriangle className="h-3 w-3" />}
      {status === "active" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
        </span>
      )}
      {status === "completed" && <CheckCircle className="h-3 w-3" />}
      {meta.label}
    </span>
  );
}

function ActiveCountdown({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState<ReturnType<typeof getTimeRemaining> | null>(null);

  useEffect(() => {
    const id = setInterval(() => setRemaining(getTimeRemaining(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  const text =
    remaining !== null && remaining.total > 0
      ? remaining.days > 0
        ? `Ends in ${remaining.days}d ${remaining.hours}h`
        : remaining.hours > 0
          ? `Ends in ${remaining.hours}h ${remaining.minutes}m`
          : `Ends in ${remaining.minutes}m ${remaining.seconds}s`
      : "Ended";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        remaining !== null && remaining.total > 0 ? "text-blue-400" : "text-zinc-500"
      )}
    >
      <Clock className="h-3 w-3" />
      {remaining === null ? "Ends in —" : text}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  if (status === "none") return null;
  const meta = paymentMeta[status];
  if (!meta) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        meta.badgeClass
      )}
    >
      {status === "paid" ? (
        <CheckCircle className="h-3 w-3" />
      ) : status === "pending" ? (
        <Clock className="h-3 w-3" />
      ) : status === "refunded" ? (
        <FileText className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {meta.label}
    </span>
  );
}

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  const [infoItem, setInfoItem] = useState<typeof mockHistory[number] | null>(null);
  const [complaintItem, setComplaintItem] = useState<typeof mockHistory[number] | null>(null);

  const stats = useMemo(() => {
    const total = mockHistory.length;
    const won = mockHistory.filter(
      (item) => item.won || item.status === "won"
    ).length;
    const lost = mockHistory.filter(
      (item) => item.status === "lost" || (item.status === "completed" && !item.won) || item.status === "disputed"
    ).length;
    const active = mockHistory.filter((item) => item.status === "active").length;
    const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
    const totalSpent = mockHistory
      .filter((item) => item.won && item.paymentStatus === "paid")
      .reduce((sum, item) => sum + item.userBid, 0);

    return { total, won, lost, active, winRate, totalSpent };
  }, []);

  const filteredItems = useMemo(() => {
    let items = [...mockHistory];

    if (activeTab !== "All") {
      switch (activeTab) {
        case "Active":
          items = items.filter((item) => item.status === "active");
          break;
        case "Won":
          items = items.filter((item) => item.won || item.status === "won");
          break;
        case "Lost":
          items = items.filter((item) => item.status === "lost" || (item.status === "completed" && !item.won));
          break;
        case "Payment Pending":
          items = items.filter((item) => item.paymentStatus === "pending");
          break;
        case "Completed":
          items = items.filter((item) => item.status === "completed");
          break;
        case "Disputed":
          items = items.filter((item) => item.status === "disputed");
          break;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.auction.title.toLowerCase().includes(q) ||
          item.auction.id.toLowerCase().includes(q) ||
          item.auction.seller.displayName.toLowerCase().includes(q) ||
          item.auction.category.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "Highest Value":
        items.sort((a, b) => b.userBid - a.userBid);
        break;
      case "Lowest Value":
        items.sort((a, b) => a.userBid - b.userBid);
        break;
      case "Oldest":
        items.sort(
          (a, b) =>
            new Date(a.auction.startTime).getTime() - new Date(b.auction.startTime).getTime()
        );
        break;
      case "Newest":
      default:
        items.sort(
          (a, b) =>
            new Date(b.auction.startTime).getTime() - new Date(a.auction.startTime).getTime()
        );
        break;
    }

    return items;
  }, [activeTab, searchQuery, sortBy]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[#c8a44e]/[0.07] blur-[120px]" />
        <div className="absolute -left-40 top-1/3 h-[400px] w-[400px] rounded-full bg-blue-500/[0.05] blur-[120px]" />
        <div className="absolute -right-40 top-2/3 h-[400px] w-[400px] rounded-full bg-red-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#c8a44e]">
            <span className="h-px w-6 bg-[#c8a44e]/50" />
            Auction History
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            My Bids &{" "}
            <span className="text-gradient-gold">History</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Track every auction you&apos;ve participated in, from live bids to completed
            transactions. You&apos;ve joined{" "}
            <span className="font-semibold text-zinc-100">{stats.total} auctions</span> on
            AuctionVault.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          <div className="glass card-glow rounded-2xl p-4 transition-all duration-300 hover:border-zinc-600/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Participated</span>
              <div className="rounded-lg bg-zinc-800/70 p-1.5">
                <Trophy className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{stats.total}</p>
          </div>

          <div className="glass card-glow rounded-2xl p-4 transition-all duration-300 hover:border-[#c8a44e]/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Won</span>
              <div className="rounded-lg bg-[#c8a44e]/10 p-1.5">
                <Trophy className="h-3.5 w-3.5 text-[#c8a44e]" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-[#c8a44e]">{stats.won}</p>
          </div>

          <div className="glass card-glow rounded-2xl p-4 transition-all duration-300 hover:border-red-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Lost</span>
              <div className="rounded-lg bg-red-500/10 p-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-400">{stats.lost}</p>
          </div>

          <div className="glass card-glow rounded-2xl p-4 transition-all duration-300 hover:border-zinc-600/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Win Rate</span>
              <div className="rounded-lg bg-zinc-800/70 p-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-green-400" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100">{stats.winRate}%</p>
          </div>

          <div className="glass card-glow col-span-2 rounded-2xl p-4 transition-all duration-300 hover:border-zinc-600/60 sm:col-span-1 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Total Spent</span>
              <div className="rounded-lg bg-zinc-800/70 p-1.5">
                <DollarSign className="h-3.5 w-3.5 text-zinc-300" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-zinc-100 sm:text-[22px]">
              {formatCurrency(stats.totalSpent)}
            </p>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass card-glow mt-8 rounded-2xl p-4 sm:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
              <Filter className="h-4 w-4 text-[#c8a44e]" />
              <span>Filter & Sort</span>
            </div>

            <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-end">
              <div className="relative w-full lg:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search auctions, items, sellers..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-[#c8a44e]/50 focus:ring-1 focus:ring-[#c8a44e]/30"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setSortOpen((open) => !open)}
                  className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition-all hover:border-zinc-700 lg:w-auto"
                >
                  <span>Sort: {sortBy}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-zinc-500 transition-transform duration-200",
                      sortOpen && "rotate-180"
                    )}
                  />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="glass absolute right-0 z-30 mt-2 w-56 rounded-xl border border-zinc-800 p-1.5 shadow-xl"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setSortBy(option);
                            setSortOpen(false);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                            sortBy === option
                              ? "bg-[#c8a44e]/10 text-[#c8a44e]"
                              : "text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100"
                          )}
                        >
                          {option}
                          {sortBy === option && <CheckCircle className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
                  activeTab === tab
                    ? "border-[#c8a44e]/60 bg-[#c8a44e]/10 text-[#c8a44e] shadow-[0_0_14px_rgba(200,164,78,0.12)]"
                    : "border-zinc-800 bg-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              {activeTab === "All" ? "All Activity" : activeTab}
              <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-400">
                {filteredItems.length}
              </span>
            </h2>
          </div>

          {filteredItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center"
            >
              <div className="rounded-2xl bg-zinc-800/70 p-4">
                <Search className="h-8 w-8 text-zinc-500" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-200">
                No auctions found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                {searchQuery
                  ? `No results match "${searchQuery}" in the ${activeTab.toLowerCase()} filter. Try adjusting your search or filter.`
                  : `You have no ${activeTab.toLowerCase()} auctions yet. Browse live auctions and place your first bid.`}
              </p>
              {(searchQuery || activeTab !== "All") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveTab("All");
                  }}
                  className="mt-5 rounded-xl border border-[#c8a44e]/40 bg-[#c8a44e]/10 px-4 py-2 text-sm font-medium text-[#c8a44e] transition-all hover:bg-[#c8a44e]/20 hover:shadow-[0_0_20px_rgba(200,164,78,0.15)]"
                >
                  Clear filters
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item) => (
                  <HistoryCard
                    key={item.auction.id}
                    item={item}
                    onInfo={() => setInfoItem(item)}
                    onReport={() => setComplaintItem(item)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {infoItem && (
          <AuctionInfoModal item={infoItem} onClose={() => setInfoItem(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {complaintItem && (
          <ComplaintModal item={complaintItem} onClose={() => setComplaintItem(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryCard({
  item,
  onInfo,
  onReport,
}: {
  item: (typeof mockHistory)[number];
  onInfo: () => void;
  onReport: () => void;
}) {
  const status = item.status;
  const isWin = item.won || status === "won";
  const isLoss = status === "lost" || (status === "completed" && !item.won);

  return (
    <motion.article
      layout
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={{ y: -2 }}
      className="glass card-glow group relative overflow-hidden rounded-2xl border border-zinc-800/60 p-5 transition-colors duration-300 hover:border-zinc-600/60 sm:p-6"
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-1 opacity-60 transition-opacity group-hover:opacity-100",
          isWin
            ? "bg-gradient-to-b from-[#c8a44e] to-[#a8882a]"
            : isLoss
              ? "bg-gradient-to-b from-red-500 to-red-700"
              : status === "disputed"
                ? "bg-gradient-to-b from-amber-500 to-amber-600"
                : "bg-gradient-to-b from-blue-500 to-blue-600"
        )}
      />

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex sm:block">
          <div
            className={cn(
              "relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl text-3xl shadow-lg transition-transform duration-300 group-hover:scale-[1.03] sm:h-24 sm:w-24",
              CATEGORY_EMOJI[item.auction.category] ? "bg-gradient-to-br" : "bg-zinc-800"
            )}
          >
            {CATEGORY_EMOJI[item.auction.category] ? (
              <div
                className={cn(
                  "absolute inset-0",
                  status === "won"
                    ? "bg-gradient-to-br from-[#c8a44e]/25 via-[#e8d48b]/10 to-transparent"
                    : status === "lost"
                      ? "bg-gradient-to-br from-red-500/20 via-red-500/5 to-transparent"
                      : status === "disputed"
                        ? "bg-gradient-to-br from-amber-500/25 via-amber-500/5 to-transparent"
                        : "bg-gradient-to-br from-blue-500/20 via-blue-500/5 to-transparent"
                )}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
            )}
            <span className="relative z-10 drop-shadow">{CATEGORY_EMOJI[item.auction.category] ?? "🛍️"}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-zinc-100">
                {item.auction.title}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {item.auction.id} · Sold by{" "}
                <span className="font-medium text-zinc-400">{item.auction.seller.displayName}</span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={status} />
              <PaymentBadge status={item.paymentStatus} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              {CATEGORY_EMOJI[item.auction.category] ?? "🛍️"} {item.auction.category}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> {formatDate(item.auction.startTime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> {item.auction.bidCount} bids placed
            </span>
            {status === "active" && (
              <ActiveCountdown endTime={item.auction.endTime} />
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Your Bid</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                {formatCurrency(item.userBid, item.auction.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                {status === "active" ? "Current Bid" : "Winning Bid"}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                {formatCurrency(item.auction.currentBid, item.auction.currency)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Bids</p>
              <p className="mt-0.5 text-sm font-semibold text-zinc-100">{item.auction.bidCount}</p>
            </div>
            <div className="flex flex-col">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Result</p>
              <div
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 text-sm font-semibold",
                  isWin
                    ? "text-[#c8a44e]"
                    : isLoss
                      ? "text-red-400"
                      : item.auction.currentBid < item.userBid || item.isWinning
                        ? "text-green-400"
                        : "text-blue-400"
                )}
              >
                {isWin ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5" /> Won
                  </>
                ) : isLoss ? (
                  <>
                    <TrendingDown className="h-3.5 w-3.5" /> Lost
                  </>
                ) : item.auction.currentBid < item.userBid || item.isWinning ? (
                  <>
                    <TrendingUp className="h-3.5 w-3.5" /> Winning
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3.5 w-3.5" /> Outbid
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-800/40 pt-4">
            <button
              onClick={onInfo}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:border-[#c8a44e]/50 hover:bg-[#c8a44e]/10 hover:text-[#c8a44e]"
            >
              <Info className="h-3.5 w-3.5" /> Info
            </button>
            {status === "completed" && (
              <button
                onClick={onReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-all hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Report / Complaint
              </button>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-zinc-600">
              <ExternalLink className="h-3 w-3" /> View auction on chain
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function AuctionInfoModal({
  item,
  onClose,
}: {
  item: (typeof mockHistory)[number];
  onClose: () => void;
}) {
  const auction = item.auction;
  const isActive = item.status === "active";
  const result = item.won ? "Won" : item.status === "lost" ? "Lost" : item.status === "disputed" ? "Disputed" : isActive ? "Active" : "Completed";
  const mounted = useMounted();

  const userBids = useMemo(() => {
    if (auction.bids && auction.bids.length > 0) {
      return auction.bids.filter((bid) => bid.userId === "usr_001");
    }
    return [
      {
        id: "bid_user_1",
        auctionId: auction.id,
        userId: "usr_001",
        username: "alexandra_v",
        userAvatar: "",
        amount: item.userBid,
        currency: auction.currency,
        timestamp: auction.startTime,
        isWinning: item.isWinning,
      },
    ];
  }, [auction, item]);

  const deliveryStatus =
    item.won && item.paymentStatus === "paid"
      ? "Shipped — arriving soon"
      : item.won && item.paymentStatus === "pending"
        ? "Awaiting payment"
        : item.won
          ? "Preparing shipment"
          : "—";

  const resultStyles = (() => {
    if (item.won) return { text: "text-[#c8a44e]", bg: "bg-[#c8a44e]/10 border-[#c8a44e]/25", icon: <Trophy className="h-4 w-4" /> };
    if (item.status === "lost") return { text: "text-red-400", bg: "bg-red-500/10 border-red-500/25", icon: <XCircle className="h-4 w-4" /> };
    if (item.status === "disputed") return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25", icon: <AlertTriangle className="h-4 w-4" /> };
    return { text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25", icon: <Clock className="h-4 w-4" /> };
  })();

  return (
    <motion.div
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="glass relative z-10 my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800/60 shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-[600px] -translate-x-1/2 rounded-full bg-[#c8a44e]/[0.06] blur-[100px]" />
        </div>

        <div className="relative max-h-[85vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-800/50 bg-[#0f0f12]/95 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#c8a44e]/20 to-transparent text-xl">
                {CATEGORY_EMOJI[auction.category] ?? "🛍️"}
              </div>
              <div>
                <h2 className="pr-8 text-lg font-semibold text-zinc-100">
                  {auction.title}
                </h2>
                <p className="text-xs text-zinc-500">{auction.id}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 p-5">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                resultStyles.bg,
                resultStyles.text
              )}
            >
              {resultStyles.icon}
              Auction Result: {result}
            </div>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Info className="h-3.5 w-3.5 text-[#c8a44e]" /> Product Information
              </div>
              <div className="glass-light rounded-xl p-4">
                <p className="text-sm leading-relaxed text-zinc-300">{auction.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] text-zinc-500">Category</p>
                    <p className="font-medium capitalize text-zinc-100">{auction.category}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Condition</p>
                    <p className="font-medium text-zinc-100">{auction.condition}</p>
                  </div>
                  {auction.brand && (
                    <div>
                      <p className="text-[11px] text-zinc-500">Brand</p>
                      <p className="font-medium text-zinc-100">{auction.brand}</p>
                    </div>
                  )}
                  {auction.year && (
                    <div>
                      <p className="text-[11px] text-zinc-500">Year</p>
                      <p className="font-medium text-zinc-100">{auction.year}</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <MessageSquare className="h-3.5 w-3.5 text-[#c8a44e]" /> Seller Information
              </div>
              <div className="glass-light rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
                      {auction.seller.displayName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">
                        {auction.seller.displayName}
                        {auction.seller.verified && (
                          <CheckCircle className="ml-1 inline h-3.5 w-3.5 text-blue-400" />
                        )}
                      </p>
                      <p className="text-xs text-zinc-500">@{auction.seller.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500">Reputation</p>
                    <p className="text-sm font-semibold text-[#c8a44e]">
                      {auction.seller.reputation.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
                  <span>{auction.seller.country}</span>
                  <span>Member since {formatDate(auction.seller.memberSince)}</span>
                  <span>Level {auction.seller.level}</span>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Calendar className="h-3.5 w-3.5 text-[#c8a44e]" /> Auction Timeline
              </div>
              <div className="glass-light rounded-xl p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Start</span>
                    <span className="font-medium text-zinc-200">{formatDateTime(auction.startTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Live Bidding Start</span>
                    <span className="font-medium text-zinc-200">{formatDateTime(auction.liveBiddingStart)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">End</span>
                    <span className="font-medium text-zinc-200">{formatDateTime(auction.endTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Ended</span>
                    <span className="font-medium text-zinc-400">{mounted ? getRelativeTime(auction.endTime) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Created</span>
                    <span className="font-medium text-zinc-200">{formatDateTime(auction.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Anti-sniping extension</span>
                    <span
                      className={cn(
                        "font-medium",
                        auction.antiSnipingExtension ? "text-green-400" : "text-zinc-500"
                      )}
                    >
                      {auction.antiSnipingExtension ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <DollarSign className="h-3.5 w-3.5 text-[#c8a44e]" /> Bidding Activity
              </div>
              <div className="glass-light rounded-xl p-4">
                <div className="mb-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[11px] text-zinc-500">Your Highest Bid</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                      {formatCurrency(item.userBid, auction.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Highest Bid</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-100">
                      {formatCurrency(auction.currentBid, auction.currency)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Total Bids</p>
                    <p className="mt-0.5 text-sm font-semibold text-zinc-100">{auction.bidCount}</p>
                  </div>
                </div>

                <p className="mb-2 text-xs font-semibold text-zinc-400">Your Bids</p>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {userBids.map((bid, index) => (
                    <div
                      key={bid.id ?? index}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                        index === 0
                          ? "border-[#c8a44e]/20 bg-[#c8a44e]/5"
                          : "border-zinc-800 bg-zinc-900/40"
                      )}
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <span className="rounded-full bg-[#c8a44e]/10 px-2 py-0.5 text-xs font-semibold text-[#c8a44e]">
                          #{userBids.length - index}
                        </span>
                        {formatCurrency(bid.amount, bid.currency)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {bid.isWinning ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-3 w-3" /> Winning
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <TrendingDown className="h-3 w-3" /> Outbid
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatDateTime(bid.timestamp)}{" "}
                        <span className="text-zinc-600">({mounted ? getRelativeTime(bid.timestamp) : "—"})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <DollarSign className="h-3.5 w-3.5 text-[#c8a44e]" /> Payment
                </div>
                <div className="glass-light rounded-xl p-4">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Status</span>
                      <PaymentBadge status={item.paymentStatus} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Methods</span>
                      <span className="text-right font-medium text-zinc-200">
                        {auction.paymentMethods.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Amount</span>
                      <span className="font-medium text-zinc-100">
                        {formatCurrency(item.userBid, auction.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <Clock className="h-3.5 w-3.5 text-[#c8a44e]" /> Delivery & Shipping
                </div>
                <div className="glass-light rounded-xl p-4">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Status</span>
                      <span
                        className={cn(
                          "font-medium",
                          deliveryStatus === "—" ? "text-zinc-500" : "text-blue-400"
                        )}
                      >
                        {deliveryStatus}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-500">{auction.shippingInfo}</p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      <span className="font-medium text-zinc-400">Return policy:</span>{" "}
                      {auction.returnPolicy}
                    </p>
                    <p className="text-xs leading-relaxed text-zinc-500">
                      <span className="font-medium text-zinc-400">Location:</span>{" "}
                      {auction.location}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <FileText className="h-3.5 w-3.5 text-[#c8a44e]" /> Transaction
              </div>
              <div className="glass-light rounded-xl p-4">
                <div className="space-y-2 text-xs text-zinc-500">
                  <p>
                    <span className="font-medium text-zinc-400">Terms:</span> {auction.termsAndConditions}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-400">Seller notes:</span>{" "}
                    {auction.sellerNotes ?? "No additional notes provided."}
                  </p>
                  <p className="break-all">
                    <span className="font-medium text-zinc-400">Seller wallet:</span>{" "}
                    <span className="font-mono text-zinc-400">{auction.seller.walletAddress}</span>
                  </p>
                </div>
              </div>
            </section>

            <div className="flex justify-end gap-3 pt-1">
              <button
                onClick={onClose}
                className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-700/60"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ComplaintModal({
  item,
  onClose,
}: {
  item: (typeof mockHistory)[number];
  onClose: () => void;
}) {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageNames, setImageNames] = useState<string[]>([]);
  const [videoName, setVideoName] = useState<string>("");
  const [evidence, setEvidence] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [caseId, setCaseId] = useState("");

  const canSubmit = category && description.trim().length >= 20;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setImageNames((prev) => [...prev, ...files.map((f) => f.name)]);
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoName(file.name);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const id = `CMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    setCaseId(id);
    setSubmitted(true);
  };

  return (
    <motion.div
      variants={modalOverlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        variants={modalContentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={(e) => e.stopPropagation()}
        className="glass relative z-10 my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-800/60 shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-72 w-[600px] -translate-x-1/2 rounded-full bg-amber-500/[0.06] blur-[100px]" />
        </div>

        {submitted ? (
          <div className="relative p-8 text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15, stiffness: 260 }}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#c8a44e]/30 bg-[#c8a44e]/10"
            >
              <CheckCircle className="h-10 w-10 text-[#c8a44e]" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="mt-5 text-xl font-bold text-zinc-100">Complaint Submitted</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Your complaint about{" "}
                <span className="font-medium text-zinc-200">{item.auction.title}</span> has been
                received. Our resolution team will review it within 48 hours.
              </p>

              <div className="glass-light mx-auto mt-5 inline-flex items-center gap-3 rounded-xl px-5 py-3">
                <FileText className="h-4 w-4 text-[#c8a44e]" />
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-zinc-500">Case ID</p>
                  <p className="font-mono text-sm font-semibold text-[#c8a44e]">{caseId}</p>
                </div>
              </div>

              <p className="mt-5 text-xs text-zinc-500">
                You can track your complaint status in the Resolution Center. A confirmation has
                also been sent to your email.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-[#c8a44e]/40 bg-[#c8a44e]/10 px-5 py-2.5 text-sm font-medium text-[#c8a44e] transition-all hover:bg-[#c8a44e]/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="relative">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800/50 bg-[#0f0f12]/95 p-5 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-xl">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Report & Complaint</h2>
                  <p className="text-xs text-zinc-500">{item.auction.title}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Complaint Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={cn(
                    "w-full cursor-pointer rounded-xl border bg-zinc-900/60 px-3 py-2.5 text-sm outline-none transition-all",
                    category
                      ? "border-[#c8a44e]/40 text-zinc-100"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  <option value="" disabled>
                    Select a category...
                  </option>
                  {COMPLAINT_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-zinc-100">
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue in detail. Include what happened, when it happened, and any relevant context..."
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-[#c8a44e]/50 focus:ring-1 focus:ring-[#c8a44e]/30"
                />
                <p className="mt-1 text-right text-[11px] text-zinc-600">
                  {description.trim().length} / minimum 20 characters
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="group cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-center transition-all hover:border-[#c8a44e]/40 hover:bg-[#c8a44e]/5">
                  <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 group-hover:text-[#c8a44e]">
                    <ImageIcon className="h-4 w-4" />
                    <span className="font-medium">Upload Images</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">
                    JPG / PNG / WEBP · up to 5
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imageNames.length > 0 && (
                    <div className="mt-2 rounded-lg bg-zinc-800/70 px-2 py-1.5 text-[11px] text-zinc-300">
                      {imageNames.length} image{imageNames.length > 1 ? "s" : ""} selected
                    </div>
                  )}
                </label>

                <label className="group cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 p-4 text-center transition-all hover:border-[#c8a44e]/40 hover:bg-[#c8a44e]/5">
                  <div className="flex items-center justify-center gap-2 text-sm text-zinc-400 group-hover:text-[#c8a44e]">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Upload Video (Optional)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-600">MP4 / MOV · max 100MB</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                  {videoName && (
                    <div className="mt-2 rounded-lg bg-zinc-800/70 px-2 py-1.5 text-[11px] text-zinc-300">
                      {videoName}
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Supporting Evidence
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={3}
                  placeholder="Optional: add screenshot descriptions, tracking numbers, communication details, or anything else that supports your case..."
                  className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all focus:border-[#c8a44e]/50 focus:ring-1 focus:ring-[#c8a44e]/30"
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs leading-relaxed text-amber-200/80">
                  Complaints are taken seriously and reviewed by our resolution team. False or
                  abusive reports may result in account restrictions.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-all hover:border-zinc-600 hover:bg-zinc-700/60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all",
                    canSubmit
                      ? "bg-[#c8a44e] text-black shadow-[0_0_20px_rgba(200,164,78,0.2)] hover:bg-[#d4b565] hover:shadow-[0_0_30px_rgba(200,164,78,0.35)]"
                      : "cursor-not-allowed bg-zinc-800 text-zinc-500"
                  )}
                >
                  <Send className="h-4 w-4" />
                  Submit Complaint
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}