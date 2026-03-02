// LUT Generator for Tone Curve shader
// Generates a 256x1 RGBA lookup table from tone curve control points
// using Catmull-Rom spline interpolation
//
// LUT layout per entry (4 bytes):
//   R = master curve (applied to all RGB channels)
//   G = red channel curve
//   B = green channel curve
//   A = blue channel curve

import type { ToneCurveParams, ToneCurvePoint } from '../../types/edit-parameters';

/**
 * Catmull-Rom spline interpolation between control points.
 *
 * Given four sequential control points P0, P1, P2, P3 and a parameter t in [0,1],
 * returns the interpolated value between P1 and P2.
 *
 * Uses the standard Catmull-Rom matrix with tension tau = 0.5:
 *   q(t) = 0.5 * [(2*P1) +
 *                  (-P0 + P2) * t +
 *                  (2*P0 - 5*P1 + 4*P2 - P3) * t^2 +
 *                  (-P0 + 3*P1 - 3*P2 + P3) * t^3]
 */
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;

  return 0.5 * (
    2.0 * p1 +
    (-p0 + p2) * t +
    (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2 +
    (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
  );
}

/**
 * Evaluate a curve defined by control points at a given x position.
 *
 * Control points must be sorted by x and have x values in [0, 1].
 * Uses Catmull-Rom spline interpolation between points.
 * For segments at the boundary, virtual control points are created by
 * reflecting the adjacent internal point.
 *
 * @param points - Sorted array of {x, y} control points (at least 2 points)
 * @param x - Input value in [0, 1]
 * @returns Output value, clamped to [0, 1]
 */
function evaluateCurve(points: ToneCurvePoint[], x: number): number {
  // Edge cases: if x is outside the range of control points, clamp
  if (points.length < 2) {
    return x; // Identity if not enough points
  }

  // Clamp x to the range of control points
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  // Find the segment: points[i] <= x < points[i+1]
  let segIndex = 0;
  for (let i = 0; i < points.length - 1; i++) {
    if (x >= points[i].x && x <= points[i + 1].x) {
      segIndex = i;
      break;
    }
  }

  const p1 = points[segIndex];
  const p2 = points[segIndex + 1];

  // Get the four control points for Catmull-Rom
  // P0: point before the segment (or reflected virtual point)
  const p0 = segIndex > 0
    ? points[segIndex - 1]
    : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y };

  // P3: point after the segment (or reflected virtual point)
  const p3 = segIndex + 2 < points.length
    ? points[segIndex + 2]
    : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };

  // Compute local t parameter within this segment
  const segWidth = p2.x - p1.x;
  const t = segWidth > 0 ? (x - p1.x) / segWidth : 0;

  // Interpolate using Catmull-Rom
  const result = catmullRom(p0.y, p1.y, p2.y, p3.y, t);

  // Clamp to valid range
  return Math.max(0, Math.min(1, result));
}

/**
 * Sort control points by x coordinate and ensure valid endpoints.
 */
function preparePoints(points: ToneCurvePoint[]): ToneCurvePoint[] {
  if (points.length < 2) {
    // Return identity curve if insufficient points
    return [{ x: 0, y: 0 }, { x: 1, y: 1 }];
  }

  // Sort by x coordinate
  const sorted = [...points].sort((a, b) => a.x - b.x);

  return sorted;
}

/**
 * Generate a 256x1 RGBA LUT from tone curve parameters.
 *
 * The returned Uint8Array has 1024 bytes (256 entries x 4 channels):
 *   - R channel: master/RGB curve (applied to all channels)
 *   - G channel: red curve
 *   - B channel: green curve
 *   - A channel: blue curve
 *
 * @param params - Tone curve parameters with control points per channel
 * @returns Uint8Array of 1024 bytes
 */
export function generateLutData(params: ToneCurveParams): Uint8Array {
  const data = new Uint8Array(256 * 4);

  // Prepare sorted control points for each channel
  const masterPoints = preparePoints(params.rgb);
  const redPoints = preparePoints(params.red);
  const greenPoints = preparePoints(params.green);
  const bluePoints = preparePoints(params.blue);

  for (let i = 0; i < 256; i++) {
    const x = i / 255; // Normalize input to 0..1

    // Evaluate each curve at this input value
    const masterVal = evaluateCurve(masterPoints, x);
    const redVal = evaluateCurve(redPoints, x);
    const greenVal = evaluateCurve(greenPoints, x);
    const blueVal = evaluateCurve(bluePoints, x);

    // Write to the RGBA data (4 bytes per entry)
    const offset = i * 4;
    data[offset + 0] = Math.round(masterVal * 255); // R: master curve
    data[offset + 1] = Math.round(redVal * 255);    // G: red channel curve
    data[offset + 2] = Math.round(greenVal * 255);  // B: green channel curve
    data[offset + 3] = Math.round(blueVal * 255);   // A: blue channel curve
  }

  return data;
}
