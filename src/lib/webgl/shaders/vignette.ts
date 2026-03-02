// Vignette fragment shader
// Darkens or lightens edges with configurable feather/falloff

export const VIGNETTE_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uVignette;        // -100..100 -> -1.0..1.0 (positive = darken edges, negative = lighten)
uniform float uVignetteFeather; // 0-100 -> 0.0-1.0 (controls falloff softness)

void main() {
  vec4 texel = texture(uTexture, vUV);
  vec3 color = texel.rgb;

  // Early exit if no vignette
  if (abs(uVignette) < 0.001) {
    fragColor = vec4(color, texel.a);
    return;
  }

  // Compute distance from center, normalized so corners reach ~1.0
  // vUV is 0-1, center is (0.5, 0.5)
  vec2 centered = vUV - 0.5;
  float distance = length(centered) * 2.0; // 0 at center, ~1.414 at corners

  // Feather controls the smoothstep falloff width
  // Low feather = hard edge, high feather = soft gradual falloff
  float feather = max(uVignetteFeather, 0.01); // prevent zero-width transition

  // Inner radius where vignette starts, outer where it reaches full strength
  float innerRadius = 1.0 - feather;
  float outerRadius = 1.0 + feather * 0.5;

  // Smooth falloff from inner to outer radius
  float falloff = smoothstep(innerRadius, outerRadius, distance);

  // Apply vignette
  // Positive uVignette: darken edges (multiply toward 0)
  // Negative uVignette: lighten edges (multiply toward higher values)
  float vignetteAmount = abs(uVignette);
  float sign_v = sign(uVignette);

  // Darkening: color *= (1.0 - falloff * amount)
  // Lightening: color += falloff * amount * (1.0 - color) — screen blend
  if (sign_v > 0.0) {
    // Darken edges
    color *= 1.0 - falloff * vignetteAmount;
  } else {
    // Lighten edges (screen blend to avoid blowing out highlights)
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - vec3(falloff)), vignetteAmount);
  }

  color = clamp(color, 0.0, 1.0);

  fragColor = vec4(color, texel.a);
}
`;
