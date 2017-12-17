/**
 * Factory function for WebGLContext
 */
export function createWebGLContext(
  canvasName: string,
  vertexShaderSource,
  fragmentShaderSource): WebGLContext {

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    throw Error('Could not create WebGL shader');
  }

  function createProgram(gl, vertexShader, fragmentShader): WebGLProgram {
    const program: WebGLProgram = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw Error('Could not create WebGL program');
  }

  const canvas: HTMLCanvasElement =
    document.getElementById(canvasName) as HTMLCanvasElement;
  const gl: WebGLRenderingContext = (
    canvas.getContext('webgl') ||
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext;
  if (gl === null || gl === undefined) {
    console.log('WebGL not available on your browser');
  }

  // Create the shaders and the program
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  return new WebGLContext(gl, program, canvas);
}

export class WebGLContext {
  constructor(
    public gl: WebGLRenderingContext,
    public program: WebGLProgram,
    public canvas: HTMLCanvasElement) {}

  public clearScreen(r, g, b, a) {
    // Clear the canvas
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  public createRectangle(x, y, width, height) {
    const positions = [
      x, y, width,
      y, x, height,
      x, height, width,
      y, width, height,
    ];
    // Create a buffer...
    const positionBuffer = this.gl.createBuffer();
    // ... and bind it to the ARRAY_BUFFER webGL global
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    // Fill up the positionBuffer from the javascript array
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(positions),
      this.gl.STATIC_DRAW);

    return positionBuffer;
  }

  public bindBufferToAttribute(buffer, attributeName) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    // Now we tell webGL how to take the data from the buffer and assign it
    // to the attribute for the shaders input
    const attribute = this.gl.getAttribLocation(this.program, attributeName);
    this.gl.enableVertexAttribArray(attribute);

    return attribute;
  }

  public drawScene(nbVertices) {
    const primitiveType = this.gl.TRIANGLES;
    const offset = 0;
    // We will call the shareds nbVertices times. Each time, the share will read
    // a_position and shift the offset on the positionBuffer
    // to the size of 2 * sizeof(float)
    this.gl.drawArrays(primitiveType, offset, nbVertices);
  }
}
