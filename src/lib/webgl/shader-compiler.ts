// WebGL2 shader compilation utilities

export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: GLenum
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error('Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    throw new Error(`Program linking failed: ${info}`);
  }

  // Shaders can be deleted after linking
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

export type UniformValue = number | number[] | Float32Array;

export function setUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  uniforms: Record<string, UniformValue>
): void {
  for (const [name, value] of Object.entries(uniforms)) {
    const location = gl.getUniformLocation(program, name);
    if (location === null) continue; // Uniform may be optimized out

    if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value instanceof Float32Array || Array.isArray(value)) {
      const arr = value instanceof Float32Array ? value : new Float32Array(value);
      switch (arr.length) {
        case 2:
          gl.uniform2fv(location, arr);
          break;
        case 3:
          gl.uniform3fv(location, arr);
          break;
        case 4:
          gl.uniform4fv(location, arr);
          break;
        case 9:
          gl.uniformMatrix3fv(location, false, arr);
          break;
        case 16:
          gl.uniformMatrix4fv(location, false, arr);
          break;
        default:
          gl.uniform1fv(location, arr);
      }
    }
  }
}
