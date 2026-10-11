export const COVER_MAX_BYTES = 4_000_000;

export const PRODUCT_IMAGE_MAX_BYTES = 10_000_000;

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

export const ACCEPTED_IMAGE_MIME_LIST = ACCEPTED_IMAGE_TYPES.split(",");

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function sniffFile(file: File): Promise<string | null> {
  try {
    const buf = await file.slice(0, 16).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex.startsWith("ffd8ff")) return "image/jpeg";
    if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
    if (hex.startsWith("52494646") && hex.slice(8, 16) === "57454250") return "image/webp";
    if (hex.startsWith("25504446")) return "application/pdf";
    if (hex.slice(8, 16) === "66747970") {
      const brand = hex.slice(16, 24);
      if (/^(68656963|68656978|68657663|68657678|6d696631|6d736631|6865696d)$/.test(brand)) {
        return "image/heic";
      }
      if (brand === "61766966") return "image/avif";
    }
    return null;
  } catch {
    return null;
  }
}

export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}