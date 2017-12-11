import 'core-js/es6/promise';

const SLOPE = 1.54163614163614;
const INTERCEPT = 0;
const WW = 2223;
const WC = 1112;

const vertexShaderSource = `
// an attribute will receive data from a buffer
attribute vec2 a_position;
uniform vec2 u_resolution;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;

void main() {
  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = a_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(clipSpace, 0, 1);
  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points
  v_texCoord = a_texCoord;
}
`;

const fragmentShaderSource = `
// fragment shaders don't have a default precision so we need
// to pick one. mediump is a good default
precision mediump float;

// our texture
uniform sampler2D u_image;

uniform float u_slope;
uniform float u_intercept;
uniform float u_window_width;
uniform float u_window_center;

// the texCoords passed in from the vertex shader.
varying vec2 v_texCoord;

void main() {
  vec4 color = texture2D(u_image, v_texCoord);
  // Slope & intercept
  color = u_slope * color + u_intercept;
  // WW/WC
  float lowerBound = (u_window_center - u_window_width / 2.0);
  float higherBound = (u_window_center + u_window_width / 2.0);
  color = color - u_window_center;
  color = color / u_window_width;
  color -= color * max(sign(lowerBound - color), 0.0);
  color += (1.0 - color) * max(sign(color - higherBound), 0.0);
  // gl_FragColor is a special variable a fragment shader
  // is responsible for setting
  gl_FragColor = color;
}
`;

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

function init(canvasName) {
  const canvas: any = document.getElementById(canvasName);
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl === null || gl === undefined) {
    console.log('WebGL not available on your browser');
  }

  // Create the shaders and the program
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertexShader, fragmentShader);

  return { canvas, gl, program };
}

function clearScreen(gl, r, g, b, a) {
  // Clear the canvas
  gl.clearColor(r, g, b, a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function createRectangle(gl, x, y, width, height) {
  const positions = [
    x, y,
    width, y,
    x, height,
    x, height,
    width, y,
    width, height,
  ];
  // Create a buffer...
  const positionBuffer = gl.createBuffer();
  // ... and bind it to the ARRAY_BUFFER webGL global
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Fill up the positionBuffer from the javascript array
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

function bindBufferToAttribute(gl, program, buffer, attributeName) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Now we tell webGL how to take the data from the buffer and assign it
  // to the attribute for the shaders input
  const attribute = gl.getAttribLocation(program, attributeName);
  gl.enableVertexAttribArray(attribute);

  return attribute;
}

function drawScene(gl, nbVertices) {
  const primitiveType = gl.TRIANGLES;
  const offset = 0;
  // We will call the shareds nbVertices times. Each time, the share will read
  // a_position and shift the offset on the positionBuffer
  // to the size of 2 * sizeof(float)
  gl.drawArrays(primitiveType, offset, nbVertices);
}

function httpGetAsync(url, responseType = "arraybuffer") {
  return new Promise<XMLHttpRequest>((resolve, reject) => {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.responseType = responseType as 'text';
    xmlHttp.onreadystatechange = () => {
      if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
        resolve(xmlHttp);
      } else if (xmlHttp.status && xmlHttp.status / 100 !== 2) {
        reject(xmlHttp);
      }
    };
    xmlHttp.open("GET", url, true); // true for asynchronous
    xmlHttp.send(null);
  });
}

function setWWWCDisplay(ww, wc) {
  const wwElement = document.getElementById('ww');
  if (wwElement) { wwElement.textContent = ww; }
  const wcElement = document.getElementById('wc');
  if (wcElement) { wcElement.textContent = wc; }
}

function initWWWC(gl, windowWidthLocation, windowCenterLocation) {
  gl.uniform1f(windowWidthLocation, WW / 65535);
  gl.uniform1f(windowCenterLocation, WC / 65535);
  setWWWCDisplay(WW, WC);
}

const delays: number[] = [];
(function displayMeanDelay() {
  let lastSum = 0.0;
  setInterval(() => {
    let sum = 0.0;
    delays.forEach(entry => sum += entry);
    if (lastSum !== sum) {
      const fps = 1000 / (sum / delays.length);
      const fpsElement = document.getElementById('fps');
      if (fpsElement) {
        fpsElement.textContent = fps.toString();
      }
      lastSum = sum;
    }
  }, 200);
})();

function initDragEvents(gl, canvas, windowWidthLocation, windowCenterLocation) {
  let mousepressed = false;
  const mousestart = { clientX: 0, clientY: 0 };
  let ww = WW;
  let wc = WC;
  let dww = ww;
  let dwc = wc;
  canvas.addEventListener("mousedown", (event) => {
    mousepressed = true;
    mousestart.clientX = event.clientX;
    mousestart.clientY = event.clientY;
  });
  canvas.addEventListener("mouseup", () => {
    mousepressed = false;
    ww = dww;
    wc = dwc;
  });
  canvas.addEventListener("mousemove", (event) => {
    const start = window.performance.now();
    if (mousepressed) {
      dww = (ww - (mousestart.clientX - event.clientX) * 10);
      dwc = (wc + (mousestart.clientY - event.clientY) * 10);
      gl.uniform1f(windowWidthLocation, dww / 65535);
      gl.uniform1f(windowCenterLocation, dwc / 65535);
      setWWWCDisplay(dww, dwc);
      drawScene(gl, 6);
    }
    delays.push(window.performance.now() - start);
    if (delays.length > 100) { delays.shift(); }
  });
  canvas.addEventListener("dblclick", () => {
    ww = WW;
    wc = WC;
    initWWWC(gl, windowWidthLocation, windowCenterLocation);
    drawScene(gl, 6);
  });
}

// Main program starts here
function main() {
  let canvas;
  let gl;
  let program;

  ({canvas, gl, program} = init('c'));
  clearScreen(gl, 0, 0, 0, 0);

  // Tell it to use our program (pair of shaders)
  gl.useProgram(program);
  // Only now, we can set variables

  // Set the resolution for the vertex shader
  const resolutionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

  // Set slopw and intercept
  const slopeLocation = gl.getUniformLocation(program, 'u_slope');
  const interceptLocation = gl.getUniformLocation(program, 'u_intercept');
  gl.uniform1f(slopeLocation, SLOPE);
  gl.uniform1f(interceptLocation, INTERCEPT);

  // Set the WindowWidth and WindowCenter
  const windowWidthLocation = gl.getUniformLocation(program, 'u_window_width');
  const windowCenterLocation = gl.getUniformLocation(program, 'u_window_center');
  initWWWC(gl, windowWidthLocation, windowCenterLocation);
  initDragEvents(gl, canvas, windowWidthLocation, windowCenterLocation);

  // three 2d points makes a triangle
  const positionBuffer = createRectangle(gl, 0, 0, canvas.width, canvas.height);
  const positionAttributeLocation = bindBufferToAttribute(gl, program, positionBuffer,
      'a_position');

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2;          // 2 components per iteration
  const type = gl.FLOAT;   // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize,
      stride, offset);

  // Retrieve the image
  httpGetAsync('/case1_008_000.raw').then(request => {
    // look up where the texture coordinates need to go.
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    // provide texture coordinates for the rectangle.
    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        0.0, 1.0,
        1.0, 0.0,
        1.0, 1.0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Create a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Set the parameters so we can render any size image.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Upload the image into the texture.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, canvas.width, canvas.height, 0,
        gl.LUMINANCE, gl.UNSIGNED_BYTE, new Uint8Array(request.response));

    // We draw a rectangle, so 6 vertices
    drawScene(gl, 6);
    console.log('done');
  }).catch((err) => console.error(`failed to retrieve image: ${err}`));
}

main();