// Contrast fragment shader
// Applies S-curve contrast centered on midtones

export const CONTRAST_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uContrast; // -100 to 100

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Normalize contrast to a usable range
  // At 0 contrast, factor = 1.0 (no change)
  // Positive values increase contrast, negative decrease
  float c = uContrast / 100.0;

  // S-curve using sigmoid-like function centered at 0.5
  // For each channel, shift to center, apply power curve, shift back
  if (abs(c) > 0.001) {
    // Use a smooth S-curve approach
    // Map contrast to a tangent-based factor for smooth response
    float factor = 1.0 + c;
    factor = max(factor, 0.01);

    // Apply contrast as sigmoid S-curve around midpoint (0.5)
    color = color - 0.5;
    color = sign(color) * pow(abs(color) * 2.0, vec3(1.0 / factor)) * 0.5;
    color = color + 0.5;
  }

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
