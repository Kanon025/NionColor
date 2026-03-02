// Highlights & Shadows fragment shader
// Selectively adjusts brightness in bright (highlights) and dark (shadows) regions
// Uses luminance-based masking with smooth blending around the midpoint

export const HIGHLIGHTS_SHADOWS_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uHighlights; // -1.0 to 1.0 (mapped from -100..100)
uniform float uShadows;    // -1.0 to 1.0 (mapped from -100..100)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Compute luminance (Rec. 709)
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Smooth masks for highlights and shadows regions
  // smoothstep provides gentle blending around the 0.5 midpoint
  float highlightMask = smoothstep(0.25, 0.75, lum);  // 1.0 in bright areas
  float shadowMask = 1.0 - smoothstep(0.25, 0.75, lum); // 1.0 in dark areas

  // Scale adjustment by how far the pixel is from the midpoint
  // Highlights: brighter pixels get more adjustment
  float highlightWeight = highlightMask * lum;
  // Shadows: darker pixels get more adjustment
  float shadowWeight = shadowMask * (1.0 - lum);

  // Compute total brightness adjustment
  float adjustment = uHighlights * highlightWeight + uShadows * shadowWeight;

  // Apply adjustment to all channels equally to preserve color
  color += adjustment;

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
