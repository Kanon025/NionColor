// Exposure fragment shader
// Applies exposure adjustment by multiplying by 2^stops

export const EXPOSURE_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uExposure; // -5 to 5 (stops)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Apply exposure: multiply by 2^stops
  float multiplier = exp2(uExposure);
  color *= multiplier;

  // Clamp to prevent overflow (HDR pipeline keeps high values in RGBA16F)
  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
