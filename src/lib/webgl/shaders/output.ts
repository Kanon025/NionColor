// Output fragment shader — renders final result to canvas
// Applies zoom/pan transform via a 3x3 matrix

export const OUTPUT_SHADER = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform mat3 uTransform; // zoom/pan transform matrix

void main() {
  // Flip Y: ImageBitmap stores top-to-bottom, GL framebuffers are bottom-to-top.
  // The pipeline preserves the source orientation, so we flip here for screen display.
  vec2 screenUV = vec2(vUV.x, 1.0 - vUV.y);

  // Apply inverse transform to UV coordinates
  // uTransform maps from canvas space to texture space
  vec3 transformed = uTransform * vec3(screenUV, 1.0);
  vec2 uv = transformed.xy;

  // Check if UV is out of bounds — render transparent/dark outside image
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.1, 0.1, 0.1, 1.0);
    return;
  }

  vec4 texel = texture(uTexture, uv);
  fragColor = vec4(texel.rgb, 1.0);
}
`;
