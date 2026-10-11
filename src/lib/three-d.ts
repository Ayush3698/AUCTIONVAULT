import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import sharp from "sharp";

export type ThreeDErrorCode =
  | "NOT_CONFIGURED"
  | "INVALID_REQUEST"
  | "INVALID_IMAGES"
  | "PROVIDER_UNREACHABLE"
  | "PROVIDER_UNAVAILABLE"
  | "DEPENDENCIES_MISSING"
  | "GPU_UNAVAILABLE"
  | "MODEL_NOT_RETURNED"
  | "TIMEOUT"
  | "GENERATION_FAILED"
  | "INVALID_PROVIDER_RESPONSE";

export interface ThreeDConfig {
  baseUrl: string;
  timeoutMs: number;
}

export interface ThreeDTaskSnapshot {
  status: "pending" | "in_progress" | "succeeded" | "failed" | "canceled";
  progress: number;
  modelUrl?: string;
  errorMessage?: string;
  errorCode?: ThreeDErrorCode;
}

export interface NormalizedView {
  angle: string;
  dataUri: string;
}

export class ThreeDProviderError extends Error {
  readonly code: ThreeDErrorCode;
  readonly status: number;

  constructor(code: ThreeDErrorCode, status: number, message: string) {
    super(message);
    this.name = "ThreeDProviderError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
const DEFAULT_TIMEOUT_MS = 1_800_000;

// Single-image input is what the local Hunyuan3D image-to-3D pipeline accepts.
// The rest of the uploaded angle photos remain as the product gallery.
const NORMALIZED_MAX_EDGE = 3000;
const NORMALIZED_JPEG_QUALITY = 90;
const ANGLE_PRIORITY = ["front", "back", "left", "right", "top", "bottom"];

interface LocalTask {
  id: string;
  status: "preparing" | "generating" | "processing" | "succeeded" | "failed";
  progress: number;
  modelUrl?: string;
  error?: { code: ThreeDErrorCode; message: string };
}

// In-memory task store. Local single-user usage; survives for the process
// lifetime of the Next.js server.
const tasks = new Map<string, LocalTask>();

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function readThreeDConfig(): ThreeDConfig {
  const baseUrl = (process.env.HUNYUAN3D_URL ?? "").trim().replace(/\/+$/, "") || DEFAULT_BASE_URL;
  return {
    baseUrl,
    timeoutMs: clampInt(process.env.HUNYUAN3D_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 5_000, 3_600_000),
  };
}

function headersToRecord(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) return Object.fromEntries(headers.entries());
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  return { ...headers };
}

async function serializeBody(body: BodyInit | null | undefined): Promise<{ raw: string | Buffer | null; contentType?: string }> {
  if (body == null) return { raw: null };
  if (typeof body === "string") return { raw: body };
  if (body instanceof FormData) {
    const boundary = `----Hunyuan3DNext${randomUUID()}`;
    const parts: Buffer[] = [];
    for (const [name, value] of body.entries()) {
      const isFile = typeof value !== "string";
      const blobValue = isFile ? (value as Blob) : null;
      const data = isFile && blobValue ? Buffer.from(await blobValue.arrayBuffer()) : Buffer.from(value as string, "utf8");
      let head = `--${boundary}\r\nContent-Disposition: form-data; name="${name}"`;
      if (isFile && blobValue instanceof File) head += `; filename="${blobValue.name}"`;
      head += "\r\n";
      if (isFile && blobValue) head += `Content-Type: ${blobValue.type || "application/octet-stream"}\r\n`;
      head += "\r\n";
      parts.push(Buffer.from(head, "utf8"), data, Buffer.from("\r\n", "utf8"));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`, "utf8"));
    return { raw: Buffer.concat(parts), contentType: `multipart/form-data; boundary=${boundary}` };
  }
  if (body instanceof Blob) return { raw: Buffer.from(await body.arrayBuffer()), contentType: body.type || undefined };
  if (body instanceof ArrayBuffer) return { raw: Buffer.from(body) };
  if (ArrayBuffer.isView(body)) return { raw: Buffer.from(body.buffer, body.byteOffset, body.byteLength) };
  if (body instanceof URLSearchParams) {
    return { raw: body.toString(), contentType: "application/x-www-form-urlencoded;charset=UTF-8" };
  }
  return { raw: String(body) };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  // Node's global fetch aborts any request whose response headers do not arrive
  // within 300s (UND_ERR_HEADERS_TIMEOUT). Hunyuan3D generations routinely take
  // longer, so drive the request with node:http and honor the caller's timeout.
  const parsed = new URL(url);
  const transport = parsed.protocol === "https:" ? https : http;
  const { raw: body, contentType } = await serializeBody(init.body);

  const req = transport.request(parsed, {
    method: (init.method ?? "GET").toUpperCase(),
    headers: {
      ...headersToRecord(init.headers),
      ...(body != null ? { "content-length": Buffer.byteLength(body) } : {}),
      ...(contentType ? { "content-type": contentType } : {}),
    },
  });

  return await new Promise<Response>((resolve, reject) => {
    let settled = false;
    const once = (fn: (...args: unknown[]) => void) => (...args: unknown[]) => {
      if (!settled) {
        settled = true;
        fn(...args);
      }
    };
    const abortError = () => new DOMException("The operation was aborted.", "AbortError");

    req.setTimeout(timeoutMs, () => req.destroy(abortError()));

    const signal = init.signal;
    if (signal) {
      if (signal.aborted) {
        req.destroy(abortError());
      } else {
        signal.addEventListener("abort", () => req.destroy(abortError()), { once: true });
      }
    }

    req.on("error", once((err) => reject(err)));
    req.on("response", (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("error", once((err) => reject(err)));
      res.on("end", once(() => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value !== undefined) headers.append(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve(
          new Response(Buffer.concat(chunks), {
            status: res.statusCode ?? 502,
            statusText: res.statusMessage,
            headers,
          })
        );
      }));
    });

    if (body != null) req.write(body);
    req.end();
  });
}

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractLocalError(payload: unknown): { code?: unknown; message?: unknown } {
  const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  return { code: obj.code, message: obj.error ?? obj.message };
}

function mapLocalServiceError(status: number, payload: unknown): ThreeDProviderError {
  const { code, message } = extractLocalError(payload);
  const msg = typeof message === "string" && message.trim() ? message.trim() : "";

  switch (code) {
    case "INVALID_IMAGE_TYPE":
    case "IMAGE_TOO_LARGE":
    case "EMPTY_IMAGE":
      return new ThreeDProviderError(
        "INVALID_IMAGES",
        400,
        msg || "The Hunyuan3D service rejected the uploaded image."
      );
    case "DEPENDENCIES_MISSING":
      return new ThreeDProviderError(
        "DEPENDENCIES_MISSING",
        503,
        msg ||
          "Hunyuan3D Python dependencies are missing. Follow the hunyuan3d-service README to install them."
      );
    case "GPU_UNAVAILABLE":
      return new ThreeDProviderError(
        "GPU_UNAVAILABLE",
        503,
        msg ||
          "CUDA/GPU acceleration is not available for this machine. Set HUNYUAN3D_DEVICE=cpu in the hunyuan3d-service, or use a machine with a suitable NVIDIA GPU."
      );
    case "SERVICE_BUSY":
      return new ThreeDProviderError(
        "PROVIDER_UNAVAILABLE",
        429,
        msg || "Another 3D model is currently being generated on this machine. Please wait and retry."
      );
    case "MODEL_NOT_RETURNED":
      return new ThreeDProviderError(
        "MODEL_NOT_RETURNED",
        502,
        msg || "The Hunyuan3D service completed without returning a model."
      );
    case "GENERATION_FAILED":
      return new ThreeDProviderError("GENERATION_FAILED", 502, msg);
    default:
      break;
  }

  if (status >= 500) {
    return new ThreeDProviderError(
      "GENERATION_FAILED",
      502,
      msg || `The Hunyuan3D service is unavailable (HTTP ${status}).`
    );
  }
  return new ThreeDProviderError(
    "GENERATION_FAILED",
    502,
    msg || `The Hunyuan3D service returned HTTP ${status}.`
  );
}

function dataUriParts(dataUri: string): { mime: string; buffer: Buffer } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUri);
  if (!match) {
    throw new ThreeDProviderError(
      "INVALID_IMAGES",
      400,
      "A prepared product image did not match the expected encoded format."
    );
  }
  return { mime: match[1] || "image/jpeg", buffer: Buffer.from(match[2], "base64") };
}

async function fileToDataUri(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const encoded = await sharp(buffer)
      .rotate()
      .resize({
        width: NORMALIZED_MAX_EDGE,
        height: NORMALIZED_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: NORMALIZED_JPEG_QUALITY })
      .toBuffer();
    return `data:image/jpeg;base64,${encoded.toString("base64")}`;
  } catch {
    const mime = (file.type || "").toLowerCase();
    if (mime === "image/jpeg" || mime === "image/png") {
      return `data:${mime};base64,${buffer.toString("base64")}`;
    }
    throw new ThreeDProviderError(
      "INVALID_IMAGES",
      400,
      `"${file.name || "image"}" could not be converted to a format the Hunyuan3D service accepts (JPG or PNG).`
    );
  }
}

export async function normalizeProductImages(files: File[], angles: string[]): Promise<NormalizedView[]> {
  const entries = files.map((file, index) => ({
    file,
    angle: (angles[index] ?? "").toLowerCase().trim(),
  }));

  const sorted = [...entries].sort((a, b) => {
    const ai = ANGLE_PRIORITY.indexOf(a.angle);
    const bi = ANGLE_PRIORITY.indexOf(b.angle);
    const av = ai === -1 ? ANGLE_PRIORITY.length : ai;
    const bv = bi === -1 ? ANGLE_PRIORITY.length : bi;
    return av - bv;
  });

  const selected = sorted.slice(0, 1);
  const views: NormalizedView[] = [];
  for (const entry of selected) {
    views.push({ angle: entry.angle, dataUri: await fileToDataUri(entry.file) });
  }
  return views;
}

/**
 * Pick the single image sent to the local Hunyuan3D service.
 * The angle priority places "front" first; otherwise the first upload is used.
 */
export function pickPrimaryView(views: NormalizedView[]): NormalizedView {
  const view = views.find((v) => v.angle === "front") ?? views[0];
  if (!view) {
    throw new ThreeDProviderError(
      "INVALID_IMAGES",
      400,
      "A product image is required for Hunyuan3D generation."
    );
  }
  return view;
}

async function saveGeneratedModel(taskId: string, bytes: Buffer): Promise<string> {
  const modelsDir = process.env.HUNYUAN3D_MODEL_OUTPUT_DIR
    ? process.env.HUNYUAN3D_MODEL_OUTPUT_DIR
    : path.join(process.cwd(), "public", "models");
  await fs.promises.mkdir(modelsDir, { recursive: true });
  const filename = `${taskId}.glb`;
  await fs.promises.writeFile(path.join(modelsDir, filename), bytes);
  return `/models/${filename}`;
}

async function simulateProgress(task: LocalTask): Promise<() => void> {
  const timer = setInterval(() => {
    if (task.status === "generating" && task.progress < 65) {
      task.progress = Math.min(65, task.progress + 3);
    }
  }, 6_000);
  return () => clearInterval(timer);
}

async function runLocalGeneration(
  config: ThreeDConfig,
  primary: NormalizedView,
  productName: string,
  task: LocalTask
): Promise<void> {
  const { buffer, mime } = dataUriParts(primary.dataUri);
  task.status = "preparing";
  task.progress = 8;

  const form = new FormData();
  form.append(
    "image",
    new Blob([new Uint8Array(buffer)], { type: mime }),
    "product.jpg"
  );
  form.append("productName", productName.slice(0, 80));
  form.append("name", productName.slice(0, 80));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const stopProgress = await simulateProgress(task);

  try {
    task.status = "generating";
    task.progress = 15;

    let res: Response;
    try {
      res = await fetchWithTimeout(`${config.baseUrl}/generate`, {
        method: "POST",
        body: form,
      }, config.timeoutMs);
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      if (aborted) {
        throw new ThreeDProviderError(
          "TIMEOUT",
          504,
          "Timed out waiting for the Hunyuan3D service to generate the model."
        );
      }
      throw new ThreeDProviderError(
        "PROVIDER_UNREACHABLE",
        502,
        "Could not reach the local Hunyuan3D service. Is it running? Start it with " +
          "`.venv\\Scripts\\python.exe server.py` inside hunyuan3d-service (Terminal 1, or " +
          "run start_hunyuan3d.bat), then retry."
      );
    }

    const payload = await readJson(res);
    if (!res.ok) throw mapLocalServiceError(res.status, payload);

    if (!payload || payload.ok !== true) {
      throw new ThreeDProviderError(
        "INVALID_PROVIDER_RESPONSE",
        502,
        "The Hunyuan3D service returned an unexpected response."
      );
    }

    task.status = "processing";
    task.progress = 78;

    const modelUrl = typeof payload.modelUrl === "string" ? payload.modelUrl : "";
    if (!/^\/models\/.+\.glb$/i.test(modelUrl)) {
      throw new ThreeDProviderError(
        "MODEL_NOT_RETURNED",
        502,
        "The Hunyuan3D service did not return a GLB model."
      );
    }

    const absoluteModelUrl = new URL(modelUrl, config.baseUrl).toString();
    let glbRes: Response;
    try {
      glbRes = await fetchWithTimeout(absoluteModelUrl, { method: "GET" }, config.timeoutMs);
    } catch {
      throw new ThreeDProviderError(
        "MODEL_NOT_RETURNED",
        502,
        "The generated GLB could not be downloaded from the Hunyuan3D service."
      );
    }
    if (!glbRes.ok) {
      throw new ThreeDProviderError(
        "MODEL_NOT_RETURNED",
        502,
        `The Hunyuan3D service could not return the model file (HTTP ${glbRes.status}).`
      );
    }

    const bytes = Buffer.from(await glbRes.arrayBuffer());
    if (bytes.length === 0) {
      throw new ThreeDProviderError("MODEL_NOT_RETURNED", 502, "The generated GLB file is empty.");
    }

    task.modelUrl = await saveGeneratedModel(task.id, bytes);
    task.progress = 100;
    task.status = "succeeded";
  } catch (error) {
    task.status = "failed";
    if (error instanceof ThreeDProviderError) {
      task.error = { code: error.code, message: error.message };
    } else {
      task.error = {
        code: "GENERATION_FAILED",
        message: "The local Hunyuan3D generation failed unexpectedly.",
      };
    }
  } finally {
    clearTimeout(timer);
    stopProgress();
  }
}

/**
 * Start a local Hunyuan3D generation in the background and return its task id.
 * The actual model work runs against the local HTTP service, so the browser
 * never touches a secret - there is no secret at all.
 */
export async function createLocalThreeDTask(
  config: ThreeDConfig,
  primary: NormalizedView,
  productName: string
): Promise<string> {
  const id = randomUUID();
  const task: LocalTask = { id, status: "preparing", progress: 0 };
  tasks.set(id, task);
  // Fire-and-forget background generation; the promise is kept alive for the
  // process lifetime. Errors are recorded on the task and surfaced via GET.
  void runLocalGeneration(config, primary, productName, task);
  return id;
}

export async function fetchLocalThreeDTask(taskId: string): Promise<ThreeDTaskSnapshot> {
  const task = tasks.get(taskId);
  if (!task || !taskId) {
    throw new ThreeDProviderError(
      "INVALID_REQUEST",
      400,
      "The generation task was not found (the server may have restarted). Please start a new generation."
    );
  }

  switch (task.status) {
    case "succeeded":
      return { status: "succeeded", progress: 100, modelUrl: task.modelUrl };
    case "failed":
      return {
        status: "failed",
        progress: task.progress,
        errorMessage: task.error?.message ?? "Hunyuan3D generation failed.",
        errorCode: task.error?.code,
      };
    case "preparing":
      return { status: "pending", progress: task.progress };
    case "generating":
    case "processing":
      return { status: "in_progress", progress: task.progress };
    default:
      return { status: "pending", progress: task.progress };
  }
}