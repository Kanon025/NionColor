// Whites & Blacks fragment shader
// Adjusts the extreme ends of the tonal range using power curves
// Whites pushes the top of the range (like adjusting the white point in levels)
// Blacks pushes the bottom of the range (like adjusting the black point in levels)

export const WHITES_BLACKS_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uWhites; // -1.0 to 1.0 (mapped from -100..100)
uniform float uBlacks; // -1.0 to 1.0 (mapped from -100..100)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // --- Whites adjustment ---
  // Affects primarily the upper tonal range using a power curve
  // Positive whites: lifts bright values toward 1.0
  // Negative whites: pulls bright values downward
  if (abs(uWhites) > 0.001) {
    // Power curve exponent: < 1 lifts (positive), > 1 compresses (negative)
    float whitePower = 1.0 - uWhites * 0.5;
    whitePower = max(whitePower, 0.1);
    // Apply power curve — this naturally affects brighter values more
    color = pow(color, vec3(whitePower));
  }

  // --- Blacks adjustment ---
  // Affects primarily the lower tonal range
  // Positive blacks: lifts shadow detail (lighter blacks)
  // Negative blacks: crushes shadow detail (deeper blacks)
  if (abs(uBlacks) > 0.001) {
    // Use an inverted power curve operating on the dark end
    // Invert, apply power, invert back — targets dark tones
    float blackPower = 1.0 + uBlacks * 0.5;
    blackPower = max(blackPower, 0.1);
    color = 1.0 - pow(1.0 - color, vec3(blackPower));
  }

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
