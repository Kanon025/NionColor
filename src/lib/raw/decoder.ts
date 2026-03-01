// RAW image decoder using libraw-wasm
// Supports 1000+ camera formats: Sony ARW, Canon CR2/CR3, Nikon NEF, Fuji RAF, DNG, etc.
// Decoding runs in a Web Worker (built into libraw-wasm) to avoid blocking the UI.
//
// libraw-wasm files are served from /public/libraw/ to avoid bundler issues
// with WASM and Workers in Turbopack/webpack.

import type { LibRawMetadata } from "libraw-wasm";

// All RAW extensions supported by LibRaw
const RAW_EXTENSIONS = new Set([
  // Sony
  "arw", "srf", "sr2",
  // Canon
  "cr2", "cr3", "crw",
  // Nikon
  "nef", "nrw",
  // Fujifilm
  "raf",
  // Adobe
  "dng",
  // Olympus / OM System
  "orf",
  // Pentax / Ricoh
  "pef",
  // Panasonic
  "rw2",
  // Leica
  "rwl",
  // Samsung
  "srw",
  // Hasselblad
  "3fr", "fff",
  // Phase One
  "iiq",
  // Sigma
  "x3f",
  // Epson
  "erf",
  // Mamiya / Leaf
  "mef", "mos",
  // Kodak
  "dcr", "kdc",
  // Minolta
  "mrw",
  // GoPro
  "gpr",
]);

// MIME types that browsers might assign to RAW files
const RAW_MIME_TYPES = new Set([
  "image/x-sony-arw",
  "image/x-canon-cr2",
  "image/x-canon-cr3",
  "image/x-nikon-nef",
  "image/x-fuji-raf",
  "image/x-adobe-dng",
  "image/x-olympus-orf",
  "image/x-pentax-pef",
  "image/x-panasonic-rw2",
  "image/x-samsung-srw",
  "image/x-dcraw",
]);

export function isRawFile(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (RAW_EXTENSIONS.has(ext)) return true;
  if (RAW_MIME_TYPES.has(file.type)) return true;
  return false;
}

export function getRawExtensions(): string[] {
  return Array.from(RAW_EXTENSIONS);
}

export interface DecodedRawImage {
  imageBitmap: ImageBitmap;
  width: number;
  height: number;
  metadata: LibRawMetadata;
}

// libraw-wasm imageData() returns either a Uint8Array directly or
// an object { width, height, data } depending on the version/build.
// We normalize this in extractPixelData().
interface LibRawImageResult {
  width?: number;
  height?: number;
  data?: Uint8Array | Uint8ClampedArray | ArrayBuffer;
}

// LibRaw interface matching the runtime module loaded from /libraw/index.js
interface LibRawInstance {
  open(data: Uint8Array, settings?: Record<string, unknown>): Promise<void>;
  metadata(fullOutput?: boolean): Promise<LibRawMetadata>;
  imageData(): Promise<Uint8Array | LibRawImageResult>;
}

interface LibRawModule {
  default: new () => LibRawInstance;
}

// Lazy-loaded LibRaw instance (singleton)
let librawInstance: LibRawInstance | null = null;

async function getLibRaw(): Promise<LibRawInstance> {
  if (librawInstance) return librawInstance;

  // Load libraw-wasm from public/ via dynamic import to bypass bundler processing.
  // The module uses import.meta.url internally to resolve its Worker and WASM files,
  // so serving from the same origin ensures proper resolution.
  // Use a variable to prevent TypeScript/bundler from resolving statically.
  const librawUrl = "/libraw/index.js";
  const mod = await (import(/* webpackIgnore: true */ librawUrl) as Promise<LibRawModule>);

  librawInstance = new mod.default();
  return librawInstance;
}

/**
 * Extract a Uint8Array of pixel data from whatever imageData() returns.
 * Handles: Uint8Array, ArrayBuffer, { data: Uint8Array|ArrayBuffer }, etc.
 */
function extractPixelData(result: Uint8Array | LibRawImageResult): Uint8Array {
  // Already a typed array with indexed access
  if (result instanceof Uint8Array) return result;
  if (result instanceof Uint8ClampedArray) return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);

  // Object with .data property (e.g. { width, height, data })
  if (typeof result === "object" && result !== null) {
    const obj = result as LibRawImageResult;

    if (obj.data) {
      if (obj.data instanceof Uint8Array) return obj.data;
      if (obj.data instanceof Uint8ClampedArray) return new Uint8Array(obj.data.buffer, obj.data.byteOffset, obj.data.byteLength);
      if (obj.data instanceof ArrayBuffer) return new Uint8Array(obj.data);
    }

    // Some builds return the raw ArrayBuffer at the top level
    if (result instanceof ArrayBuffer) return new Uint8Array(result);

    // Last resort: check if it's array-like (has numeric indices and length)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResult = result as any;
    if (typeof anyResult.length === "number" && anyResult.length > 0) {
      // Copy numeric-indexed data into a proper Uint8Array
      const arr = new Uint8Array(anyResult.length);
      for (let i = 0; i < anyResult.length; i++) {
        arr[i] = anyResult[i];
      }
      return arr;
    }
  }

  throw new Error(`Cannot extract pixel data from imageData() result: ${typeof result}`);
}

export async function decodeRawFile(
  file: File,
  options?: { halfSize?: boolean }
): Promise<DecodedRawImage> {
  const raw = await getLibRaw();

  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  const settings = {
    useCameraWb: true,
    outputColor: 1,       // sRGB
    outputBps: 8,          // 8-bit per channel
    noAutoBright: true,    // we control brightness in our pipeline
    userQual: 3,           // AHD interpolation (good quality)
    halfSize: options?.halfSize ?? false,
    highlight: 0,          // clip highlights
    useCameraMatrix: 1,
  };

  await raw.open(data, settings);

  const metadata = await raw.metadata();
  const rawResult = await raw.imageData();

  // Normalize the result: imageData() may return a Uint8Array directly
  // or an object { width, height, data } depending on the libraw-wasm version.
  const pixels = extractPixelData(rawResult);

  // Use dimensions from metadata (authoritative)
  const width = metadata.width;
  const height = metadata.height;
  const pixelCount = width * height;
  const expectedRGB = pixelCount * 3;
  const expectedRGBA = pixelCount * 4;

  // Determine if pixels are RGB (3ch) or RGBA (4ch)
  let imageBitmap: ImageBitmap;

  if (pixels.length === expectedRGBA) {
    // Already RGBA — use directly
    const clamped = new Uint8ClampedArray(pixels.length);
    clamped.set(pixels);
    const imageData = new ImageData(clamped, width, height);
    imageBitmap = await createImageBitmap(imageData);
  } else if (pixels.length === expectedRGB) {
    // RGB → RGBA conversion
    const rgba = new Uint8ClampedArray(expectedRGBA);
    for (let i = 0; i < pixelCount; i++) {
      rgba[i * 4] = pixels[i * 3];         // R
      rgba[i * 4 + 1] = pixels[i * 3 + 1]; // G
      rgba[i * 4 + 2] = pixels[i * 3 + 2]; // B
      rgba[i * 4 + 3] = 255;                // A
    }
    const imageData = new ImageData(rgba, width, height);
    imageBitmap = await createImageBitmap(imageData);
  } else {
    throw new Error(
      `Unexpected pixel data size: ${pixels.length} bytes for ${width}x${height} image (expected ${expectedRGB} RGB or ${expectedRGBA} RGBA)`
    );
  }

  return {
    imageBitmap,
    width,
    height,
    metadata,
  };
}
