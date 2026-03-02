// Clarity fragment shader
// Enhances local contrast via a simplified unsharp mask on luminance
// Samples a 5x5 box blur of luminance, computes the difference from
// the original, and adds the scaled difference back to luminance only

export const CLARITY_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uClarity;    // -1.0 to 1.0 (mapped from -100..100)
uniform vec2 uTexelSize;   // vec2(1.0/width, 1.0/height)

// Compute luminance (Rec. 709)
float getLuminance(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  if (abs(uClarity) < 0.001) {
    fragColor = vec4(color, texel.a);
    return;
  }

  float originalLum = getLuminance(color);

  // 5x5 box blur of luminance for local average
  float blurredLum = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 offset = vec2(float(x), float(y)) * uTexelSize;
      vec3 sample_ = texture(uTexture, vUV + offset).rgb;
      blurredLum += getLuminance(sample_);
    }
  }
  blurredLum /= 25.0;

  // Local contrast = difference between original and blurred luminance
  float detail = originalLum - blurredLum;

  // Scale the local contrast enhancement
  // Use a moderate strength multiplier for natural results
  float enhancedLum = originalLum + detail * uClarity * 1.5;
  enhancedLum = clamp(enhancedLum, 0.0, 1.0);

  // Apply luminance shift while preserving color ratios
  // Avoid division by zero when luminance is near zero
  if (originalLum > 0.001) {
    float lumRatio = enhancedLum / originalLum;
    color *= lumRatio;
  } else {
    color += enhancedLum;
  }

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
