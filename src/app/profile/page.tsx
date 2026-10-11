"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId, useDisconnect } from "wagmi";
import {
  Edit,
  Settings,
  Shield,
  Award,
  Star,
  Trophy,
  Eye,
  Gavel,
  TrendingUp,
  Clock,
  CheckCircle,
  Lock,
  Wallet,
  Key,
  Globe,
  Calendar,
  ChevronRight,
  Camera,
  ExternalLink,
  Copy,
  AlertTriangle,
  EyeOff,
  Bell,
  Download,
  Loader2,
  LogOut,
} from "lucide-react";
import { cn, formatCurrency, formatNumber, getInitials, getRelativeTime } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/wallet/connect-button";
import { VerificationForm } from "@/components/profile/verification-form";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { VaultSection } from "@/components/profile/vault-section";
import { useProfile } from "@/hooks/use-profile";
import { profileFromSubmission } from "@/lib/profile";
import { formatBytes, sniffFile, fileToDataURL } from "@/lib/media";
import { ALLOWED_IMAGE_MIMES, AVATAR_MAX_BYTES } from "@/lib/verify";
import type { Profile, VerificationSubmission } from "@/lib/types";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const LEVELS = [
  { level: 1, name: "New Member", description: "Limited bidding access", minReputation: 0, icon: "🌱" },
  { level: 2, name: "Verified", description: "Higher bid limits, basic features", minReputation: 500, icon: "✅" },
  { level: 3, name: "Trusted", description: "More features, priority support", minReputation: 2000, icon: "🛡️" },
  { level: 4, name: "Elite", description: "Advanced privileges, lower fees", minReputation: 4000, icon: "⭐" },
  { level: 5, name: "Premium", description: "Maximum privileges, VIP access", minReputation: 8000, icon: "👑" },
];

const BADGES = [
  { id: "b1", emoji: "🏆", name: "First Win", description: "Won your first auction", rarity: "common" as const, status: "earned" as const, earnedAt: "2024-04-10" },
  { id: "b2", emoji: "🔥", name: "Active Bidder", description: "Placed 100+ bids", rarity: "rare" as const, status: "earned" as const, earnedAt: "2024-08-22" },
  { id: "b3", emoji: "💎", name: "Premium Buyer", description: "Spent over $100K", rarity: "epic" as const, status: "earned" as const, earnedAt: "2025-01-15" },
  { id: "b4", emoji: "⭐", name: "Trusted Seller", description: "Completed 25+ sales with 5-star ratings", rarity: "rare" as const, status: "earned" as const, earnedAt: "2025-06-01" },
  { id: "b5", emoji: "🌎", name: "Global Bidder", description: "Bid on auctions from 10+ countries", rarity: "common" as const, status: "earned" as const, earnedAt: "2025-03-18" },
  { id: "b6", emoji: "🎯", name: "Successful Seller", description: "Sold 50+ items", rarity: "epic" as const, status: "in-progress" as const, progress: 18, total: 50 },
  { id: "b7", emoji: "⚡", name: "Fast Bidder", description: "Won 5 auctions with last-minute bids", rarity: "rare" as const, status: "locked" as const },
  { id: "b8", emoji: "🏅", name: "100 Auctions", description: "Participated in 100 auctions", rarity: "legendary" as const, status: "in-progress" as const, progress: 65, total: 100 },
];

const MONTHLY_ACTIVITY = [
  { month: "Apr", bids: 32 },
  { month: "May", bids: 48 },
  { month: "Jun", bids: 41 },
  { month: "Jul", bids: 56 },
  { month: "Aug", bids: 38 },
  { month: "Sep", bids: 52 },
];

const CONNECTED_DEVICES = [
  { id: "d1", name: "Chrome on MacBook Pro", location: "San Francisco, CA", lastActive: new Date(Date.now() - 7200000).toISOString(), current: true },
  { id: "d2", name: "Safari on iPhone 15 Pro", location: "San Francisco, CA", lastActive: new Date(Date.now() - 18000000).toISOString(), current: false },
  { id: "d3", name: "Firefox on Windows Desktop", location: "New York, NY", lastActive: new Date(Date.now() - 259200000).toISOString(), current: false },
];

const ACTIVE_SESSIONS = [
  { id: "s1", browser: "Chrome 128.0", os: "macOS Sonoma 14.6", ip: "73.162.xxx.xxx", started: new Date(Date.now() - 7200000).toISOString(), current: true },
  { id: "s2", browser: "Safari 17.5", os: "iOS 17.5", ip: "73.162.xxx.xxx", started: new Date(Date.now() - 18000000).toISOString(), current: false },
];

const RARITY_STYLES: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  common: { border: "border-zinc-600", bg: "bg-zinc-800/60", text: "text-zinc-400", glow: "" },
  rare: { border: "border-blue-500/30", bg: "bg-blue-500/5", text: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.08)]" },
  epic: { border: "border-purple-500/30", bg: "bg-purple-500/5", text: "text-purple-400", glow: "shadow-[0_0_20px_rgba(168,85,247,0.08)]" },
  legendary: { border: "border-[#c8a44e]/40", bg: "bg-[#c8a44e]/5", text: "text-[#c8a44e]", glow: "shadow-[0_0_24px_rgba(200,164,78,0.12)]" },
};

const FLAG_MAP: Record<string, string> = {
  US: "🇺🇸",
  FR: "🇫🇷",
  JP: "🇯🇵",
  AE: "🇦🇪",
  GB: "🇬🇧",
  CH: "🇨🇭",
  DE: "🇩🇪",
  IT: "🇮🇹",
  ES: "🇪🇸",
  CA: "🇨🇦",
  AU: "🇦🇺",
  IN: "🇮🇳",
};

function getBlockExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
  };
  const base = explorers[chainId] ?? "https://etherscan.io";
  return `${base}/address/${address}`;
}

function downloadActivityReport(activity: { month: string; bids: number }[]): void {
  const rows = [["Month", "Bids"], ...activity.map((m) => [m.month, String(m.bids)])];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "monthly-activity-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c8a44e]/10 text-[#c8a44e]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-100">{children}</h2>
    </div>
  );
}

function GlassCard({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm",
        "shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function Toggle({ enabled, onToggle, label, icon: Icon }: { enabled: boolean; onToggle: () => void; label: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-3 text-sm text-zinc-300">
        {Icon && (
          <span className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            enabled ? "bg-[#c8a44e]/10 text-[#c8a44e]" : "bg-zinc-800 text-zinc-500"
          )}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        {label}
      </span>
      <button
        onClick={onToggle}
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0",
          enabled ? "bg-[#c8a44e]" : "bg-zinc-700"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            enabled && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

function ProfilePlaceholder({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="relative mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
        <div className="rounded-2xl bg-zinc-800/70 p-5">
          <Icon className="h-10 w-10 text-[#c8a44e]" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">{description}</p>
        {children && <div className="mt-6 flex flex-col items-center">{children}</div>}
      </div>
    </main>
  );
}

function ProfileDashboard({
  user,
  onUpdate,
  onStartVerification,
  onEditProfile,
}: {
  user: Profile;
  onUpdate: (next: Profile) => void;
  onStartVerification: () => void;
  onEditProfile: () => void;
}) {
  const { disconnect, isPending: disconnectPending } = useDisconnect();
  const chainId = useChainId();
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [bidConfirm, setBidConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "badges" | "security">("overview");
  const [devices, setDevices] = useState(CONNECTED_DEVICES);
  const [sessions, setSessions] = useState(ACTIVE_SESSIONS);
  const [phoneRecovery, setPhoneRecovery] = useState(false);
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mounted = useMounted();

  const truncatedAddress = `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`;
  const memberDate = new Date(user.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nextLevel = LEVELS.find((l) => l.level === user.level + 1);
  const currentLevel = LEVELS.find((l) => l.level === user.level);
  const levelProgress = nextLevel
    ? ((user.reputation - (currentLevel?.minReputation ?? 0)) / (nextLevel.minReputation - (currentLevel?.minReputation ?? 0))) * 100
    : 100;

  const maxBids = Math.max(...MONTHLY_ACTIVITY.map((m) => m.bids));
  const maskedPhone = user.phoneE164
    ? `${user.phoneE164.slice(0, 4)}***${user.phoneE164.slice(-3)}`
    : "Not set";

  const handleCopy = () => {
    navigator.clipboard.writeText(user.walletAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const url = window.location.href.split("#")[0].split("?")[0];
    navigator.clipboard.writeText(url).catch(() => {});
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleCoverFile = async (file: File | undefined) => {
    setCoverError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.includes(sniffed)) {
      setCoverError("Please choose a JPG, PNG or WEBP image for your cover.");
      return;
    }
    if (file.size > 4_000_000) {
      setCoverError(`Cover image is too large (max ${formatBytes(4_000_000)}).`);
      return;
    }
    try {
      const coverImage = await fileToDataURL(file);
      onUpdate({ ...user, coverImage });
    } catch {
      setCoverError("Could not read the image. Please try again.");
    }
  };

  const handleAvatarFile = async (file: File | undefined) => {
    setAvatarError(null);
    if (!file) return;
    const sniffed = await sniffFile(file);
    if (!sniffed || !ALLOWED_IMAGE_MIMES.includes(sniffed)) {
      setAvatarError("Please choose a JPG, PNG or WEBP image for your profile photo.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError(`Profile photo is too large (max ${formatBytes(AVATAR_MAX_BYTES)}).`);
      return;
    }
    try {
      const avatar = await fileToDataURL(file);
      onUpdate({ ...user, avatar });
    } catch {
      setAvatarError("Could not read the image. Please try again.");
    }
  };

  const openExplorer = () => {
    window.open(getBlockExplorerUrl(chainId, user.walletAddress), "_blank", "noopener,noreferrer");
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Cover + Profile Header */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        className="relative"
      >
        <div className="relative h-[200px] w-full overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 sm:h-[260px]">
          {user.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.coverImage} alt="Cover" className="absolute inset-0 h-full w-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
          <div className="absolute inset-0 opacity-10">
            <div className="absolute left-1/4 top-1/3 h-32 w-32 rounded-full bg-[#c8a44e]/20 blur-[80px]" />
            <div className="absolute right-1/3 top-1/4 h-40 w-40 rounded-full bg-purple-600/15 blur-[100px]" />
          </div>
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-4 top-4 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur-sm transition hover:bg-black/60"
          >
            <Camera className="h-3.5 w-3.5" />
            Change Cover
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              handleCoverFile(f);
            }}
          />
          {coverError && (
            <div className="absolute right-4 top-14 rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
              {coverError}
            </div>
          )}
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="-mt-16 flex-shrink-0 sm:-mt-20"
            >
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-[#c8a44e] bg-zinc-800 shadow-[0_0_30px_rgba(200,164,78,0.25)] sm:h-40 sm:w-40">
                  {user.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt={user.displayName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-3xl font-bold text-[#c8a44e] sm:text-4xl">
                      {getInitials(user.displayName)}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-zinc-200"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    handleAvatarFile(f);
                  }}
                />
                {avatarError && (
                  <div className="absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg bg-red-500/90 px-3 py-1.5 text-center text-xs font-medium text-white shadow-lg">
                    {avatarError}
                  </div>
                )}
                {user.verified && (
                  <div className="absolute -right-1 bottom-6 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#09090b] bg-green-500">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Info */}
            <div className="flex-1 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{user.displayName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#c8a44e]/10 border border-[#c8a44e]/20 px-2.5 py-0.5 text-xs font-semibold text-[#c8a44e]">
                  Level {user.level} — {currentLevel?.name}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    user.verificationStatus === "verified"
                      ? "border-green-500/20 bg-green-500/10 text-green-400"
                      : "border-amber-500/20 bg-amber-500/10 text-amber-400"
                  )}
                >
                  {user.verificationStatus === "verified" ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {user.verificationStatus === "verified"
                    ? "Verified"
                    : "Verification Pending"}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">@{user.username}</p>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  {FLAG_MAP[user.countryCode] || "🌍"} {user.country}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {memberDate}
                </span>
              </div>

              {user.bio && <p className="mt-3 max-w-lg text-sm text-zinc-400 leading-relaxed">{user.bio}</p>}

              {/* Wallet */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-800/80 border border-zinc-700/50 px-3 py-1.5 text-xs font-mono text-zinc-300 transition hover:bg-zinc-700/80 hover:border-zinc-600"
                >
                  <Wallet className="h-3.5 w-3.5 text-[#c8a44e]" />
                  {truncatedAddress}
                  {copied ? (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-zinc-500" />
                  )}
                </button>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700/50 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400">
                  <Globe className="h-2.5 w-2.5" />
                  {user.walletProvider}
                </span>
              </div>

              {/* Reputation */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ProgressRing progress={(user.reputation / 10000) * 100} size={44} strokeWidth={4} />
                  <div>
                    <p className="text-lg font-bold text-white flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-[#c8a44e]" />
                      {formatNumber(user.reputation)}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Reputation</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pb-6">
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-[#c8a44e] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#d4b565] shadow-[0_0_20px_rgba(200,164,78,0.2)]"
              >
                <Edit className="h-4 w-4" />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700/60 hover:border-zinc-600"
              >
                {shareCopied ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {shareCopied ? "Link Copied" : "Share"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("security")}
                aria-label="Go to security settings"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-300 transition hover:bg-zinc-700/60 hover:border-zinc-600"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-8">
        <div className="flex gap-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-1">
          {(["overview", "badges", "security"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200",
                activeTab === tab
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 sm:py-12">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerContainer}
              className="space-y-12"
            >
              {/* Stats Grid */}
              <motion.div variants={staggerContainer}>
                <SectionTitle icon={TrendingUp}>Dashboard Stats</SectionTitle>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  {[
                    { icon: Gavel, label: "Auctions Created", value: user.stats.auctionsCreated, color: "text-blue-400" },
                    { icon: Trophy, label: "Auctions Won", value: user.stats.auctionsWon, color: "text-green-400" },
                    { icon: EyeOff, label: "Auctions Lost", value: user.stats.auctionsLost, color: "text-zinc-500" },
                    { icon: Gavel, label: "Total Bids", value: user.stats.totalBids, color: "text-[#c8a44e]" },
                    { icon: Award, label: "Successful Sales", value: user.stats.successfulSales, color: "text-purple-400" },
                    { icon: TrendingUp, label: "Total Auction Value", value: user.stats.totalAuctionValue, color: "text-[#c8a44e]", isCurrency: true },
                    { icon: Clock, label: "Active Auctions", value: user.stats.activeAuctions, color: "text-green-400" },
                    { icon: CheckCircle, label: "Completed Auctions", value: user.stats.completedAuctions, color: "text-blue-400" },
                  ].map((stat) => (
                    <motion.div key={stat.label} variants={scaleIn}>
                      <GlassCard className="p-4 transition hover:border-zinc-700 hover:bg-zinc-900/70">
                        <div className={cn("mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800", stat.color)}>
                          <stat.icon className="h-4 w-4" />
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {stat.isCurrency ? formatCurrency(stat.value) : formatNumber(stat.value)}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">{stat.label}</p>
                      </GlassCard>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Level System */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Award}>Level System</SectionTitle>
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex flex-col gap-8 lg:flex-row">
                    {/* Current level */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c8a44e]/20 to-[#c8a44e]/5 border border-[#c8a44e]/30 text-3xl">
                          {currentLevel?.icon}
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">Level {user.level} — {currentLevel?.name}</p>
                          <p className="text-sm text-zinc-500">Advanced privileges, lower fees, priority support</p>
                        </div>
                      </div>

                      {nextLevel && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-zinc-400">Progress to Level {nextLevel.level} — {nextLevel.name}</span>
                            <span className="font-semibold text-[#c8a44e]">{Math.round(levelProgress)}%</span>
                          </div>
                          <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#c8a44e] to-[#e8d48b]"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(levelProgress, 100)}%` }}
                              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                            />
                          </div>

                          <div className="mt-6 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Requirements</p>
                            {[
                              { label: "Identity Verification", current: 1, total: 1, done: true },
                              { label: "Account Age (6+ months)", current: 1, total: 1, done: true },
                              { label: "Successful Transactions", current: 47, total: 50, done: false },
                              { label: "Reputation Score", current: user.reputation, total: 5000, done: false },
                              { label: "Max Disputes (≤2)", current: 0, total: 2, done: true },
                            ].map((req) => (
                              <div key={req.label} className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300">{req.label}</span>
                                <div className="flex items-center gap-2">
                                  {req.done ? (
                                    <span className="flex items-center gap-1 text-xs text-green-400">
                                      <CheckCircle className="h-3.5 w-3.5" /> Done
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                          className="h-full rounded-full bg-[#c8a44e]/70"
                                          style={{ width: `${Math.min((req.current / req.total) * 100, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-xs text-zinc-500">{formatNumber(req.current)}/{formatNumber(req.total)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* All levels */}
                    <div className="w-full lg:w-72 lg:border-l lg:border-zinc-800 lg:pl-8">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-4">All Levels</p>
                      <div className="space-y-3">
                        {LEVELS.map((level) => (
                          <div
                            key={level.level}
                            className={cn(
                              "flex items-center gap-3 rounded-xl p-3 transition",
                              level.level === user.level
                                ? "bg-[#c8a44e]/10 border border-[#c8a44e]/20"
                                : level.level < user.level
                                ? "bg-zinc-800/40 border border-zinc-800/60"
                                : "bg-zinc-900/30 border border-zinc-800/30"
                            )}
                          >
                            <span className="text-xl">{level.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-sm font-medium truncate",
                                level.level === user.level ? "text-[#c8a44e]" : level.level < user.level ? "text-zinc-300" : "text-zinc-600"
                              )}>
                                Level {level.level} — {level.name}
                              </p>
                              <p className="text-[11px] text-zinc-600 truncate">{level.description}</p>
                            </div>
                            {level.level === user.level && (
                              <span className="text-[10px] font-semibold text-[#c8a44e] bg-[#c8a44e]/10 rounded-full px-2 py-0.5">YOU</span>
                            )}
                            {level.level < user.level && (
                              <CheckCircle className="h-4 w-4 text-green-500/60 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Progress Graph */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={TrendingUp}>Monthly Activity</SectionTitle>
                <GlassCard className="p-6 sm:p-8">
                  <div className="flex items-end gap-3 h-48 sm:h-56">
                    {MONTHLY_ACTIVITY.map((month, i) => {
                      const height = (month.bids / maxBids) * 100;
                      return (
                        <div key={month.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
                          <span className="text-[11px] font-medium text-zinc-400">{month.bids}</span>
                          <motion.div
                            className="w-full max-w-[56px] rounded-t-lg bg-gradient-to-t from-[#c8a44e]/60 to-[#e8d48b]/40"
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                          />
                          <span className="text-xs text-zinc-500 font-medium">{month.month}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-zinc-800/60 pt-4">
                    <div className="flex items-center gap-4">
                      <p className="text-xs text-zinc-600">Last 6 months activity</p>
                      <p className="text-xs text-zinc-400">
                        Total: <span className="font-semibold text-white">{MONTHLY_ACTIVITY.reduce((a, m) => a + m.bids, 0)}</span> bids
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadActivityReport(MONTHLY_ACTIVITY)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-700/60 hover:text-zinc-200"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Report
                    </button>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "badges" && (
            <motion.div
              key="badges"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerContainer}
              className="space-y-8"
            >
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Trophy}>Badges & Achievements</SectionTitle>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {BADGES.map((badge) => {
                    const rarity = RARITY_STYLES[badge.rarity];
                    const isEarned = badge.status === "earned";
                    const isInProgress = badge.status === "in-progress";
                    const isLocked = badge.status === "locked";

                    return (
                      <motion.div
                        key={badge.id}
                        variants={scaleIn}
                        className={cn(
                          "rounded-2xl border p-5 transition-all duration-300",
                          rarity.border,
                          rarity.bg,
                          rarity.glow,
                          isLocked && "opacity-50 grayscale",
                          !isLocked && "hover:scale-[1.02]"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <span className="text-3xl">{badge.emoji}</span>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                badge.rarity === "common" && "bg-zinc-700 text-zinc-400",
                                badge.rarity === "rare" && "bg-blue-500/15 text-blue-400",
                                badge.rarity === "epic" && "bg-purple-500/15 text-purple-400",
                                badge.rarity === "legendary" && "bg-[#c8a44e]/15 text-[#c8a44e]"
                              )}
                            >
                              {badge.rarity}
                            </span>
                            {isEarned && (
                              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400">
                                <CheckCircle className="h-2.5 w-2.5" />
                                Earned
                              </span>
                            )}
                            {isLocked && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                <Lock className="h-2.5 w-2.5" />
                                Locked
                              </span>
                            )}
                          </div>
                        </div>
                        <h3 className={cn("mt-3 text-sm font-semibold", isLocked ? "text-zinc-500" : "text-white")}>{badge.name}</h3>
                        <p className={cn("mt-1 text-xs leading-relaxed", isLocked ? "text-zinc-600" : "text-zinc-400")}>{badge.description}</p>

                            {isInProgress && badge.progress !== undefined && badge.total !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="text-zinc-500">{badge.progress}/{badge.total}</span>
                              <span className={cn("font-semibold", rarity.text)}>
                                {Math.round((badge.progress / badge.total) * 100)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className={cn(
                                  "h-full rounded-full",
                                  badge.rarity === "legendary" && "bg-[#c8a44e]",
                                  badge.rarity === "epic" && "bg-purple-500"
                                )}
                                style={{ width: `${(badge.progress / badge.total) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {isEarned && badge.earnedAt && (
                          <p className="mt-2 text-[10px] text-zinc-600">Earned {new Date(badge.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={staggerContainer}
              className="space-y-12"
            >
              {/* Wallet Connected */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Wallet}>Wallet</SectionTitle>
                <GlassCard className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c8a44e]/10 border border-[#c8a44e]/20">
                        <Wallet className="h-5 w-5 text-[#c8a44e]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.walletProvider} Connected</p>
                        <p className="mt-0.5 text-xs font-mono text-zinc-500">{truncatedAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={openExplorer}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-700/60"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on Explorer
                      </button>
                      <button
                        type="button"
                        onClick={() => disconnect()}
                        disabled={disconnectPending}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {disconnectPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                        Disconnect
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Connected Devices */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Key}>Connected Devices</SectionTitle>
                <GlassCard className="divide-y divide-zinc-800/60">
                  {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{device.name}</p>
                          <p className="text-xs text-zinc-500">
                            {device.location} — {mounted ? getRelativeTime(device.lastActive) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {device.current && (
                          <span className="text-[10px] font-semibold text-[#c8a44e] bg-[#c8a44e]/10 rounded-full px-2 py-0.5">Current</span>
                        )}
                        {!device.current && (
                          <button
                            type="button"
                            onClick={() => setDevices((items) => items.filter((d) => d.id !== device.id))}
                            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {devices.length === 0 && (
                    <p className="px-5 py-6 text-sm text-zinc-500">
                      No connected devices to display. This list is scoped to the current browser
                      session.
                    </p>
                  )}
                </GlassCard>
              </motion.div>

              {/* Security Preferences */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Shield}>Security Preferences</SectionTitle>
                <GlassCard className="p-6">
                  <div className="divide-y divide-zinc-800/40">
                    <Toggle enabled={twoFactor} onToggle={() => setTwoFactor(!twoFactor)} label="Two-factor authentication" icon={Lock} />
                    <Toggle enabled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} label="Email notifications" icon={Bell} />
                    <Toggle enabled={loginAlerts} onToggle={() => setLoginAlerts(!loginAlerts)} label="Login alerts" icon={Shield} />
                    <Toggle enabled={bidConfirm} onToggle={() => setBidConfirm(!bidConfirm)} label="Bid confirmation prompts" icon={Gavel} />
                  </div>
                </GlassCard>
              </motion.div>

              {/* Recovery Options */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={AlertTriangle}>Recovery Options</SectionTitle>
                <GlassCard className="divide-y divide-zinc-800/60">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Email Recovery</p>
                        <p className="text-xs text-zinc-500">
                          {user.email ? `${user.email.slice(0, 3)}***${user.email.includes("@") ? user.email.slice(user.email.indexOf("@")) : ""}` : "Not set"}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      user.email
                        ? "bg-green-500/10 text-green-400"
                        : "bg-zinc-800 text-zinc-500"
                    )}>
                      {user.email ? "Configured" : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        phoneRecovery ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"
                      )}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Phone Recovery</p>
                        <p className="text-xs text-zinc-500">
                          {phoneRecovery ? maskedPhone : "Not configured"}
                        </p>
                      </div>
                    </div>
                    {phoneRecovery ? (
                      <span className="rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">Configured</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!user.phoneE164) {
                            setPhoneHint("Add a phone number in Edit Profile before configuring phone recovery.");
                            window.setTimeout(() => setPhoneHint(null), 4000);
                            return;
                          }
                          setPhoneHint(null);
                          setPhoneRecovery(true);
                        }}
                        className="rounded-lg border border-[#c8a44e]/30 bg-[#c8a44e]/5 px-3 py-1.5 text-xs font-medium text-[#c8a44e] transition hover:bg-[#c8a44e]/10"
                      >
                        Configure
                      </button>
                    )}
                  </div>
                </GlassCard>
                {phoneHint && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {phoneHint}
                  </p>
                )}
              </motion.div>

              {/* Session Management */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Clock}>Active Sessions</SectionTitle>
                <GlassCard className="divide-y divide-zinc-800/60">
                  {sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg",
                          session.current ? "bg-[#c8a44e]/10 text-[#c8a44e]" : "bg-zinc-800 text-zinc-400"
                        )}>
                          <Eye className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{session.browser} — {session.os}</p>
                          <p className="text-xs text-zinc-500">
                            IP: {session.ip} — Started {mounted ? getRelativeTime(session.started) : "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {session.current && (
                          <span className="text-[10px] font-semibold text-[#c8a44e] bg-[#c8a44e]/10 rounded-full px-2 py-0.5">Current</span>
                        )}
                        {!session.current && (
                          <button
                            type="button"
                            onClick={() => setSessions((items) => items.filter((s) => s.id !== session.id))}
                            className="rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-700/60"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <p className="px-5 py-6 text-sm text-zinc-500">
                      No active sessions to display. This list is scoped to the current browser
                      session.
                    </p>
                  )}
                </GlassCard>
              </motion.div>

              {/* Secure Vault */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={Lock}>Secure Vault</SectionTitle>
                <GlassCard className="p-6">
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    Manage payment and shipping details used at checkout. Vault entries are stored
                    locally in the current browser session until a server-backed vault is
                    available.
                  </p>
                  <VaultSection />
                </GlassCard>
              </motion.div>

              {/* Verification */}
              <motion.div variants={fadeInUp}>
                <SectionTitle icon={CheckCircle}>Verification</SectionTitle>
                <GlassCard className="p-6">
                  <div className="space-y-3">
                    {[
                      { label: "Identity Verification", done: user.verificationStatus === "verified", submitted: Boolean(user.verificationSubmittedAt) },
                      { label: "Email", done: user.verificationStatus === "verified", submitted: Boolean(user.verificationSubmittedAt && user.email) },
                      { label: "Phone", done: user.verificationStatus === "verified", submitted: Boolean(user.verificationSubmittedAt && user.phoneE164) },
                      { label: "Government ID", done: user.verificationStatus === "verified", submitted: Boolean(user.verificationSubmittedAt && user.documentType) },
                    ].map((item) => {
                      const status = item.done ? "verified" : item.submitted ? "pending" : "not-started";
                      return (
                        <div key={item.label} className="flex items-center justify-between rounded-xl bg-zinc-800/30 border border-zinc-800/50 px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-lg",
                              status === "verified"
                                ? "bg-green-500/10 text-green-400"
                                : status === "pending"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-zinc-800 text-zinc-500"
                            )}>
                              {status === "verified" ? (
                                <CheckCircle className="h-4 w-4" />
                              ) : status === "pending" ? (
                                <Clock className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                            </div>
                            <span className="text-sm font-medium text-zinc-200">{item.label}</span>
                          </div>
                          <span className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            status === "verified"
                              ? "bg-green-500/10 text-green-400"
                              : status === "pending"
                              ? "bg-amber-500/10 text-amber-400"
                              : "bg-zinc-800 text-zinc-500"
                          )}>
                            {status === "verified" ? "Verified" : status === "pending" ? "Pending" : "Not Set"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={onStartVerification}
                    className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#c8a44e]/30 bg-[#c8a44e]/5 px-5 py-2.5 text-sm font-medium text-[#c8a44e] transition hover:bg-[#c8a44e]/10 hover:border-[#c8a44e]/50"
                  >
                    <Shield className="h-4 w-4" />
                    {user.verificationStatus === "verified" ? "Manage Verification" : "Upgrade Verification"}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  const { address, isConnected, connector } = useAccount();
  const mounted = useMounted();
  const { status, profile, error, retry, save } = useProfile(
    mounted && isConnected ? address : undefined
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const onboardedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mounted || !isConnected || !address || status !== "ready") return;
    if (profile) return;
    const key = address.toLowerCase();
    if (onboardedForRef.current === key || formOpen) return;
    onboardedForRef.current = key;
    const id = setTimeout(() => setFormOpen(true), 0);
    return () => clearTimeout(id);
  }, [mounted, isConnected, address, status, profile, formOpen]);

  const handleSubmitProfile = (submission: VerificationSubmission) => {
    if (!address) return;
    save(profileFromSubmission(submission, connector?.name ?? "Browser Wallet", profile));
    setFormOpen(false);
  };

  if (!mounted) {
    return (
      <ProfilePlaceholder
        icon={Loader2}
        title="Loading Profile…"
        description="Loading profile..."
      />
    );
  }

  if (!isConnected || !address) {
    return (
      <ProfilePlaceholder
        icon={Wallet}
        title="Connect Your Wallet"
        description="Connect your wallet to create and access your profile."
      >
        <ConnectButton />
      </ProfilePlaceholder>
    );
  }

  if (status !== "ready") {
    return (
      <ProfilePlaceholder
        icon={Loader2}
        title="Loading Profile…"
        description="Loading profile..."
      />
    );
  }

  if (error) {
    return (
      <ProfilePlaceholder
        icon={AlertTriangle}
        title="Couldn't Load Profile"
        description={error}
      >
        <Button onClick={retry}>Retry</Button>
      </ProfilePlaceholder>
    );
  }

  if (profile) {
    return (
      <>
        <ProfileDashboard
          user={profile}
          onUpdate={save}
          onStartVerification={() => setFormOpen(true)}
          onEditProfile={() => setEditOpen(true)}
        />
        <VerificationForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleSubmitProfile}
          walletAddress={address}
        />
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={save}
          profile={profile}
        />
      </>
    );
  }

  return (
    <>
      <ProfilePlaceholder
        icon={Wallet}
        title="Set Up Your Profile"
        description="Complete your profile to start bidding and creating auctions."
      >
        <Button onClick={() => setFormOpen(true)}>Complete Profile Setup</Button>
      </ProfilePlaceholder>
      <VerificationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitProfile}
        walletAddress={address}
      />
    </>
  );
}
