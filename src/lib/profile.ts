import type { Profile, VerificationSubmission } from "./types";

const STORAGE_PREFIX = "auctionvault.profile.";

function storageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.toLowerCase()}`;
}

export function readProfile(address: string): Profile | null {
  if (typeof window === "undefined" || !address) return null;
  const raw = window.localStorage.getItem(storageKey(address));
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Profile | null;
  if (
    !parsed ||
    !parsed.walletAddress ||
    parsed.walletAddress.toLowerCase() !== address.toLowerCase()
  ) {
    return null;
  }
  return parsed;
}

export function writeProfile(profile: Profile): void {
  if (typeof window === "undefined" || !profile?.walletAddress) return;
  window.localStorage.setItem(storageKey(profile.walletAddress), JSON.stringify(profile));
}

export function profileFromSubmission(
  submission: VerificationSubmission,
  walletProvider: string,
  existing: Profile | null = null
): Profile {
  const now = new Date().toISOString();

  const base: Profile = existing ?? {
    id: submission.walletAddress.toLowerCase(),
    username: submission.username,
    displayName: submission.displayName,
    avatar: submission.avatar,
    walletAddress: submission.walletAddress,
    walletProvider,
    country: submission.country,
    countryCode: submission.countryCode,
    verified: false,
    level: 1,
    reputation: 0,
    badges: [],
    memberSince: now,
    createdAt: now,
    bio: "",
    stats: {
      auctionsCreated: 0,
      auctionsWon: 0,
      auctionsLost: 0,
      totalBids: 0,
      successfulSales: 0,
      totalAuctionValue: 0,
      activeAuctions: 0,
      completedAuctions: 0,
    },
    email: submission.email,
    phone: submission.phoneE164,
    phoneE164: submission.phoneE164,
    phoneCountry: submission.phoneCountry,
    dateOfBirth: submission.dateOfBirth || undefined,
    verificationMethod: submission.documentType,
    verificationStatus: "pending",
    verificationStage: submission.stage,
    verificationSubmittedAt: now,
  };

  return {
    ...base,
    username: submission.username,
    displayName: submission.displayName,
    avatar: submission.avatar || base.avatar,
    walletAddress: submission.walletAddress,
    walletProvider,
    country: submission.country || base.country,
    countryCode: submission.countryCode || base.countryCode,
    email: submission.email || base.email,
    phone: submission.phoneE164 || base.phone,
    phoneE164: submission.phoneE164 || base.phoneE164,
    phoneCountry: submission.phoneCountry || base.phoneCountry,
    dateOfBirth: submission.dateOfBirth || base.dateOfBirth,
    verificationMethod: submission.documentType,
    verificationStatus: "pending",
    verificationStage: submission.stage,
    verificationSubmittedAt: now,
    documentType: submission.documentType,
    documentMime: submission.documentMime,
    documentSize: submission.documentSize,
    documentSides: submission.documentSides,
    selfieMime: submission.selfieMime,
    selfieSize: submission.selfieSize,
  };
}