import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { setChallenge, CHALLENGE_TTL_MS } from "@/lib/challenge-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;
const MAX_PER_ADDRESS = 15;
const ISSUE_WINDOW_MS = 60 * 60 * 1000;

const issuance: Map<string, number[]> = new Map();

function tooManyIssued(address: string): boolean {
  const now = Date.now();
  const recent = (issuance.get(address) ?? []).filter((t) => now - t < ISSUE_WINDOW_MS);
  if (recent.length >= MAX_PER_ADDRESS) return true;
  recent.push(now);
  issuance.set(address, recent);
  return false;
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!WALLET_RE.test(address)) {
    return NextResponse.json(
      { ok: false, error: "Invalid wallet address." },
      { status: 400 }
    );
  }
  const key = address.toLowerCase();
  if (tooManyIssued(key)) {
    return NextResponse.json(
      { ok: false, error: "Too many verification attempts. Please try again later." },
      { status: 429 }
    );
  }

  const nonce = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const message = `AuctionVault Verification\n\nWallet: ${address}\nNonce: ${nonce}\nIssued: ${issuedAt}`;

  setChallenge(nonce, { address: key, message, expiresAt });

  return NextResponse.json(
    { ok: true, nonce, message, issuedAt, expiresAt },
    { status: 200 }
  );
}