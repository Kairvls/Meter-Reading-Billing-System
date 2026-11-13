/** Compress an image file to a JPEG data URL for storing on the record. */

const MAX_EDGE = 1280;
const QUALITY = 0.72;

export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPG, PNG, etc.).");
  }
  if (file.size > 12 * 1024 * 1024) {
    throw new Error("Image is too large (max 12 MB).");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Unable to process image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (dataUrl.length > 900_000) {
    throw new Error("Image is still too large after compression. Try another photo.");
  }
  return dataUrl;
}

export function formatCoordinate(value: string, kind: "lat" | "long") {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const num = Number(trimmed.replace(/°/g, ""));
  if (!Number.isFinite(num)) return trimmed;
  const label = kind === "lat" ? "Lat" : "Long";
  return `${label} ${num.toFixed(6)}°`;
}
