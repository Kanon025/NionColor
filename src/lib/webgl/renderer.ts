// WebGL2 Renderer — main entry point for the photo editing engine
// Manages WebGL context, image loading, pipeline execution, and output rendering

import type { EditParameters } from '@/types/edit-parameters';
import { VERTEX_SHADER } from './shaders/vertex';
import { OUTPUT_SHADER } from './shaders/output';
import { createProgram, setUniforms } from './shader-compiler';
import { WebGLPipeline } from './pipeline';

export class WebGLRenderer {
  private gl: WebGL2RenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private pipeline: WebGLPipeline | null = null;
  private outputProgram: WebGLProgram | null = null;
  private outputVao: WebGLVertexArrayObject | null = null;
  private sourceTexture: WebGLTexture | null = null;
  private imageWidth = 0;
  private imageHeight = 0;

  // Transform state
  private zoom = 1;
  private panX = 0;
  private panY = 0;

  init(canvas: HTMLCanvasElement): void {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    });

    if (!gl) {
      throw new Error('WebGL2 is not supported in this browser');
    }

    this.gl = gl;
    this.canvas = canvas;

    // Create output program (renders final result to canvas)
    this.outputProgram = createProgram(gl, VERTEX_SHADER, OUTPUT_SHADER);
    this.outputVao = gl.createVertexArray();
  }

  loadImage(imageBitmap: ImageBitmap): void {
    if (!this.gl) throw new Error('Renderer not initialized');
    const gl = this.gl;

    this.imageWidth = imageBitmap.width;
    this.imageHeight = imageBitmap.height;

    // Create source texture from ImageBitmap
    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
    }

    this.sourceTexture = gl.createTexture();
    if (!this.sourceTexture) throw new Error('Failed to create source texture');

    gl.bindTexture(gl.TEXTURE_2D, this.sourceTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageBitmap
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Initialize or resize pipeline to match image dimensions
    if (this.pipeline) {
      this.pipeline.destroy();
    }
    this.pipeline = new WebGLPipeline();
    this.pipeline.init(gl, this.imageWidth, this.imageHeight);

    // Reset transform
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
  }

  render(params: EditParameters): void {
    if (!this.gl || !this.pipeline || !this.sourceTexture || !this.outputProgram) {
      return;
    }

    const gl = this.gl;
    const canvas = this.canvas!;

    // Run the processing pipeline
    const resultTexture = this.pipeline.render(params, this.sourceTexture);

    // Render result to canvas with zoom/pan transform
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.outputProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resultTexture);

    // Build transform matrix (3x3, column-major for GLSL)
    const transform = this.buildTransformMatrix();

    const texLoc = gl.getUniformLocation(this.outputProgram, 'uTexture');
    gl.uniform1i(texLoc, 0);
    setUniforms(gl, this.outputProgram, {
      uTransform: transform,
    });

    gl.bindVertexArray(this.outputVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  setTransform(zoom: number, panX: number, panY: number): void {
    this.zoom = zoom;
    this.panX = panX;
    this.panY = panY;
  }

  private buildTransformMatrix(): Float32Array {
    // Build a 3x3 matrix that maps canvas UV → texture UV
    // Incorporates zoom and pan
    // At zoom=1, pan=0: identity
    // Zoom scales around center, pan offsets
    const s = 1.0 / this.zoom;
    const tx = -this.panX * s + 0.5 * (1.0 - s);
    const ty = -this.panY * s + 0.5 * (1.0 - s);

    // Column-major 3x3 matrix
    return new Float32Array([
      s, 0, 0,    // column 0
      0, s, 0,    // column 1
      tx, ty, 1,  // column 2
    ]);
  }

  hasImage(): boolean {
    return this.sourceTexture !== null && this.imageWidth > 0;
  }

  getImageDimensions(): { width: number; height: number } {
    return { width: this.imageWidth, height: this.imageHeight };
  }

  destroy(): void {
    if (!this.gl) return;
    const gl = this.gl;

    if (this.pipeline) {
      this.pipeline.destroy();
      this.pipeline = null;
    }

    if (this.outputProgram) {
      gl.deleteProgram(this.outputProgram);
      this.outputProgram = null;
    }

    if (this.outputVao) {
      gl.deleteVertexArray(this.outputVao);
      this.outputVao = null;
    }

    if (this.sourceTexture) {
      gl.deleteTexture(this.sourceTexture);
      this.sourceTexture = null;
    }

    this.gl = null;
    this.canvas = null;
  }
}
