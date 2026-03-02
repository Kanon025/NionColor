// Film grain fragment shader
// Adds photographic film grain with size control and luminance-dependent intensity

export const GRAIN_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uGrain;     // 0-100 -> 0.0-1.0 (grain amount)
uniform float uGrainSize; // 0-100 -> 0.0-1.0 (grain size: higher = larger grain)
uniform float uSeed;      // random float per frame (or fixed) for animation/variation

// Hash-based pseudo-random noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Early exit if no grain
  if (uGrain < 0.001) {
    fragColor = vec4(color, texel.a);
    return;
  }

  // Scale UV by grain size: larger uGrainSize = larger grain = lower frequency noise
  // Map uGrainSize 0-1 to a frequency scale: 0 = very fine (high freq), 1 = very coarse (low freq)
  // Use inverse relationship: small grainSize -> high scale factor, large grainSize -> low scale factor
  float frequency = mix(800.0, 100.0, uGrainSize);
  vec2 scaledUV = vUV * frequency;

  // Generate noise using hash function with seed for variation
  float noise = hash(scaledUV + vec2(uSeed));

  // Add a second octave for more natural-looking grain (subtler)
  noise = mix(noise, hash(scaledUV * 2.17 + vec2(uSeed * 1.37)), 0.3);

  // Compute luminance for luminance-dependent grain
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));

  // Bell curve around midtones: more grain in midtones, less in shadows/highlights
  // Peaks at luminance = 0.5, falls off toward 0 and 1
  float midtoneWeight = 1.0 - 2.0 * abs(luminance - 0.5);
  midtoneWeight = midtoneWeight * midtoneWeight; // sharpen the bell curve
  // Ensure some grain even in shadows/highlights (minimum 20%)
  midtoneWeight = mix(0.2, 1.0, midtoneWeight);

  // Apply grain: noise centered at 0 (subtract 0.5), scaled by amount and midtone weight
  color += (noise - 0.5) * uGrain * midtoneWeight;

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
