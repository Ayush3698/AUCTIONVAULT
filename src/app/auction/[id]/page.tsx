"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  cn,
  formatCurrency,
  formatNumber,
  getTimeRemaining,
  getRelativeTime,
} from "@/lib/utils";
import { mockAuctions, mockChatMessages } from "@/lib/data";
import type { Auction } from "@/lib/types";
import {
  Heart,
  Share2,
  Flag,
  MapPin,
  Clock,
  Users,
  Eye,
  Gavel,
  Shield,
  Truck,
  RotateCcw,
  FileText,
  MessageCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const MOCK_BIDS = [
  { id: "bid_01", userId: "usr_101", username: "horolux", userAvatar: "", amount: 138000, timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), isWinning: false },
  { id: "bid_02", userId: "usr_102", username: "collector_no1", userAvatar: "", amount: 135000, timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), isWinning: false },
  { id: "bid_03", userId: "usr_103", username: "timepiece_king", userAvatar: "", amount: 132000, timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), isWinning: false },
  { id: "bid_04", userId: "usr_104", username: "swissvault", userAvatar: "", amount: 128500, timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), isWinning: false },
  { id: "bid_05", userId: "usr_105", username: "lux_bids", userAvatar: "", amount: 125000, timestamp: new Date(Date.now() - 86400000).toISOString(), isWinning: false },
  { id: "bid_06", userId: "usr_106", username: "elitewatches", userAvatar: "", amount: 119000, timestamp: new Date(Date.now() - 86400000 * 1 - 3600000 * 4).toISOString(), isWinning: false },
  { id: "bid_07", userId: "usr_107", username: "rolexhunter", userAvatar: "", amount: 112000, timestamp: new Date(Date.now() - 86400000 * 1 - 3600000 * 8).toISOString(), isWinning: false },
  { id: "bid_08", userId: "usr_108", username: "auctionpro99", userAvatar: "", amount: 105000, timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), isWinning: false },
];

const MOCK_BIDS_EXTENDED = [
  ...MOCK_BIDS,
  { id: "bid_09", userId: "usr_109", username: "watchfan2024", userAvatar: "", amount: 98000, timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 6).toISOString(), isWinning: false },
  { id: "bid_10", userId: "usr_110", username: "grailseeker", userAvatar: "", amount: 92000, timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 12).toISOString(), isWinning: false },
  { id: "bid_11", userId: "usr_111", username: "chrono_addict", userAvatar: "", amount: 89000, timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), isWinning: false },
  { id: "bid_12", userId: "usr_112", username: "patekfan", userAvatar: "", amount: 87000, timestamp: new Date(Date.now() - 86400000 * 3 - 3600000 * 8).toISOString(), isWinning: false },
];

const SPECIFICATIONS = [
  { label: "Brand", value: "Patek Philippe" },
  { label: "Model", value: "Nautilus 5711/1A" },
  { label: "Year", value: "2023" },
  { label: "Case Material", value: "Stainless Steel" },
  { label: "Case Size", value: "40mm" },
  { label: "Movement", value: "Caliber 26-330 S C" },
  { label: "Power Reserve", value: "45 hours" },
  { label: "Water Resistance", value: "120 meters" },
  { label: "Dial Color", value: "Blue-Black Gradient" },
  { label: "Bracelet", value: "Stainless Steel" },
];

function AuctionNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-2xl bg-zinc-800/70 p-5">
        <Gavel className="h-10 w-10 text-zinc-500" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-zinc-50">
        Auction not found
      </h1>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        This auction doesn&apos;t exist or has not been created yet.
      </p>
      <Link
        href="/auction-house"
        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#c8a44e] px-6 text-sm font-semibold text-black transition-all hover:bg-[#d4b565]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Auction House
      </Link>
    </div>
  );
}

export default function AuctionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const auction = mockAuctions.find((a) => a.id === id);

  if (!auction) {
    return <AuctionNotFound />;
  }

  return <AuctionDetailInner auction={auction} />;
}

function AuctionDetailInner({ auction }: { auction: Auction }) {

  const [activeTab, setActiveTab] = useState<"description" | "shipping" | "seller" | "terms">("description");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [zoom3D, setZoom3D] = useState(1);
  const [isWatched, setIsWatched] = useState(false);
  const [showBidsExpanded, setShowBidsExpanded] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<ReturnType<typeof getTimeRemaining> | null>(null);
  const mounted = useMounted();
  const [customBidAmount, setCustomBidAmount] = useState("");
  const [bidPlaced, setBidPlaced] = useState(false);
  const [bidPlacing, setBidPlacing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(mockChatMessages.filter((m) => m.auctionId === auction.id));
  const [isHammerActive, setIsHammerActive] = useState(false);
  const [hammerStage, setHammerStage] = useState(0);
  const [bidFlash, setBidFlash] = useState(false);
  const [activeBidQuickBtn, setActiveBidQuickBtn] = useState<number | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateTimer = useCallback(() => {
    setTimeRemaining(getTimeRemaining(auction.endTime));
  }, [auction.endTime]);

  useEffect(() => {
    countdownTimerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [updateTimer]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const images = auction.images.length > 0 ? auction.images : ["/api/placeholder/800/600"];
  const displayBids = showBidsExpanded ? MOCK_BIDS_EXTENDED : MOCK_BIDS;
  const highestBid = MOCK_BIDS[0];
  const isEndingSoon =
    timeRemaining !== null && timeRemaining.total > 0 && timeRemaining.total < 3600000;
  const reserveMet = auction.reservePrice ? auction.currentBid >= auction.reservePrice : true;

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleWatchToggle = () => {
    setIsWatched((prev) => !prev);
  };

  const handlePlaceBid = (amount?: number) => {
    const bidAmount = amount || Number(customBidAmount);
    if (bidAmount <= 0) return;
    setBidPlacing(true);
    setTimeout(() => {
      setBidPlacing(false);
      setBidPlaced(true);
      setBidFlash(true);
      setTimeout(() => setBidPlaced(false), 3000);
      setTimeout(() => setBidFlash(false), 1000);
    }, 1500);
  };

  const handleQuickBid = (increment: number) => {
    setActiveBidQuickBtn(increment);
    setCustomBidAmount(String(auction.currentBid + increment));
    setTimeout(() => setActiveBidQuickBtn(null), 300);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg = {
      id: `msg_${Date.now()}`,
      auctionId: auction.id,
      userId: "usr_001",
      username: "alexandra_v",
      userAvatar: "",
      message: chatInput.trim(),
      timestamp: new Date().toISOString(),
      isSystem: false,
      isSeller: false,
      verified: true,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  const triggerHammer = () => {
    setIsHammerActive(true);
    setHammerStage(0);
    setTimeout(() => setHammerStage(1), 2000);
    setTimeout(() => setHammerStage(2), 4000);
    setTimeout(() => setHammerStage(3), 6000);
  };

  const getStatusDisplay = () => {
    switch (auction.status) {
      case "live":
        return { label: "LIVE", color: "bg-live", pulse: true };
      case "ending-soon":
        return { label: "ENDING SOON", color: "bg-ending-soon", pulse: true };
      case "scheduled":
        return { label: "SCHEDULED", color: "bg-info", pulse: false };
      case "sold":
        return { label: "SOLD", color: "bg-gold", pulse: false };
      default:
        return { label: auction.status.toUpperCase(), color: "bg-muted", pulse: false };
    }
  };

  const statusDisplay = getStatusDisplay();

  const tabUnderlineRef = useRef<HTMLDivElement>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabContainerRef.current && tabUnderlineRef.current) {
      const container = tabContainerRef.current;
      const activeEl = container.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
      if (activeEl) {
        tabUnderlineRef.current.style.width = `${activeEl.offsetWidth}px`;
        tabUnderlineRef.current.style.left = `${activeEl.offsetLeft}px`;
      }
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Breadcrumb / Back */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Auctions
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

          {/* ====================== LEFT COLUMN ====================== */}
          <div className="w-full lg:w-[60%] space-y-6">

            {/* === Product Media Gallery === */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Main Image Area */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden group">
                <AnimatePresence mode="wait">
                  {show3DViewer ? (
                    <motion.div
                      key="3d-viewer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ perspective: "800px" }}
                    >
                      <motion.div
                        className="w-64 h-40 bg-gradient-to-br from-gold/20 via-gold/5 to-transparent rounded-xl border border-gold/30 flex items-center justify-center"
                        animate={{
                          rotateX: rotateX,
                          rotateY: rotateY,
                          scale: zoom3D,
                        }}
                        transition={{ type: "spring", stiffness: 100, damping: 20 }}
                      >
                        <div className="text-center">
                          <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
                            <Gavel className="w-8 h-8 text-gold" />
                          </div>
                          <p className="text-gold font-medium text-sm">3D Model</p>
                          <p className="text-muted text-xs mt-1">{auction.brand || "Item"}</p>
                        </div>
                      </motion.div>
                      <p className="mt-6 text-muted text-sm">Interactive 3D Model — Drag to rotate</p>
                      {/* 3D Controls */}
                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() => setRotateY((prev) => prev - 15)}
                          className="p-2 rounded-lg bg-card border border-border hover:border-gold/50 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-muted" />
                        </button>
                        <button
                          onClick={() => setZoom3D((prev) => Math.min(prev + 0.2, 3))}
                          className="p-2 rounded-lg bg-card border border-border hover:border-gold/50 transition-colors"
                        >
                          <ZoomIn className="w-4 h-4 text-muted" />
                        </button>
                        <button
                          onClick={() => setZoom3D((prev) => Math.max(prev - 0.2, 0.5))}
                          className="p-2 rounded-lg bg-card border border-border hover:border-gold/50 transition-colors"
                        >
                          <ZoomOut className="w-4 h-4 text-muted" />
                        </button>
                        <button
                          onClick={() => { setRotateX(0); setRotateY(0); setZoom3D(1); }}
                          className="px-3 py-2 rounded-lg bg-card border border-border hover:border-gold/50 transition-colors text-xs text-muted"
                        >
                          Reset
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`image-${currentImageIndex}`}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-32 h-32 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                            <span className="text-4xl font-bold gold-gradient">{currentImageIndex + 1}</span>
                          </div>
                          <p className="mt-4 text-white/40 text-sm">High-resolution image {currentImageIndex + 1}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Image Counter */}
                {!show3DViewer && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full glass text-xs font-medium text-white/80">
                    {currentImageIndex + 1} of {images.length}
                  </div>
                )}

                {/* Nav Arrows */}
                {!show3DViewer && images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full glass opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full glass opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </>
                )}

                {/* Top-Right Controls */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-2 rounded-full glass opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-4 h-4 text-white" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>

                {/* Bottom-Right 3D/360 Controls */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setShow3DViewer(true)}
                    className="px-3 py-1.5 rounded-full glass text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
                  >
                    3D View
                  </button>
                  <button className="px-3 py-1.5 rounded-full glass text-xs font-medium text-white/70 hover:bg-white/10 transition-colors">
                    360°
                  </button>
                </div>

                {/* Close 3D viewer */}
                {show3DViewer && (
                  <button
                    onClick={() => setShow3DViewer(false)}
                    className="absolute top-4 right-4 px-3 py-1.5 rounded-full glass text-xs font-medium text-white/70 hover:bg-white/10 transition-colors z-10"
                  >
                    Close 3D View
                  </button>
                )}
              </div>

              {/* Thumbnail Strip */}
              <div className="p-3 flex items-center gap-2 overflow-x-auto">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentImageIndex(idx); setShow3DViewer(false); }}
                    className={cn(
                      "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all",
                      currentImageIndex === idx && !show3DViewer
                        ? "border-gold shadow-[0_0_12px_rgba(200,164,78,0.3)]"
                        : "border-border hover:border-border-hover"
                    )}
                  >
                    <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0f3460] flex items-center justify-center">
                      <span className="text-xs font-medium text-white/50">{idx + 1}</span>
                    </div>
                  </button>
                ))}
                {/* 3D thumbnail */}
                <button
                  onClick={() => setShow3DViewer(true)}
                  className={cn(
                    "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all",
                    show3DViewer
                      ? "border-gold shadow-[0_0_12px_rgba(200,164,78,0.3)]"
                      : "border-border hover:border-border-hover"
                  )}
                >
                  <div className="w-full h-full bg-gradient-to-br from-gold/10 to-transparent flex items-center justify-center">
                    <span className="text-xs font-medium text-gold">3D</span>
                  </div>
                </button>
              </div>
            </div>

            {/* === Auction Information Tabs === */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Tab Bar */}
              <div
                ref={tabContainerRef}
                className="relative flex border-b border-border overflow-x-auto"
              >
                {(["description", "shipping", "seller", "terms"] as const).map((tab) => (
                  <button
                    key={tab}
                    data-tab={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors relative z-10",
                      activeTab === tab ? "text-gold" : "text-muted hover:text-foreground"
                    )}
                  >
                    {tab === "description" && <FileText className="w-4 h-4 inline mr-2 -mt-0.5" />}
                    {tab === "shipping" && <Truck className="w-4 h-4 inline mr-2 -mt-0.5" />}
                    {tab === "seller" && <Shield className="w-4 h-4 inline mr-2 -mt-0.5" />}
                    {tab === "terms" && <Info className="w-4 h-4 inline mr-2 -mt-0.5" />}
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
                <div
                  ref={tabUnderlineRef}
                  className="absolute bottom-0 h-[2px] bg-gold transition-all duration-300 ease-out"
                />
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "description" && (
                    <motion.div
                      key="description"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold mb-4">About This Item</h3>
                      <p className="text-muted leading-relaxed mb-6">{auction.description}</p>

                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-foreground mb-3">Condition</h4>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          {auction.condition}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3">Specifications</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SPECIFICATIONS.map((spec) => (
                            <div
                              key={spec.label}
                              className="flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                            >
                              <span className="text-muted text-sm">{spec.label}</span>
                              <span className="text-foreground text-sm font-medium">{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "shipping" && (
                    <motion.div
                      key="shipping"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold mb-4">Shipping &amp; Returns</h3>

                      <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-start gap-3">
                            <Truck className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Shipping</h4>
                              <p className="text-muted text-sm leading-relaxed">{auction.shippingInfo}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-start gap-3">
                            <RotateCcw className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Return Policy</h4>
                              <p className="text-muted text-sm leading-relaxed">{auction.returnPolicy}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Item Location</h4>
                              <p className="text-muted text-sm">{auction.location}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "seller" && (
                    <motion.div
                      key="seller"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold mb-4">Seller Information</h3>

                      <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-bold text-gold">
                              {auction.seller.displayName.charAt(0)}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">{auction.seller.displayName}</h4>
                              {auction.seller.verified && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 text-gold text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-muted text-sm">@{auction.seller.username}</p>
                            <div className="flex items-center gap-4 mt-3 text-sm">
                              <div className="text-center">
                                <p className="font-semibold text-foreground">{auction.seller.stats.successfulSales}</p>
                                <p className="text-muted text-xs">Sales</p>
                              </div>
                              <div className="w-px h-8 bg-border" />
                              <div className="text-center">
                                <p className="font-semibold text-foreground">{formatNumber(auction.seller.reputation)}</p>
                                <p className="text-muted text-xs">Reputation</p>
                              </div>
                              <div className="w-px h-8 bg-border" />
                              <div className="text-center">
                                <p className="font-semibold text-foreground">Level {auction.seller.level}</p>
                                <p className="text-muted text-xs">Member</p>
                              </div>
                            </div>
                            <p className="text-muted text-xs mt-3">
                              Member since {new Date(auction.seller.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <button className="text-gold text-sm font-medium hover:text-gold-light transition-colors inline-flex items-center gap-1.5">
                            View Auction History
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === "terms" && (
                    <motion.div
                      key="terms"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <h3 className="text-lg font-semibold mb-4">Terms &amp; Conditions</h3>

                      <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <h4 className="text-sm font-semibold mb-2">Payment Methods</h4>
                          <div className="flex flex-wrap gap-2">
                            {auction.paymentMethods.map((method) => (
                              <span
                                key={method}
                                className="px-3 py-1.5 rounded-full bg-gold/10 text-gold text-xs font-medium border border-gold/20"
                              >
                                {method}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <h4 className="text-sm font-semibold mb-2">Terms</h4>
                          <p className="text-muted text-sm leading-relaxed">{auction.termsAndConditions}</p>
                        </div>

                        {auction.sellerNotes && (
                          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <h4 className="text-sm font-semibold mb-2">Seller Notes</h4>
                            <p className="text-muted text-sm leading-relaxed">{auction.sellerNotes}</p>
                          </div>
                        )}

                        <div className="p-4 rounded-xl bg-gold/5 border border-gold/10">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-gold mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-sm font-semibold mb-1">Important Notice</h4>
                              <p className="text-muted text-sm leading-relaxed">
                                All sales are final. Buyers are responsible for verifying item condition and authenticity before bidding. A buyer&apos;s premium of 10% will be added to the winning bid amount.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* === Bid History === */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-gold" />
                  Bid History
                </h3>
                <span className="text-muted text-sm">{auction.bidCount} total bids</span>
              </div>

              <div className="divide-y divide-border">
                {displayBids.map((bid, idx) => (
                  <motion.div
                    key={bid.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "px-6 py-3.5 flex items-center gap-4 transition-colors",
                      bid.amount === highestBid.amount && bidFlash && "animate-bid-flash",
                      idx === 0 ? "bg-gold/[0.03]" : "hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Position */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                      idx === 0
                        ? "bg-gold/20 text-gold border border-gold/30"
                        : "bg-white/5 text-muted border border-border"
                    )}>
                      {idx + 1}
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-white/5 border border-border flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-muted">
                          {bid.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          idx === 0 ? "text-gold" : "text-foreground"
                        )}>
                          {bid.username}
                        </p>
                        <p className="text-xs text-muted">{mounted ? getRelativeTime(bid.timestamp) : "—"}</p>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p className={cn(
                        "text-sm font-bold",
                        idx === 0 ? "text-gold" : "text-foreground"
                      )}>
                        {formatCurrency(bid.amount)}
                      </p>
                      {idx === 0 && (
                        <p className="text-xs text-gold/70">Winning bid</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {MOCK_BIDS_EXTENDED.length > MOCK_BIDS.length && (
                <div className="px-6 py-3 border-t border-border">
                  <button
                    onClick={() => setShowBidsExpanded(!showBidsExpanded)}
                    className="text-gold text-sm font-medium hover:text-gold-light transition-colors w-full text-center"
                  >
                    {showBidsExpanded ? "Show fewer bids" : `Show all ${MOCK_BIDS_EXTENDED.length} bids`}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ====================== RIGHT COLUMN ====================== */}
          <div className="w-full lg:w-[40%]">
            <div className="lg:sticky lg:top-24 space-y-5">

              {/* === Live Bidding Panel === */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-luxury">
                <div className="p-5 sm:p-6 space-y-5">

                  {/* Status + Title */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white",
                        statusDisplay.color
                      )}>
                        {statusDisplay.pulse && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-live-pulse" />
                        )}
                        {statusDisplay.label}
                      </span>
                      {auction.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gold/10 text-gold text-xs font-medium">
                          <Shield className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold leading-tight">{auction.title}</h1>
                    <div className="flex items-center gap-2 mt-2 text-muted text-sm">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{auction.location}</span>
                    </div>
                  </div>

                  {/* Current Bid */}
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.06]">
                    <p className="text-muted text-xs uppercase tracking-wider mb-1">Current Highest Bid</p>
                    <motion.p
                      key={auction.currentBid}
                      initial={{ scale: 1.1, color: "#e8d48b" }}
                      animate={{ scale: 1, color: "#c8a44e" }}
                      className="text-3xl sm:text-4xl font-bold text-gold"
                    >
                      {formatCurrency(auction.currentBid)}
                    </motion.p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span>Starting: {formatCurrency(auction.startingBid)}</span>
                      <span className="text-border">|</span>
                      <span>Min increment: {formatCurrency(auction.minIncrement)}</span>
                    </div>
                  </div>

                  {/* Buy Now */}
                  {auction.buyNowPrice && (
                    <button className="w-full py-3.5 rounded-xl bg-gold/10 border border-gold/30 text-gold font-bold text-base hover:bg-gold/20 transition-all hover:shadow-[0_0_20px_rgba(200,164,78,0.15)]">
                      Buy Now — {formatCurrency(auction.buyNowPrice)}
                    </button>
                  )}

                  {/* Countdown Timer */}
                  <div className={cn(
                    "rounded-xl p-4 border text-center",
                    isEndingSoon
                      ? "bg-danger/5 border-danger/20 animate-countdown-pulse"
                      : "bg-white/[0.02] border-white/[0.06]"
                  )}>
                    <div className="flex items-center justify-center gap-1.5 mb-3">
                      <Clock className={cn("w-4 h-4", isEndingSoon ? "text-danger" : "text-gold")} />
                      <span className={cn(
                        "text-xs font-semibold uppercase tracking-wider",
                        isEndingSoon ? "text-danger" : "text-muted"
                      )}>
                        {isEndingSoon ? "Ending Soon" : "Time Remaining"}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      {[
                        { value: timeRemaining?.days, label: "Days" },
                        { value: timeRemaining?.hours, label: "Hrs" },
                        { value: timeRemaining?.minutes, label: "Min" },
                        { value: timeRemaining?.seconds, label: "Sec" },
                      ].map((unit, i) => (
                        <div key={unit.label} className="flex items-center gap-2 sm:gap-3">
                          <div className="text-center">
                            <div className={cn(
                              "w-14 h-14 sm:w-16 sm:h-16 rounded-lg flex items-center justify-center font-mono text-xl sm:text-2xl font-bold",
                              isEndingSoon ? "bg-danger/10 text-danger" : "bg-white/[0.04] text-foreground"
                            )}>
                              {typeof unit.value === "number" ? String(unit.value).padStart(2, "0") : "--"}
                            </div>
                            <p className="text-xs text-muted mt-1.5">{unit.label}</p>
                          </div>
                          {i < 3 && (
                            <span className={cn(
                              "text-xl font-bold -mt-5",
                              isEndingSoon ? "text-danger/40" : "text-muted/40"
                            )}>:</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Participation Stats */}
                  <div className="flex items-center justify-center gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {auction.participantCount} bidders
                    </span>
                    <span className="text-border">•</span>
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4" />
                      {auction.watcherCount} watchers
                    </span>
                    <span className="text-border">•</span>
                    <span>{auction.bidCount} bids</span>
                  </div>

                  {/* Quick Bid Buttons */}
                  <div>
                    <p className="text-xs text-muted mb-2 uppercase tracking-wider">Quick Bid</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 250, 500].map((inc) => (
                        <button
                          key={inc}
                          onClick={() => handleQuickBid(inc)}
                          className={cn(
                            "py-2.5 rounded-lg text-sm font-semibold border transition-all",
                            activeBidQuickBtn === inc
                              ? "bg-gold/20 border-gold/40 text-gold"
                              : "bg-white/[0.02] border-border text-foreground hover:border-gold/30 hover:text-gold"
                          )}
                        >
                          +${formatNumber(inc)}
                        </button>
                      ))}
                      <button
                        onClick={() => document.getElementById("custom-bid-input")?.focus()}
                        className="py-2.5 rounded-lg text-sm font-semibold border bg-white/[0.02] border-border text-muted hover:border-gold/30 hover:text-gold transition-all"
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {/* Custom Bid Input */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted text-sm font-medium">$</span>
                    <input
                      id="custom-bid-input"
                      type="number"
                      value={customBidAmount}
                      onChange={(e) => setCustomBidAmount(e.target.value)}
                      placeholder={`${auction.currentBid + auction.minIncrement}`}
                      className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/[0.02] border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all text-sm font-mono"
                    />
                  </div>

                  {/* Place Bid Button */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handlePlaceBid()}
                    disabled={bidPlacing}
                    className={cn(
                      "w-full py-4 rounded-xl font-bold text-base transition-all relative overflow-hidden",
                      bidPlaced
                        ? "bg-success text-white"
                        : "bg-gradient-to-r from-gold-dark via-gold to-gold-light text-[#09090b] hover:shadow-[0_0_30px_rgba(200,164,78,0.25)]"
                    )}
                  >
                    {bidPlacing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-[#09090b]/30 border-t-[#09090b] rounded-full animate-spin" />
                        Placing Bid...
                      </span>
                    ) : bidPlaced ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Bid Placed Successfully!
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Gavel className="w-5 h-5" />
                        Place Bid
                      </span>
                    )}
                  </motion.button>

                  {/* Reserve Price Status */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted">
                      {reserveMet ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-success" />
                          Reserve met
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          Reserve not met
                        </>
                      )}
                    </span>
                    {auction.antiSnipingExtension && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Shield className="w-3.5 h-3.5 text-gold" />
                        Anti-sniping active
                      </span>
                    )}
                  </div>

                  {/* Payment Methods */}
                  <div>
                    <p className="text-xs text-muted mb-2 uppercase tracking-wider">Accepted Payments</p>
                    <div className="flex flex-wrap gap-2">
                      {auction.paymentMethods.map((method) => (
                        <span
                          key={method}
                          className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-border text-xs text-muted"
                        >
                          {method}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleWatchToggle}
                      className={cn(
                        "flex-1 py-3 rounded-xl border font-medium text-sm flex items-center justify-center gap-2 transition-all",
                        isWatched
                          ? "bg-gold/10 border-gold/30 text-gold"
                          : "bg-white/[0.02] border-border text-muted hover:border-gold/30 hover:text-gold"
                      )}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={isWatched ? "watched" : "not-watched"}
                          initial={{ scale: 0.5 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0.5 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Heart className={cn("w-4 h-4", isWatched && "fill-gold")} />
                        </motion.div>
                      </AnimatePresence>
                      {isWatched ? "Watching" : "Watch"}
                    </motion.button>

                    <button className="flex-1 py-3 rounded-xl border bg-white/[0.02] border-border text-muted hover:border-gold/30 hover:text-gold font-medium text-sm flex items-center justify-center gap-2 transition-all">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>

                    <button className="py-3 px-4 rounded-xl border bg-white/[0.02] border-border text-muted hover:border-danger/30 hover:text-danger transition-all">
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Hammer Section (Conditional) */}
                {isHammerActive && (
                  <div className="border-t border-border p-6 text-center">
                    <AnimatePresence mode="wait">
                      {hammerStage === 0 && (
                        <motion.div
                          key="going-once"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-warning text-lg font-bold animate-pulse">Going once...</p>
                        </motion.div>
                      )}
                      {hammerStage === 1 && (
                        <motion.div
                          key="going-twice"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-danger text-lg font-bold animate-pulse">Going twice...</p>
                        </motion.div>
                      )}
                      {hammerStage === 2 && (
                        <motion.div
                          key="final-call"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-danger text-xl font-black animate-pulse">FINAL CALL!</p>
                        </motion.div>
                      )}
                      {hammerStage === 3 && (
                        <motion.div
                          key="sold"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-3"
                        >
                          <motion.div
                            initial={{ rotate: -15, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 10 }}
                            className="text-5xl"
                          >
                            🔨
                          </motion.div>
                          <p className="text-gold text-2xl font-black tracking-wider">SOLD!</p>
                          <p className="text-muted text-sm">{formatCurrency(auction.currentBid)}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Trigger hammer demo (only for ending-soon auctions) */}
                {(auction.status === "ending-soon" || auction.status === "live") && !isHammerActive && (
                  <div className="border-t border-border px-6 py-3">
                    <button
                      onClick={triggerHammer}
                      className="text-xs text-muted/50 hover:text-muted transition-colors w-full text-center"
                    >
                      Preview hammer animation
                    </button>
                  </div>
                )}
              </div>

              {/* === Live Chat === */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-gold" />
                    Live Chat
                  </h3>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-live-pulse" />
                    {chatMessages.length} users chatting
                  </span>
                </div>

                {/* Messages */}
                <div className="h-64 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map((msg) => (
                    <div key={msg.id}>
                      {msg.isSystem ? (
                        <div className="text-center">
                          <span className="inline-block px-3 py-1 rounded-full bg-gold/10 text-gold/80 text-xs font-medium">
                            {msg.message}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold",
                            msg.isSeller
                              ? "bg-gold/20 text-gold border border-gold/30"
                              : "bg-white/10 text-muted border border-border"
                          )}>
                            {msg.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground">{msg.username}</span>
                              {msg.isSeller && (
                                <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-[10px] font-bold">
                                  SELLER
                                </span>
                              )}
                              {msg.verified && !msg.isSeller && (
                                <CheckCircle className="w-3 h-3 text-gold" />
                              )}
                              <span className="text-[10px] text-muted">{mounted ? getRelativeTime(msg.timestamp) : "—"}</span>
                            </div>
                            <p className="text-sm text-muted mt-0.5 leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 rounded-lg bg-white/[0.02] border border-border text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-gold/30 transition-colors"
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className={cn(
                        "p-2 rounded-lg transition-all",
                        chatInput.trim()
                          ? "bg-gold text-[#09090b] hover:bg-gold-light"
                          : "bg-white/[0.04] text-muted"
                      )}
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bid Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-4 py-3 safe-area-pb">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted uppercase tracking-wider">Current Bid</p>
            <p className="text-lg font-bold text-gold">{formatCurrency(auction.currentBid)}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePlaceBid()}
            className="flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-gold-dark via-gold to-gold-light text-[#09090b] font-bold text-sm"
          >
            <span className="flex items-center gap-2">
              <Gavel className="w-4 h-4" />
              Bid
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleWatchToggle}
            className={cn(
              "flex-shrink-0 p-3 rounded-xl border transition-all",
              isWatched
                ? "bg-gold/10 border-gold/30 text-gold"
                : "bg-white/[0.02] border-border text-muted"
            )}
          >
            <Heart className={cn("w-5 h-5", isWatched && "fill-gold")} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}