// Color Grading fragment shader
// Split-toning with shadow/midtone/highlight color wheels

export const COLOR_GRADING_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;

// Shadow color wheel: hue (0-360 -> 0-1), saturation (0-100 -> 0-1), luminance (-100..100 -> -1..1)
uniform float uCgShadowHue;
uniform float uCgShadowSat;
uniform float uCgShadowLum;

// Midtone color wheel
uniform float uCgMidtoneHue;
uniform float uCgMidtoneSat;
uniform float uCgMidtoneLum;

// Highlight color wheel
uniform float uCgHighlightHue;
uniform float uCgHighlightSat;
uniform float uCgHighlightLum;

// Convert hue + saturation to an RGB tint color
vec3 hueToRgb(float h) {
  // h is 0-1 representing 0-360 degrees
  float r = abs(h * 6.0 - 3.0) - 1.0;
  float g = 2.0 - abs(h * 6.0 - 2.0);
  float b = 2.0 - abs(h * 6.0 - 4.0);
  return clamp(vec3(r, g, b), 0.0, 1.0);
}

vec3 hueSatToTint(float hue, float sat) {
  vec3 tintColor = hueToRgb(hue);
  // Blend from neutral gray (0.5) toward the tint color by saturation amount
  return mix(vec3(0.5), tintColor, sat);
}

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Compute perceptual luminance
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Compute region weights with smooth transitions
  // Shadow: strongest at dark values, fades out by midtones
  float shadowWeight = 1.0 - smoothstep(0.0, 0.5, luminance);

  // Highlight: strongest at bright values, fades in from midtones
  float highlightWeight = smoothstep(0.5, 1.0, luminance);

  // Midtone: bell curve peaking at 0.5 luminance
  // Use overlapping definition so midtones fill the gap
  float midtoneWeight = 1.0 - shadowWeight - highlightWeight;
  midtoneWeight = max(midtoneWeight, 0.0);

  // Compute tint colors from hue + saturation for each region
  vec3 shadowTint    = hueSatToTint(uCgShadowHue, uCgShadowSat);
  vec3 midtoneTint   = hueSatToTint(uCgMidtoneHue, uCgMidtoneSat);
  vec3 highlightTint = hueSatToTint(uCgHighlightHue, uCgHighlightSat);

  // Blend tint with original color using "soft light" style blending
  // For each region: lerp between original and tinted version based on weight

  // Shadow tinting: multiply-blend in dark regions
  vec3 shadowBlend = color * shadowTint * 2.0; // multiply blend (2x to normalize from 0.5 base)
  color = mix(color, shadowBlend, shadowWeight * uCgShadowSat);

  // Midtone tinting: overlay-style blend in midtones
  vec3 midtoneBlend = color * midtoneTint * 2.0;
  color = mix(color, midtoneBlend, midtoneWeight * uCgMidtoneSat);

  // Highlight tinting: screen-blend in bright regions
  vec3 highlightBlend = 1.0 - (1.0 - color) * (1.0 - (highlightTint - 0.5) * 2.0 * uCgHighlightSat);
  color = mix(color, highlightBlend, highlightWeight * uCgHighlightSat);

  // Apply luminance shifts per region
  color += uCgShadowLum * shadowWeight;
  color += uCgMidtoneLum * midtoneWeight;
  color += uCgHighlightLum * highlightWeight;

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
