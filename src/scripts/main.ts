// import 'core-js/es6/promise';
import 'styles/base.scss';
import * as fragmentShaderSource from './fragment-shader-uint16.glsl';
import * as vertexShaderSource from './vertex-shader.glsl';
import * as webGl from './webgl';

const SLOPE = 1.54163614163614;
const INTERCEPT = 0;
const WW = 2223;
const WC = 1112;
// const WW = 24708;
// const WC = 26237;

function GlobalState(this: any, slope, intercept, ww, wc, deltaX, deltaY, zoom) {
  this._slope = slope;
  this._intercept = intercept;
  this._ww = ww;
  this._wc = wc;
  this._deltaX = deltaX;
  this._deltaY = deltaY;
  this._zoom = zoom;

  this.reset = function reset() {
    this.slope = this._slope;
    this.intercept = this._intercept;
    this.ww = this._ww;
    this.wc = this._wc;
    this.deltaX = this._deltaX;
    this.deltaY = this._deltaY;
    this.zoom = this._zoom;
  };

  this.reset();
}

function httpGetAsync(url, responseType = 'arraybuffer') {
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
    xmlHttp.open('GET', url, true); // true for asynchronous
    xmlHttp.send(null);
  });
}

function setWWWCDisplay(ww, wc) {
  const wwElement = document.getElementById('ww');
  if (wwElement) {
    wwElement.textContent = ww;
  }
  const wcElement = document.getElementById('wc');
  if (wcElement) {
    wcElement.textContent = wc;
  }
}

function initLocations(gl, locations, globalState) {
  gl.uniform1f(locations.windowWidthLocation, globalState.ww);
  gl.uniform1f(locations.windowCenterLocation, globalState.wc);
  gl.uniform2f(locations.panLocation, globalState.deltaX, globalState.deltaY);
  setWWWCDisplay(globalState.ww, globalState.wc);
}

function EventObject(this: any, gl, canvas, globalState, locations) {
  enum action_e {
    WWWC = 0,
    ZOOM = 1,
    PAN = 2,
    NONE,
  };

  let action: action_e = action_e.NONE;
  const mousestart = { clientX: 0, clientY: 0 };

  function adjustWWWC(event) {
    globalState.ww = Math.max(Math.min(globalState.ww + event.movementX * 15, 65535), 0);
    globalState.wc = Math.max(Math.min(globalState.wc - event.movementY * 15, 65535), 0);
    gl.uniform1f(locations.windowWidthLocation, globalState.ww);
    gl.uniform1f(locations.windowCenterLocation, globalState.wc);
    setWWWCDisplay(globalState.ww, globalState.wc);
    webGl.drawScene(gl, 6);
  }

  function adjustPan(event) {
    globalState.deltaX = Math.max(Math.min(globalState.deltaX + event.movementX, 512), -512);
    globalState.deltaY = Math.max(Math.min(globalState.deltaY - event.movementY, 512), -512);
    gl.uniform2f(locations.panLocation, globalState.deltaX, globalState.deltaY);
    webGl.drawScene(gl, 6);
  }

  this.start = function start(event) {
    action = event.button;
    mousestart.clientX = event.clientX;
    mousestart.clientY = event.clientY;
  }

  this.stop = function stop() {
    action = action_e.NONE;
  }

  this.move = function move(event) {
    switch (action) {
    case action_e.WWWC: {
      adjustWWWC(event);
      break;
    }
    case action_e.ZOOM: {
      adjustWWWC(event);
      break;
    }
    case action_e.PAN: {
      adjustPan(event);
      break;
    }
    }
  }

  this.dblClick = function dblClick(event) {
    globalState.reset();
    initLocations(gl, locations, globalState);
    webGl.drawScene(gl, 6);
  }
}

function initDragEvents(canvas, eventObject) {
  canvas.addEventListener('mousedown', event => {
    eventObject.start(event);
    window.addEventListener('mouseup', () => {
      eventObject.stop();
      window.removeEventListener('mouseMove', eventObject.move);
    }, { once: true });
    window.addEventListener('mousemove', eventObject.move);
  });
  canvas.addEventListener('dblclick', eventObject.dblClick);
}

// Main program starts here
function main() {
  let canvas;
  let gl;
  let program;

  ({ canvas, gl, program } = webGl.init('c', vertexShaderSource, fragmentShaderSource));
  webGl.clearScreen(gl, 0, 0, 0, 0);

  const globalState = new GlobalState(SLOPE, INTERCEPT, WW, WC, 0, 0, 1);

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

  // Set the pan
  const panLocation = gl.getUniformLocation(program, 'u_pan');
  gl.uniform2f(panLocation, 0, 0);

  const locations = {
    interceptLocation,
    panLocation,
    resolutionUniformLocation,
    slopeLocation,
    windowCenterLocation,
    windowWidthLocation,
  };

  initLocations(gl, locations, globalState);
  initDragEvents(canvas, new EventObject(gl, canvas, globalState, locations));

  // three 2d points makes a triangle
  const positionBuffer = webGl.createRectangle(gl, 0, 0, canvas.width, canvas.height);
  const positionAttributeLocation = webGl.bindBufferToAttribute(
    gl,
    program,
    positionBuffer,
    'a_position'
  );

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2; // 2 components per iteration
  const type = gl.FLOAT; // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  // Retrieve the image
  httpGetAsync('/case1_16.raw')
    .then(request => {
      // look up where the texture coordinates need to go.
      const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
      // provide texture coordinates for the rectangle.
      const texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([
          0.0, 0.0,
          1.0, 0.0,
          0.0, 1.0,
          0.0, 1.0,
          1.0, 0.0,
          1.0, 1.0,
        ]),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      // Convert uint16 array to 2*8uint array
      const src = new Uint16Array(request.response);
      const dst = new Uint8Array(request.response.byteLength);
      for (let i = 0; i < request.response.byteLength / 2; ++i) {
        dst[i * 2]     = src[i] & 0xFF;
        dst[i * 2 + 1] = src[i] >> 8;
      }
      // Create a texture.
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // Set the parameters so we can render any size image.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      // Upload the image into the texture.
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.LUMINANCE_ALPHA,
        canvas.width,
        canvas.height,
        0,
        gl.LUMINANCE_ALPHA,
        gl.UNSIGNED_BYTE,
        dst,
      );

      // We draw a rectangle, so 6 vertices
      webGl.drawScene(gl, 6);
    })
    .catch(err => console.error(`failed to retrieve image: ${err}`));
}

main();
