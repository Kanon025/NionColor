// Fullscreen quad vertex shader — uses gl_VertexID to generate positions
// Draws 2 triangles covering the entire viewport without any VBO

export const VERTEX_SHADER = /* glsl */ `#version 300 es
precision highp float;

out vec2 vUV;

void main() {
  // Generate fullscreen quad from gl_VertexID (0..5 for 2 triangles)
  // Triangle 1: (0,1,2) → (-1,-1), (3,-1), (-1,3)
  // Triangle 2: reuse via 6 vertices or use the same trick
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;

  // This generates 3 vertices: (-1,-1), (3,-1), (-1,3)
  // which forms a single triangle covering the entire clip space
  vUV = vec2(x, y) * 0.5 + 0.5;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;
