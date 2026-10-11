import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { takeChallenge } from "@/lib/challenge-store";
import {
  ALLOWED_DOCUMENT_MIMES,
  ALLOWED_IMAGE_MIMES,
  DOCUMENT_MAX_BYTES,
  SELFIE_MAX_BYTES,
  DOCUMENT_TYPES,
  STAGE_SUBMITTED,
  STAGE_PENDING,
  getCountry,
  validateDateOfBirth,
  validateDisplayName,
  validateEmail,
  validatePhone,
  validateUsername,
} from "@/lib/verify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

const RATE_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts: Map<string, number[]> = new Map();

function rateLimited(address: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(address) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) return true;
  recent.push(now);
  attempts.set(address, recent);
  return false;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

interface Payload {
  walletAddress?: unknown;
  signature?: unknown;
  nonce?: unknown;
  displayName?: unknown;
  username?: unknown;
  email?: unknown;
  phoneE164?: unknown;
  phoneCountry?: unknown;
  countryCode?: unknown;
  dateOfBirth?: unknown;
  documentType?: unknown;
  documentMime?: unknown;
  documentSize?: unknown;
  documentSides?: unknown;
  selfieMime?: unknown;
  selfieSize?: unknown;
  stage?: unknown;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return bad("Invalid request body.");
  }

  const walletAddress = str(payload.walletAddress);
  if (!WALLET_RE.test(walletAddress)) return bad("Invalid wallet address.");
  const walletKey = walletAddress.toLowerCase();
  if (rateLimited(walletKey)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many attempts. Please wait a few minutes and try again.",
      },
      { status: 429 }
    );
  }

  const nonce = str(payload.nonce);
  const challenge = takeChallenge(nonce);
  if (!challenge) return bad("Verification session expired. Please try again.");
  if (challenge.address !== walletKey)
    return bad("Verification session does not match the connected wallet.");

  let signatureOk = false;
  try {
    const signature = str(payload.signature) as `0x${string}`;
    signatureOk = await verifyMessage({
      address: walletKey as `0x${string}`,
      message: challenge.message,
      signature,
    });
  } catch {
    signatureOk = false;
  }
  if (!signatureOk) {
    return bad("Wallet signature could not be verified. Please try again.", 403);
  }

  const errors: Record<string, string> = {};

  const stage = str(payload.stage);
  if (stage !== STAGE_SUBMITTED) {
    errors.stage = "Invalid verification state.";
  }

  const displayName = str(payload.displayName);
  const name = validateDisplayName(displayName);
  if (!name.valid) errors.displayName = name.error;

  const username = str(payload.username);
  const uname = validateUsername(username);
  if (!uname.valid) errors.username = uname.error;

  const email = str(payload.email);
  const mail = validateEmail(email);
  if (!mail.valid) errors.email = mail.error;

  const phoneE164 = str(payload.phoneE164);
  const phoneCountry = str(payload.phoneCountry).toUpperCase();
  const phone = validatePhone(phoneE164, phoneCountry);
  if (!phone.valid) errors.phone = phone.error ?? "Enter a valid phone number.";

  const countryCode = str(payload.countryCode).toUpperCase();
  const country = getCountry(countryCode);
  if (!country) errors.country = "Please select a valid country.";

  const dob = validateDateOfBirth(str(payload.dateOfBirth));
  if (!dob.valid) errors.dateOfBirth = dob.error ?? "Enter a valid date of birth.";

  const documentType = str(payload.documentType);
  if (!DOCUMENT_TYPES.some((t) => t.id === documentType))
    errors.documentType = "Please select a supported identity document type.";

  const documentMime = str(payload.documentMime);
  if (!ALLOWED_DOCUMENT_MIMES.includes(documentMime))
    errors.documentMime = "Unsupported identity document file type.";

  const documentSize = num(payload.documentSize);
  if (!(documentSize > 0) || documentSize > DOCUMENT_MAX_BYTES)
    errors.documentSize = "Identity document file is missing or too large.";

  const documentSides = str(payload.documentSides);
  if (documentSides !== "front" && documentSides !== "front-and-back")
    errors.documentSides = "Invalid document sides.";

  const selfieMime = str(payload.selfieMime);
  if (!ALLOWED_IMAGE_MIMES.includes(selfieMime))
    errors.selfieMime = "Live selfie is required.";

  const selfieSize = num(payload.selfieSize);
  if (!(selfieSize > 0) || selfieSize > SELFIE_MAX_BYTES)
    errors.selfieSize = "Live selfie file is missing or too large.";

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { ok: false, error: "Some fields did not pass verification.", errors },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: STAGE_PENDING,
      message:
        "Verification submitted successfully. Our review team will verify your information.",
    },
    { status: 200 }
  );
}