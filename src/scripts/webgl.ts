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
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export function init(canvasName, vertexShaderSource, fragmentShaderSource) {
  const canvas: any = document.getElementById(canvasName);
  const gl =
    canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl === null || gl === undefined) {
    console.log('WebGL not available on your browser');
  }

  // Create the shaders and the program
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  return { canvas, gl, program };
}

export function clearScreen(gl, r, g, b, a) {
  // Clear the canvas
  gl.clearColor(r, g, b, a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

export function createRectangle(gl, x, y, width, height) {
  const positions = [
    x,
    y,
    width,
    y,
    x,
    height,
    x,
    height,
    width,
    y,
    width,
    height,
  ];
  // Create a buffer...
  const positionBuffer = gl.createBuffer();
  // ... and bind it to the ARRAY_BUFFER webGL global
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Fill up the positionBuffer from the javascript array
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

export function bindBufferToAttribute(gl, program, buffer, attributeName) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Now we tell webGL how to take the data from the buffer and assign it
  // to the attribute for the shaders input
  const attribute = gl.getAttribLocation(program, attributeName);
  gl.enableVertexAttribArray(attribute);

  return attribute;
}

export function drawScene(gl, nbVertices) {
  const primitiveType = gl.TRIANGLES;
  const offset = 0;
  // We will call the shareds nbVertices times. Each time, the share will read
  // a_position and shift the offset on the positionBuffer
  // to the size of 2 * sizeof(float)
  gl.drawArrays(primitiveType, offset, nbVertices);
}
