// HSL (Hue/Saturation/Luminance) fragment shader
// Per-channel color control across 8 color bands with smooth interpolation

export const HSL_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;

// 8 color channels × 3 parameters = 24 uniforms
// Hue uniforms: value / 360.0 (normalized turns)
// Saturation uniforms: value / 100.0 (normalized multiplier)
// Luminance uniforms: value / 100.0 (normalized shift)

uniform float uHslRedHue;
uniform float uHslRedSat;
uniform float uHslRedLum;

uniform float uHslOrangeHue;
uniform float uHslOrangeSat;
uniform float uHslOrangeLum;

uniform float uHslYellowHue;
uniform float uHslYellowSat;
uniform float uHslYellowLum;

uniform float uHslGreenHue;
uniform float uHslGreenSat;
uniform float uHslGreenLum;

uniform float uHslAquaHue;
uniform float uHslAquaSat;
uniform float uHslAquaLum;

uniform float uHslBlueHue;
uniform float uHslBlueSat;
uniform float uHslBlueLum;

uniform float uHslPurpleHue;
uniform float uHslPurpleSat;
uniform float uHslPurpleLum;

uniform float uHslMagentaHue;
uniform float uHslMagentaSat;
uniform float uHslMagentaLum;

// --- RGB <-> HSL conversion functions ---

vec3 rgbToHsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float delta = maxC - minC;

  float h = 0.0;
  float s = 0.0;
  float l = (maxC + minC) * 0.5;

  if (delta > 0.00001) {
    s = (l < 0.5) ? (delta / (maxC + minC)) : (delta / (2.0 - maxC - minC));

    if (maxC == c.r) {
      h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
      h = (c.b - c.r) / delta + 2.0;
    } else {
      h = (c.r - c.g) / delta + 4.0;
    }
    h /= 6.0; // normalize to 0-1
  }

  return vec3(h, s, l);
}

float hueToRgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0 / 2.0) return q;
  if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
  return p;
}

vec3 hslToRgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;

  if (s < 0.00001) {
    return vec3(l);
  }

  float q = (l < 0.5) ? (l * (1.0 + s)) : (l + s - l * s);
  float p = 2.0 * l - q;

  float r = hueToRgb(p, q, h + 1.0 / 3.0);
  float g = hueToRgb(p, q, h);
  float b = hueToRgb(p, q, h - 1.0 / 3.0);

  return vec3(r, g, b);
}

// --- Band weight calculation ---
// Each band has a center hue and covers ~45 degrees with smooth falloff.
// Returns weight 0-1 for how much a pixel's hue belongs to this band.

float bandWeight(float hue, float center) {
  // hue and center are in 0-1 range (representing 0-360 degrees)
  // Compute shortest angular distance on the hue circle
  float dist = abs(hue - center);
  dist = min(dist, 1.0 - dist); // wrap around

  // Band half-width: 45 degrees = 0.125 in normalized hue
  float halfWidth = 0.125;

  // Smooth interpolation: full weight at center, zero at halfWidth
  return 1.0 - smoothstep(0.0, halfWidth, dist);
}

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  vec3 hsl = rgbToHsl(color);
  float hue = hsl.x; // 0-1

  // Band centers in normalized hue (degrees / 360):
  // Red=0/360, Orange=30, Yellow=60, Green=120, Aqua=180, Blue=240, Purple=280, Magenta=320
  float wRed     = bandWeight(hue, 0.0 / 360.0);     // 0.0
  float wOrange  = bandWeight(hue, 30.0 / 360.0);    // 0.0833
  float wYellow  = bandWeight(hue, 60.0 / 360.0);    // 0.1667
  float wGreen   = bandWeight(hue, 120.0 / 360.0);   // 0.3333
  float wAqua    = bandWeight(hue, 180.0 / 360.0);   // 0.5
  float wBlue    = bandWeight(hue, 240.0 / 360.0);   // 0.6667
  float wPurple  = bandWeight(hue, 280.0 / 360.0);   // 0.7778
  float wMagenta = bandWeight(hue, 320.0 / 360.0);   // 0.8889

  // Compute weighted hue shift, saturation multiplier, and luminance shift
  float hueShift = 0.0;
  float satMult  = 0.0;
  float lumShift = 0.0;
  float totalWeight = 0.0;

  hueShift += wRed     * uHslRedHue;
  hueShift += wOrange  * uHslOrangeHue;
  hueShift += wYellow  * uHslYellowHue;
  hueShift += wGreen   * uHslGreenHue;
  hueShift += wAqua    * uHslAquaHue;
  hueShift += wBlue    * uHslBlueHue;
  hueShift += wPurple  * uHslPurpleHue;
  hueShift += wMagenta * uHslMagentaHue;

  satMult += wRed     * uHslRedSat;
  satMult += wOrange  * uHslOrangeSat;
  satMult += wYellow  * uHslYellowSat;
  satMult += wGreen   * uHslGreenSat;
  satMult += wAqua    * uHslAquaSat;
  satMult += wBlue    * uHslBlueSat;
  satMult += wPurple  * uHslPurpleSat;
  satMult += wMagenta * uHslMagentaSat;

  lumShift += wRed     * uHslRedLum;
  lumShift += wOrange  * uHslOrangeLum;
  lumShift += wYellow  * uHslYellowLum;
  lumShift += wGreen   * uHslGreenLum;
  lumShift += wAqua    * uHslAquaLum;
  lumShift += wBlue    * uHslBlueLum;
  lumShift += wPurple  * uHslPurpleLum;
  lumShift += wMagenta * uHslMagentaLum;

  totalWeight = wRed + wOrange + wYellow + wGreen + wAqua + wBlue + wPurple + wMagenta;

  // Normalize by total weight to prevent over-application in overlap zones
  if (totalWeight > 0.001) {
    hueShift /= totalWeight;
    satMult  /= totalWeight;
    lumShift /= totalWeight;
  }

  // Apply hue shift (hueShift is already normalized: value/360)
  hsl.x = fract(hsl.x + hueShift);

  // Apply saturation multiplier: satMult is value/100, so +1.0 means no change at 0
  hsl.y = clamp(hsl.y * (1.0 + satMult), 0.0, 1.0);

  // Apply luminance shift (lumShift is value/100)
  hsl.z = clamp(hsl.z + lumShift, 0.0, 1.0);

  color = hslToRgb(hsl);
  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
