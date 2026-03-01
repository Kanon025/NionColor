// WebGL2 rendering pipeline — Sprint 1: 3 passes
// white-balance → exposure → contrast

import type { EditParameters } from '@/types/edit-parameters';
import { VERTEX_SHADER } from './shaders/vertex';
import { WHITE_BALANCE_SHADER } from './shaders/white-balance';
import { EXPOSURE_SHADER } from './shaders/exposure';
import { CONTRAST_SHADER } from './shaders/contrast';
import { createProgram, setUniforms } from './shader-compiler';
import { PingPongBuffers } from './ping-pong';

interface PassConfig {
  program: WebGLProgram;
  shouldRun: (params: EditParameters) => boolean;
  getUniforms: (params: EditParameters) => Record<string, number>;
}

export class WebGLPipeline {
  private gl: WebGL2RenderingContext | null = null;
  private passes: PassConfig[] = [];
  private pingPong: PingPongBuffers;
  private vao: WebGLVertexArrayObject | null = null;

  constructor() {
    this.pingPong = new PingPongBuffers();
  }

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;

    // Create empty VAO for attribute-less rendering (gl_VertexID)
    this.vao = gl.createVertexArray();

    // Initialize ping-pong buffers
    this.pingPong.init(gl, width, height);

    // Build shader passes
    this.passes = [
      {
        program: createProgram(gl, VERTEX_SHADER, WHITE_BALANCE_SHADER),
        shouldRun: (p) =>
          p.whiteBalance.temperature !== 0 || p.whiteBalance.tint !== 0,
        getUniforms: (p) => ({
          uTemperature: p.whiteBalance.temperature,
          uTint: p.whiteBalance.tint,
        }),
      },
      {
        program: createProgram(gl, VERTEX_SHADER, EXPOSURE_SHADER),
        shouldRun: (p) => p.tone.exposure !== 0,
        getUniforms: (p) => ({
          uExposure: p.tone.exposure,
        }),
      },
      {
        program: createProgram(gl, VERTEX_SHADER, CONTRAST_SHADER),
        shouldRun: (p) => p.tone.contrast !== 0,
        getUniforms: (p) => ({
          uContrast: p.tone.contrast,
        }),
      },
    ];
  }

  resize(width: number, height: number): void {
    if (!this.gl) return;
    this.pingPong.destroy();
    this.pingPong = new PingPongBuffers();
    this.pingPong.init(this.gl, width, height);
  }

  /**
   * Upload the source image into the read buffer of the ping-pong system.
   * Call this before render() whenever the source image changes.
   */
  uploadSource(sourceTexture: WebGLTexture): void {
    if (!this.gl) return;
    const gl = this.gl;

    // Render source texture into ping-pong read buffer
    // We bind the write FBO, draw the source, then swap so it becomes the read
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPong.getWriteFramebuffer());
    gl.viewport(0, 0, this.pingPong.getWidth(), this.pingPong.getHeight());

    // Use a simple pass-through: we can use the exposure shader with exposure=0
    // but more efficiently, just blit via copyTexSubImage or drawArrays
    // Actually, let's use the first pass program with identity uniforms
    // Simpler: use framebuffer blit by rendering source as a textured quad

    // We need a passthrough — use exposure with 0 stops
    const exposurePass = this.passes[1];
    gl.useProgram(exposurePass.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    const texLoc = gl.getUniformLocation(exposurePass.program, 'uTexture');
    gl.uniform1i(texLoc, 0);
    setUniforms(gl, exposurePass.program, {
      uExposure: 0,
    });

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    this.pingPong.swap(); // Now the source is in the read buffer
  }

  /**
   * Execute the pipeline passes. The source image must already be in the
   * ping-pong read buffer (via uploadSource).
   * Returns the texture containing the processed result.
   */
  render(params: EditParameters, sourceTexture: WebGLTexture): WebGLTexture {
    if (!this.gl) throw new Error('Pipeline not initialized');
    const gl = this.gl;

    // Upload source into ping-pong
    this.uploadSource(sourceTexture);

    // Run active passes
    let anyPassRan = false;

    for (const pass of this.passes) {
      if (!pass.shouldRun(params)) continue;

      // Bind write framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPong.getWriteFramebuffer());
      gl.viewport(0, 0, this.pingPong.getWidth(), this.pingPong.getHeight());

      // Use program
      gl.useProgram(pass.program);

      // Bind read texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pingPong.getReadTexture());

      // Set uniforms
      const texLoc2 = gl.getUniformLocation(pass.program, 'uTexture');
      gl.uniform1i(texLoc2, 0);
      const uniforms = pass.getUniforms(params);
      setUniforms(gl, pass.program, uniforms);

      // Draw fullscreen triangle
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      // Swap buffers
      this.pingPong.swap();
      anyPassRan = true;
    }

    // If no passes ran, the source is still in the read buffer from uploadSource
    // getReadTexture() is correct either way
    return this.pingPong.getReadTexture();
  }

  destroy(): void {
    if (!this.gl) return;
    const gl = this.gl;

    for (const pass of this.passes) {
      gl.deleteProgram(pass.program);
    }
    this.passes = [];

    if (this.vao) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }

    this.pingPong.destroy();
    this.gl = null;
  }
}
