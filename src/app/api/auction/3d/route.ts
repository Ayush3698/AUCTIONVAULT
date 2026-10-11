import { NextResponse } from "next/server";
import {
  createLocalThreeDTask,
  fetchLocalThreeDTask,
  normalizeProductImages,
  pickPrimaryView,
  readThreeDConfig,
  ThreeDProviderError,
  type ThreeDErrorCode,
  type NormalizedView,
  type ThreeDTaskSnapshot,
} from "@/lib/three-d";
import { ACCEPTED_IMAGE_MIME_LIST, PRODUCT_IMAGE_MAX_BYTES, sniffFile } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGES = 12;
const MAX_IMAGE_BYTES = PRODUCT_IMAGE_MAX_BYTES;

function fail(status: number, code: ThreeDErrorCode, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, code, error, ...extra }, { status });
}

async function validateImages(files: File[]): Promise<string[]> {
  const errors: string[] = [];
  if (files.length === 0) errors.push("No product images were provided.");
  if (files.length > MAX_IMAGES) errors.push(`Too many images (max ${MAX_IMAGES}).`);
  for (const file of files) {
    if (file.size <= 0) {
      errors.push(`${file.name || "image"}: file is empty.`);
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      errors.push(`${file.name || "image"}: exceeds ${Math.round(MAX_IMAGE_BYTES / 1_000_000)}MB.`);
    }
    const sniffed = await sniffFile(file);
    const mime = sniffed ?? file.type;
    if (!ACCEPTED_IMAGE_MIME_LIST.includes(mime)) {
      errors.push(`${file.name || "image"}: unsupported image type (${mime || "unknown"}).`);
    }
  }
  return errors;
}

function handleGenerationError(error: unknown): NextResponse {
  if (error instanceof ThreeDProviderError) {
    return fail(error.status, error.code, error.message);
  }
  return fail(
    502,
    "GENERATION_FAILED",
    "The local Hunyuan3D generation could not be completed."
  );
}

export async function POST(request: Request) {
  const config = readThreeDConfig();

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return fail(400, "INVALID_REQUEST", "Expected a multipart/form-data request with product images.");
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return fail(400, "INVALID_REQUEST", "The uploaded form data could not be read.");
  }

  const files = incoming.getAll("images").filter((entry): entry is File => entry instanceof File);
  const imageErrors = await validateImages(files);
  if (imageErrors.length > 0) {
    return fail(400, "INVALID_IMAGES", "The uploaded product images did not pass validation.", {
      details: imageErrors,
    });
  }

  const angles = incoming.getAll("angles").filter((value): value is string => typeof value === "string");
  const productName = (incoming.get("productName") ?? "").toString().trim();

  let primary: NormalizedView;
  try {
    const views = await normalizeProductImages(files, angles);
    primary = pickPrimaryView(views);
  } catch (error) {
    if (error instanceof ThreeDProviderError) {
      return fail(error.status, error.code, error.message);
    }
    return fail(
      502,
      "GENERATION_FAILED",
      "The uploaded product image could not be prepared for the Hunyuan3D service."
    );
  }

  let taskId: string;
  try {
    taskId = await createLocalThreeDTask(config, primary, productName);
  } catch (error) {
    return handleGenerationError(error);
  }

  return NextResponse.json({ ok: true, taskId, status: "pending" });
}

export async function GET(request: Request) {
  const taskId = new URL(request.url).searchParams.get("taskId") ?? "";
  if (!taskId) {
    return fail(400, "INVALID_REQUEST", "A taskId query parameter is required.");
  }

  let snapshot: ThreeDTaskSnapshot;
  try {
    snapshot = await fetchLocalThreeDTask(taskId);
  } catch (error) {
    if (error instanceof ThreeDProviderError) {
      return fail(error.status, error.code, error.message);
    }
    return fail(
      502,
      "PROVIDER_UNREACHABLE",
      "Could not check the Hunyuan3D generation status."
    );
  }

  if (snapshot.status === "succeeded") {
    return NextResponse.json({
      ok: true,
      status: "succeeded",
      progress: 100,
      modelUrl: snapshot.modelUrl,
    });
  }

  if (snapshot.status === "failed") {
    return fail(
      502,
      snapshot.errorCode && snapshot.errorCode !== "GENERATION_FAILED"
        ? snapshot.errorCode
        : "GENERATION_FAILED",
      snapshot.errorMessage ?? "The Hunyuan3D generation failed.",
      { providerStatus: snapshot.status }
    );
  }

  return NextResponse.json({ ok: true, status: snapshot.status, progress: snapshot.progress });
}