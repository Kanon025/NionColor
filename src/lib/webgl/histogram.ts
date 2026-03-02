// Histogram computation utility
// Reads pixel data from the WebGL canvas and computes per-channel histograms

export interface HistogramData {
  luminance: Uint32Array; // 256 bins
  red: Uint32Array;       // 256 bins
  green: Uint32Array;     // 256 bins
  blue: Uint32Array;      // 256 bins
}

/**
 * Compute histogram data from the current WebGL canvas.
 * Must be called after render with preserveDrawingBuffer: true.
 *
 * For performance, we downsample: read at most a 512-wide region
 * from the center of the canvas, which gives statistically representative data
 * without reading millions of pixels.
 */
export function computeHistogram(
  gl: WebGL2RenderingContext,
  canvasWidth: number,
  canvasHeight: number
): HistogramData {
  const luminance = new Uint32Array(256);
  const red = new Uint32Array(256);
  const green = new Uint32Array(256);
  const blue = new Uint32Array(256);

  // Downsample: cap the read region to ~512px wide for performance
  const maxDim = 512;
  const scale = Math.min(1, maxDim / Math.max(canvasWidth, canvasHeight));
  const sw = Math.max(1, Math.floor(canvasWidth * scale));
  const sh = Math.max(1, Math.floor(canvasHeight * scale));

  // Read from the default framebuffer (the canvas)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // If we're downsampling, read from a centered subregion of the canvas
  // gl.readPixels reads from the current viewport; with null framebuffer,
  // it reads from the canvas at actual pixel coordinates
  const x0 = Math.floor((canvasWidth - sw) / 2);
  const y0 = Math.floor((canvasHeight - sh) / 2);

  const pixels = new Uint8Array(sw * sh * 4);
  gl.readPixels(x0, y0, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  // Accumulate bins
  const len = sw * sh * 4;
  for (let i = 0; i < len; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];

    red[r]++;
    green[g]++;
    blue[b]++;

    // Rec.709 luminance
    const lum = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    luminance[Math.min(255, lum)]++;
  }

  return { luminance, red, green, blue };
}
