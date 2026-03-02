// Vibrance & Saturation fragment shader
// Saturation: uniform boost/cut by lerping between gray and original color
// Vibrance: intelligent saturation that boosts less-saturated colors more,
// leaving already-vibrant colors relatively untouched

export const VIBRANCE_SATURATION_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uVibrance;   // -1.0 to 1.0 (mapped from -100..100)
uniform float uSaturation; // -1.0 to 1.0 (mapped from -100..100)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Compute luminance (Rec. 709)
  float lum = dot(color, vec3(0.2126, 0.7152, 0.0722));
  vec3 gray = vec3(lum);

  // --- Saturation ---
  // Simple lerp between gray (desaturated) and original color
  // satFactor > 1 increases saturation, < 1 decreases, 0 = grayscale
  if (abs(uSaturation) > 0.001) {
    float satFactor = 1.0 + uSaturation;
    color = mix(gray, color, satFactor);
  }

  // --- Vibrance ---
  // Like saturation, but the amount is modulated by the inverse of
  // the pixel's current saturation. Less-saturated pixels get a bigger boost.
  if (abs(uVibrance) > 0.001) {
    // Estimate current saturation as the distance from gray
    float maxC = max(color.r, max(color.g, color.b));
    float minC = min(color.r, min(color.g, color.b));
    float currentSat = (maxC > 0.001) ? (maxC - minC) / maxC : 0.0;

    // Inverse saturation: low-saturation pixels get more boost
    float vibAmount = uVibrance * (1.0 - currentSat);

    // Apply vibrance as a saturation adjustment weighted by inverse saturation
    float vibFactor = 1.0 + vibAmount;

    // Recompute luminance after saturation adjustment
    float lumAfterSat = dot(color, vec3(0.2126, 0.7152, 0.0722));
    vec3 grayAfterSat = vec3(lumAfterSat);

    color = mix(grayAfterSat, color, vibFactor);
  }

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
