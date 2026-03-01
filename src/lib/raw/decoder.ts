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

// LibRaw interface matching the runtime module loaded from /libraw/index.js
interface LibRawInstance {
  open(data: Uint8Array, settings?: Record<string, unknown>): Promise<void>;
  metadata(fullOutput?: boolean): Promise<LibRawMetadata>;
  imageData(): Promise<Uint8Array>;
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
  const rgbPixels = await raw.imageData();

  // Convert RGB (3 channels) to RGBA (4 channels) for ImageData
  const width = metadata.width;
  const height = metadata.height;
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    rgba[i * 4] = rgbPixels[i * 3];         // R
    rgba[i * 4 + 1] = rgbPixels[i * 3 + 1]; // G
    rgba[i * 4 + 2] = rgbPixels[i * 3 + 2]; // B
    rgba[i * 4 + 3] = 255;                    // A
  }

  const imageData = new ImageData(rgba, width, height);
  const imageBitmap = await createImageBitmap(imageData);

  return {
    imageBitmap,
    width,
    height,
    metadata,
  };
}
