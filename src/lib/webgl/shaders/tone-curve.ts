// Tone Curve fragment shader
// Applies RGB master and per-channel curves via a 256x1 RGBA LUT texture
// LUT layout: R = master curve, G = red curve, B = green curve, A = blue curve
// Each channel maps input value (0-255) to output value (0-255)

export const TONE_CURVE_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform sampler2D uLut; // 256x1 RGBA LUT texture

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Clamp input to valid range
  color = clamp(color, 0.0, 1.0);

  // Sample the LUT using the pixel's channel values as x coordinate
  // Offset by half-texel for accurate center sampling in the 256-wide texture
  float halfTexel = 0.5 / 256.0;

  // Step 1: Apply master curve (stored in R channel of LUT)
  // The master curve applies the same mapping to all three channels
  float masterR = texture(uLut, vec2(color.r * (255.0 / 256.0) + halfTexel, 0.5)).r;
  float masterG = texture(uLut, vec2(color.g * (255.0 / 256.0) + halfTexel, 0.5)).r;
  float masterB = texture(uLut, vec2(color.b * (255.0 / 256.0) + halfTexel, 0.5)).r;

  // Step 2: Apply per-channel curves on top of master curve result
  // Red curve is in G channel, Green curve in B channel, Blue curve in A channel
  float finalR = texture(uLut, vec2(masterR * (255.0 / 256.0) + halfTexel, 0.5)).g;
  float finalG = texture(uLut, vec2(masterG * (255.0 / 256.0) + halfTexel, 0.5)).b;
  float finalB = texture(uLut, vec2(masterB * (255.0 / 256.0) + halfTexel, 0.5)).a;

  fragColor = vec4(finalR, finalG, finalB, texel.a);
}
`;
