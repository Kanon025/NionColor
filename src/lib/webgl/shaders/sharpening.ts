// Sharpening fragment shader
// Unsharp mask: enhances detail by amplifying high-frequency luminance differences

export const SHARPENING_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uSharpening; // 0-150 -> 0.0-1.5
uniform vec2 uTexelSize;   // vec2(1.0/width, 1.0/height)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Early exit if no sharpening
  if (uSharpening < 0.001) {
    fragColor = vec4(color, texel.a);
    return;
  }

  // Sample 3x3 neighborhood
  vec3 tl = texture(uTexture, vUV + vec2(-uTexelSize.x,  uTexelSize.y)).rgb;
  vec3 tc = texture(uTexture, vUV + vec2( 0.0,           uTexelSize.y)).rgb;
  vec3 tr = texture(uTexture, vUV + vec2( uTexelSize.x,  uTexelSize.y)).rgb;

  vec3 ml = texture(uTexture, vUV + vec2(-uTexelSize.x,  0.0)).rgb;
  // mc = color (center pixel, already sampled)
  vec3 mr = texture(uTexture, vUV + vec2( uTexelSize.x,  0.0)).rgb;

  vec3 bl = texture(uTexture, vUV + vec2(-uTexelSize.x, -uTexelSize.y)).rgb;
  vec3 bc = texture(uTexture, vUV + vec2( 0.0,          -uTexelSize.y)).rgb;
  vec3 br = texture(uTexture, vUV + vec2( uTexelSize.x, -uTexelSize.y)).rgb;

  // Luminance weights for perceptual accuracy
  const vec3 lumaCoeff = vec3(0.2126, 0.7152, 0.0722);

  // Compute luminance of center pixel
  float lumCenter = dot(color, lumaCoeff);

  // Compute blurred luminance (average of all 8 neighbors)
  float lumBlurred = (
    dot(tl, lumaCoeff) + dot(tc, lumaCoeff) + dot(tr, lumaCoeff) +
    dot(ml, lumaCoeff) +                       dot(mr, lumaCoeff) +
    dot(bl, lumaCoeff) + dot(bc, lumaCoeff) + dot(br, lumaCoeff)
  ) / 8.0;

  // Detail = high-frequency component (difference between original and blurred)
  float detail = lumCenter - lumBlurred;

  // Apply sharpening: add amplified detail back to each channel
  color += detail * uSharpening;

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
