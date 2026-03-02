// WebGL2 rendering pipeline — Full 13-pass processing chain
// white-balance → exposure → contrast → highlights-shadows → whites-blacks →
// clarity → tone-curve → vibrance-saturation → hsl → color-grading →
// sharpening → grain → vignette

import type { EditParameters } from '@/types/edit-parameters';
import { DEFAULT_EDIT_PARAMETERS } from '@/types/edit-parameters';
import { VERTEX_SHADER } from './shaders/vertex';
import { WHITE_BALANCE_SHADER } from './shaders/white-balance';
import { EXPOSURE_SHADER } from './shaders/exposure';
import { CONTRAST_SHADER } from './shaders/contrast';
import { HIGHLIGHTS_SHADOWS_SHADER } from './shaders/highlights-shadows';
import { WHITES_BLACKS_SHADER } from './shaders/whites-blacks';
import { CLARITY_SHADER } from './shaders/clarity';
import { TONE_CURVE_SHADER } from './shaders/tone-curve';
import { VIBRANCE_SATURATION_SHADER } from './shaders/vibrance-saturation';
import { HSL_SHADER } from './shaders/hsl';
import { COLOR_GRADING_SHADER } from './shaders/color-grading';
import { SHARPENING_SHADER } from './shaders/sharpening';
import { GRAIN_SHADER } from './shaders/grain';
import { VIGNETTE_SHADER } from './shaders/vignette';
import { createProgram, setUniforms } from './shader-compiler';
import { PingPongBuffers } from './ping-pong';
import { generateLutData } from './lut-generator';

type UniformValue = number | number[] | Float32Array;

interface PassConfig {
  program: WebGLProgram;
  shouldRun: (params: EditParameters) => boolean;
  getUniforms: (params: EditParameters) => Record<string, UniformValue>;
  /** Called before draw for passes that need extra texture bindings */
  preDraw?: (gl: WebGL2RenderingContext, program: WebGLProgram, params: EditParameters) => void;
}

const DEFAULT_HSL = DEFAULT_EDIT_PARAMETERS.hsl;
const DEFAULT_CG = DEFAULT_EDIT_PARAMETERS.colorGrading;
const DEFAULT_CURVE = DEFAULT_EDIT_PARAMETERS.toneCurve;

function hslHasChanges(params: EditParameters): boolean {
  const h = params.hsl;
  for (const color of ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple', 'magenta'] as const) {
    if (h[color].hue !== 0 || h[color].saturation !== 0 || h[color].luminance !== 0) return true;
  }
  return false;
}

function cgHasChanges(params: EditParameters): boolean {
  const cg = params.colorGrading;
  for (const zone of ['shadows', 'midtones', 'highlights'] as const) {
    if (cg[zone].saturation !== 0 || cg[zone].luminance !== 0) return true;
  }
  return false;
}

function curveHasChanges(params: EditParameters): boolean {
  const tc = params.toneCurve;
  for (const ch of ['rgb', 'red', 'green', 'blue'] as const) {
    const pts = tc[ch];
    const def = DEFAULT_CURVE[ch];
    if (pts.length !== def.length) return true;
    for (let i = 0; i < pts.length; i++) {
      if (pts[i].x !== def[i].x || pts[i].y !== def[i].y) return true;
    }
  }
  return false;
}

export class WebGLPipeline {
  private gl: WebGL2RenderingContext | null = null;
  private passes: PassConfig[] = [];
  private pingPong: PingPongBuffers;
  private vao: WebGLVertexArrayObject | null = null;
  private imageWidth = 0;
  private imageHeight = 0;

  // LUT texture for tone curve
  private lutTexture: WebGLTexture | null = null;
  private grainSeed = 0;

  constructor() {
    this.pingPong = new PingPongBuffers();
  }

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.imageWidth = width;
    this.imageHeight = height;

    // Create empty VAO for attribute-less rendering (gl_VertexID)
    this.vao = gl.createVertexArray();

    // Initialize ping-pong buffers
    this.pingPong.init(gl, width, height);

    // Create LUT texture for tone curves
    this.lutTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // Initialize with identity LUT
    const identityLut = new Uint8Array(256 * 4);
    for (let i = 0; i < 256; i++) {
      identityLut[i * 4] = i;     // R = master
      identityLut[i * 4 + 1] = i; // G = red channel
      identityLut[i * 4 + 2] = i; // B = green channel
      identityLut[i * 4 + 3] = i; // A = blue channel
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, identityLut);
    gl.bindTexture(gl.TEXTURE_2D, null);

    const texelSize = [1.0 / width, 1.0 / height];
    const lutTex = this.lutTexture;

    // Build shader passes in processing order
    this.passes = [
      // Pass 1: White Balance
      {
        program: createProgram(gl, VERTEX_SHADER, WHITE_BALANCE_SHADER),
        shouldRun: (p) => p.whiteBalance.temperature !== 0 || p.whiteBalance.tint !== 0,
        getUniforms: (p) => ({
          uTemperature: p.whiteBalance.temperature,
          uTint: p.whiteBalance.tint,
        }),
      },
      // Pass 2: Exposure
      {
        program: createProgram(gl, VERTEX_SHADER, EXPOSURE_SHADER),
        shouldRun: (p) => p.tone.exposure !== 0,
        getUniforms: (p) => ({
          uExposure: p.tone.exposure,
        }),
      },
      // Pass 3: Contrast
      {
        program: createProgram(gl, VERTEX_SHADER, CONTRAST_SHADER),
        shouldRun: (p) => p.tone.contrast !== 0,
        getUniforms: (p) => ({
          uContrast: p.tone.contrast,
        }),
      },
      // Pass 4: Highlights & Shadows
      {
        program: createProgram(gl, VERTEX_SHADER, HIGHLIGHTS_SHADOWS_SHADER),
        shouldRun: (p) => p.tone.highlights !== 0 || p.tone.shadows !== 0,
        getUniforms: (p) => ({
          uHighlights: p.tone.highlights / 100,
          uShadows: p.tone.shadows / 100,
        }),
      },
      // Pass 5: Whites & Blacks
      {
        program: createProgram(gl, VERTEX_SHADER, WHITES_BLACKS_SHADER),
        shouldRun: (p) => p.tone.whites !== 0 || p.tone.blacks !== 0,
        getUniforms: (p) => ({
          uWhites: p.tone.whites / 100,
          uBlacks: p.tone.blacks / 100,
        }),
      },
      // Pass 6: Clarity (local contrast)
      {
        program: createProgram(gl, VERTEX_SHADER, CLARITY_SHADER),
        shouldRun: (p) => p.presence.clarity !== 0,
        getUniforms: (p) => ({
          uClarity: p.presence.clarity / 100,
          uTexelSize: texelSize,
        }),
      },
      // Pass 7: Tone Curve (LUT-based)
      {
        program: createProgram(gl, VERTEX_SHADER, TONE_CURVE_SHADER),
        shouldRun: curveHasChanges,
        getUniforms: () => ({}),
        preDraw: (glCtx, program, p) => {
          // Update LUT texture with current curve data
          const lutData = generateLutData(p.toneCurve);
          glCtx.activeTexture(glCtx.TEXTURE1);
          glCtx.bindTexture(glCtx.TEXTURE_2D, lutTex);
          glCtx.texSubImage2D(glCtx.TEXTURE_2D, 0, 0, 0, 256, 1, glCtx.RGBA, glCtx.UNSIGNED_BYTE, lutData);
          const lutLoc = glCtx.getUniformLocation(program, 'uLut');
          glCtx.uniform1i(lutLoc, 1);
        },
      },
      // Pass 8: Vibrance & Saturation
      {
        program: createProgram(gl, VERTEX_SHADER, VIBRANCE_SATURATION_SHADER),
        shouldRun: (p) => p.presence.vibrance !== 0 || p.presence.saturation !== 0,
        getUniforms: (p) => ({
          uVibrance: p.presence.vibrance / 100,
          uSaturation: p.presence.saturation / 100,
        }),
      },
      // Pass 9: HSL Adjustments
      {
        program: createProgram(gl, VERTEX_SHADER, HSL_SHADER),
        shouldRun: hslHasChanges,
        getUniforms: (p) => ({
          uHslRedHue: p.hsl.red.hue / 360,
          uHslRedSat: p.hsl.red.saturation / 100,
          uHslRedLum: p.hsl.red.luminance / 100,
          uHslOrangeHue: p.hsl.orange.hue / 360,
          uHslOrangeSat: p.hsl.orange.saturation / 100,
          uHslOrangeLum: p.hsl.orange.luminance / 100,
          uHslYellowHue: p.hsl.yellow.hue / 360,
          uHslYellowSat: p.hsl.yellow.saturation / 100,
          uHslYellowLum: p.hsl.yellow.luminance / 100,
          uHslGreenHue: p.hsl.green.hue / 360,
          uHslGreenSat: p.hsl.green.saturation / 100,
          uHslGreenLum: p.hsl.green.luminance / 100,
          uHslAquaHue: p.hsl.aqua.hue / 360,
          uHslAquaSat: p.hsl.aqua.saturation / 100,
          uHslAquaLum: p.hsl.aqua.luminance / 100,
          uHslBlueHue: p.hsl.blue.hue / 360,
          uHslBlueSat: p.hsl.blue.saturation / 100,
          uHslBlueLum: p.hsl.blue.luminance / 100,
          uHslPurpleHue: p.hsl.purple.hue / 360,
          uHslPurpleSat: p.hsl.purple.saturation / 100,
          uHslPurpleLum: p.hsl.purple.luminance / 100,
          uHslMagentaHue: p.hsl.magenta.hue / 360,
          uHslMagentaSat: p.hsl.magenta.saturation / 100,
          uHslMagentaLum: p.hsl.magenta.luminance / 100,
        }),
      },
      // Pass 10: Color Grading
      {
        program: createProgram(gl, VERTEX_SHADER, COLOR_GRADING_SHADER),
        shouldRun: cgHasChanges,
        getUniforms: (p) => ({
          uCgShadowHue: p.colorGrading.shadows.hue / 360,
          uCgShadowSat: p.colorGrading.shadows.saturation / 100,
          uCgShadowLum: p.colorGrading.shadows.luminance / 100,
          uCgMidtoneHue: p.colorGrading.midtones.hue / 360,
          uCgMidtoneSat: p.colorGrading.midtones.saturation / 100,
          uCgMidtoneLum: p.colorGrading.midtones.luminance / 100,
          uCgHighlightHue: p.colorGrading.highlights.hue / 360,
          uCgHighlightSat: p.colorGrading.highlights.saturation / 100,
          uCgHighlightLum: p.colorGrading.highlights.luminance / 100,
        }),
      },
      // Pass 11: Sharpening
      {
        program: createProgram(gl, VERTEX_SHADER, SHARPENING_SHADER),
        shouldRun: (p) => p.detail.sharpening > 0,
        getUniforms: (p) => ({
          uSharpening: p.detail.sharpening / 100,
          uTexelSize: texelSize,
        }),
      },
      // Pass 12: Film Grain
      {
        program: createProgram(gl, VERTEX_SHADER, GRAIN_SHADER),
        shouldRun: (p) => p.detail.grain > 0,
        getUniforms: (p) => ({
          uGrain: p.detail.grain / 100,
          uGrainSize: p.detail.grainSize / 100,
          uSeed: this.grainSeed,
        }),
      },
      // Pass 13: Vignette
      {
        program: createProgram(gl, VERTEX_SHADER, VIGNETTE_SHADER),
        shouldRun: (p) => p.effects.vignette !== 0,
        getUniforms: (p) => ({
          uVignette: p.effects.vignette / 100,
          uVignetteFeather: p.effects.vignetteFeather / 100,
        }),
      },
    ];
  }

  resize(width: number, height: number): void {
    if (!this.gl) return;
    this.imageWidth = width;
    this.imageHeight = height;
    this.pingPong.destroy();
    this.pingPong = new PingPongBuffers();
    this.pingPong.init(this.gl, width, height);
  }

  /**
   * Upload the source image into the read buffer of the ping-pong system.
   */
  uploadSource(sourceTexture: WebGLTexture): void {
    if (!this.gl) return;
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPong.getWriteFramebuffer());
    gl.viewport(0, 0, this.pingPong.getWidth(), this.pingPong.getHeight());

    // Use exposure shader with 0 stops as passthrough
    const exposurePass = this.passes[1]; // exposure is pass index 1
    gl.useProgram(exposurePass.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    const texLoc = gl.getUniformLocation(exposurePass.program, 'uTexture');
    gl.uniform1i(texLoc, 0);
    setUniforms(gl, exposurePass.program, { uExposure: 0 });

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    this.pingPong.swap();
  }

  /**
   * Execute the pipeline passes.
   * Returns the texture containing the processed result.
   */
  render(params: EditParameters, sourceTexture: WebGLTexture): WebGLTexture {
    if (!this.gl) throw new Error('Pipeline not initialized');
    const gl = this.gl;

    // Update grain seed for variation
    this.grainSeed = Math.random() * 1000;

    // Upload source into ping-pong
    this.uploadSource(sourceTexture);

    // Run active passes
    for (const pass of this.passes) {
      if (!pass.shouldRun(params)) continue;

      // Bind write framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pingPong.getWriteFramebuffer());
      gl.viewport(0, 0, this.pingPong.getWidth(), this.pingPong.getHeight());

      // Use program
      gl.useProgram(pass.program);

      // Bind read texture to TEXTURE0
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.pingPong.getReadTexture());
      const texLoc = gl.getUniformLocation(pass.program, 'uTexture');
      gl.uniform1i(texLoc, 0);

      // Set uniforms
      const uniforms = pass.getUniforms(params);
      setUniforms(gl, pass.program, uniforms);

      // Pre-draw hook (e.g., for LUT texture binding)
      if (pass.preDraw) {
        pass.preDraw(gl, pass.program, params);
      }

      // Draw fullscreen triangle
      gl.bindVertexArray(this.vao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindVertexArray(null);

      // Swap buffers
      this.pingPong.swap();
    }

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

    if (this.lutTexture) {
      gl.deleteTexture(this.lutTexture);
      this.lutTexture = null;
    }

    this.pingPong.destroy();
    this.gl = null;
  }
}
