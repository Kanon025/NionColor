// Ping-pong framebuffer system for multi-pass rendering
// Uses RGBA16F for HDR precision

export class PingPongBuffers {
  private gl: WebGL2RenderingContext | null = null;
  private textures: [WebGLTexture | null, WebGLTexture | null] = [null, null];
  private framebuffers: [WebGLFramebuffer | null, WebGLFramebuffer | null] = [null, null];
  private readIndex = 0;
  private width = 0;
  private height = 0;

  init(gl: WebGL2RenderingContext, width: number, height: number): void {
    this.gl = gl;
    this.width = width;
    this.height = height;

    // Require EXT_color_buffer_float for RGBA16F render targets
    const ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      throw new Error('EXT_color_buffer_float is required for RGBA16F framebuffers');
    }

    for (let i = 0; i < 2; i++) {
      // Create texture
      const texture = gl.createTexture();
      if (!texture) throw new Error(`Failed to create texture ${i}`);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA16F,
        width,
        height,
        0,
        gl.RGBA,
        gl.HALF_FLOAT,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      // Create framebuffer
      const fbo = gl.createFramebuffer();
      if (!fbo) throw new Error(`Failed to create framebuffer ${i}`);

      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        texture,
        0
      );

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error(`Framebuffer ${i} incomplete: 0x${status.toString(16)}`);
      }

      this.textures[i] = texture;
      this.framebuffers[i] = fbo;
    }

    // Clean up bindings
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    this.readIndex = 0;
  }

  swap(): void {
    this.readIndex = 1 - this.readIndex;
  }

  getReadTexture(): WebGLTexture {
    const tex = this.textures[this.readIndex];
    if (!tex) throw new Error('PingPong not initialized');
    return tex;
  }

  getWriteFramebuffer(): WebGLFramebuffer {
    const writeIndex = 1 - this.readIndex;
    const fbo = this.framebuffers[writeIndex];
    if (!fbo) throw new Error('PingPong not initialized');
    return fbo;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  destroy(): void {
    if (!this.gl) return;
    const gl = this.gl;

    for (let i = 0; i < 2; i++) {
      if (this.textures[i]) {
        gl.deleteTexture(this.textures[i]);
        this.textures[i] = null;
      }
      if (this.framebuffers[i]) {
        gl.deleteFramebuffer(this.framebuffers[i]);
        this.framebuffers[i] = null;
      }
    }

    this.gl = null;
  }
}
