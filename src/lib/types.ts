export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  walletAddress: string;
  walletProvider: string;
  country: string;
  countryCode: string;
  verified: boolean;
  level: number;
  reputation: number;
  badges: Badge[];
  memberSince: string;
  bio?: string;
  stats: UserStats;
}

export interface Profile extends User {
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  verificationMethod?: string;
  verificationStatus: "pending" | "verified";
  createdAt: string;
  phoneE164?: string;
  phoneCountry?: string;
  verificationStage?: string;
  verificationSubmittedAt?: string;
  documentType?: string;
  documentMime?: string;
  documentSize?: number;
  documentSides?: "front" | "front-and-back";
  selfieMime?: string;
  selfieSize?: number;
}

export interface VerificationSubmission {
  walletAddress: string;
  displayName: string;
  username: string;
  email: string;
  phoneE164: string;
  phoneCountry: string;
  country: string;
  countryCode: string;
  dateOfBirth?: string;
  avatar: string;
  documentType: string;
  documentMime: string;
  documentSize: number;
  documentSides: "front" | "front-and-back";
  selfieMime: string;
  selfieSize: number;
  stage: string;
  privacyConsent: boolean;
}

export interface UserStats {
  auctionsCreated: number;
  auctionsWon: number;
  auctionsLost: number;
  totalBids: number;
  successfulSales: number;
  totalAuctionValue: number;
  activeAuctions: number;
  completedAuctions: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  year?: number;
  condition: "New" | "Like New" | "Excellent" | "Good" | "Fair" | "Used" | "Restored";
  images: string[];
  videos?: string[];
  model3d?: string;
  seller: User;
  location: string;
  countryCode: string;
  startingBid: number;
  currentBid: number;
  currency: string;
  reservePrice?: number;
  minIncrement: number;
  buyNowPrice?: number;
  bids: Bid[];
  bidCount: number;
  watcherCount: number;
  participantCount: number;
  startTime: string;
  endTime: string;
  liveBiddingStart: string;
  status: AuctionStatus;
  paymentMethods: string[];
  shippingInfo: string;
  returnPolicy: string;
  sellerNotes?: string;
  termsAndConditions: string;
  antiSnipingExtension: boolean;
  featured: boolean;
  trending: boolean;
  verified: boolean;
  createdAt: string;
}

export type AuctionStatus =
  | "draft"
  | "pending"
  | "scheduled"
  | "live"
  | "ending-soon"
  | "sold"
  | "unsold"
  | "cancelled"
  | "disputed"
  | "completed";

export interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  userAvatar: string;
  amount: number;
  currency: string;
  timestamp: string;
  isWinning: boolean;
}

export interface ChatMessage {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  isSystem: boolean;
  isSeller: boolean;
  verified: boolean;
  reactions?: { emoji: string; count: number }[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  auctionId?: string;
}

export interface Complaint {
  id: string;
  auctionId: string;
  auctionTitle: string;
  category: string;
  description: string;
  status: "submitted" | "under-review" | "seller-responded" | "evidence-required" | "resolved" | "rejected" | "escalated";
  submittedAt: string;
  resolution?: string;
  timeline: { date: string; action: string; by: string }[];
}

export interface GlobalActivity {
  id: string;
  country: string;
  countryCode: string;
  city: string;
  action: string;
  auctionTitle: string;
  timestamp: string;
}

export interface PlatformStats {
  totalAuctions: number;
  liveAuctions: number;
  registeredUsers: number;
  countries: number;
  totalBids: number;
  totalAuctionValue: number;
}

export interface HistoryItem {
  auction: Auction;
  userBid: number;
  isWinning: boolean;
  won: boolean;
  paymentStatus: "pending" | "paid" | "refunded" | "disputed" | "none";
  status: "active" | "won" | "lost" | "completed" | "disputed";
}
