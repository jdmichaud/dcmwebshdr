// import 'core-js/es6/promise';
import { AnnotationManager } from 'scripts/annotation-manager';
import { EventManager } from 'scripts/event-manager';
import { ImageParam } from 'scripts/image-param';
import { createWebGLContext, WebGLContext } from 'scripts/webgl';

import * as fragmentShaderSource from 'scripts/fragment-shader-uint16.glsl';
import * as vertexShaderSource from 'scripts/vertex-shader.glsl';

import  'styles/base.scss';

const SLOPE = 1.54163614163614;
const INTERCEPT = 0;
const WW = 2223;
const WC = 1112;

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

function initLocations(context, locations, imageParam, annotationMgr) {
  context.gl.uniform1f(locations.windowWidthLocation, imageParam.ww);
  context.gl.uniform1f(locations.windowCenterLocation, imageParam.wc);
  context.gl.uniform2f(locations.panLocation, imageParam.deltaX, imageParam.deltaY);
  context.gl.uniform2f(locations.scaleLocation, imageParam.zoom, imageParam.zoom);
  annotationMgr.setParam(imageParam);
}

function convertToImageSpace(zoom, deltaX, deltaY, pos) {
  return [(pos[0] - deltaX) / zoom, (pos[1] - deltaY) / zoom];
}

function initDragEvents(canvas, eventManager) {
  function move(event) { eventManager.move(event); }

  canvas.addEventListener('mousedown', event => {
    eventManager.start(event);
    window.addEventListener('mouseup', () => {
      eventManager.stop();
      window.removeEventListener('mouseMove', move);
    }, { once: true });
    window.addEventListener('mousemove', move);
  });
  canvas.addEventListener('dblclick', eventManager.dblClick.bind(eventManager));
}

// Main program starts here
function main(request) {
  const context: WebGLContext = createWebGLContext('c',
    vertexShaderSource, fragmentShaderSource);
  context.clearScreen(0, 0, 0, 0);

  // Tell it to use our program (pair of shaders)
  context.gl.useProgram(context.program);
  // Only now, we can set variables

  // Set the resolution for the vertex shader
  const resolutionUniformLocation = context.gl.getUniformLocation(context.program, 'u_resolution');
  context.gl.uniform2f(resolutionUniformLocation, context.gl.canvas.width, context.gl.canvas.height);

  // Set slopw and intercept
  const slopeLocation = context.gl.getUniformLocation(context.program, 'u_slope');
  const interceptLocation = context.gl.getUniformLocation(context.program, 'u_intercept');
  context.gl.uniform1f(slopeLocation, SLOPE);
  context.gl.uniform1f(interceptLocation, INTERCEPT);

  // Set the WindowWidth and WindowCenter
  const windowWidthLocation = context.gl.getUniformLocation(context.program, 'u_window_width');
  const windowCenterLocation = context.gl.getUniformLocation(context.program, 'u_window_center');

  // Set the pan
  const panLocation = context.gl.getUniformLocation(context.program, 'u_pan');
  context.gl.uniform2f(panLocation, 0, 0);

  // Set the zoom
  const scaleLocation = context.gl.getUniformLocation(context.program, 'u_scale');
  context.gl.uniform2f(scaleLocation, 1.0, 1.0);
  const cursorLocation = context.gl.getUniformLocation(context.program, 'u_cursor');
  context.gl.uniform2f(cursorLocation, context.canvas.width, context.canvas.height);

  const locations = {
    cursorLocation,
    interceptLocation,
    panLocation,
    resolutionUniformLocation,
    scaleLocation,
    slopeLocation,
    windowCenterLocation,
    windowWidthLocation,
  };

  const imageParam = new ImageParam(SLOPE, INTERCEPT, WW, WC, 0, 0, 1.0);
  const annotationMgr = new AnnotationManager();
  const eventManager = new EventManager(context, imageParam, annotationMgr, locations);

  initLocations(context, locations, imageParam, annotationMgr);
  initDragEvents(context.canvas, eventManager);

  // three 2d points makes a triangle
  const positionBuffer = context.createRectangle(0, 0, context.canvas.width, context.canvas.height);
  const positionAttributeLocation = context.bindBufferToAttribute(
    positionBuffer,
    'a_position'
  );

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2; // 2 components per iteration
  const type = context.gl.FLOAT; // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0; // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0; // start at the beginning of the buffer
  context.gl.vertexAttribPointer(
    positionAttributeLocation,
    size,
    type,
    normalize,
    stride,
    offset
  );

  // look up where the texture coordinates need to go.
  const texCoordLocation = context.gl.getAttribLocation(context.program, 'a_texCoord');
  // provide texture coordinates for the rectangle.
  const texCoordBuffer = context.gl.createBuffer();
  context.gl.bindBuffer(context.gl.ARRAY_BUFFER, texCoordBuffer);
  context.gl.bufferData(
    context.gl.ARRAY_BUFFER,
    new Float32Array([
      0.0, 0.0,
      1.0, 0.0,
      0.0, 1.0,
      0.0, 1.0,
      1.0, 0.0,
      1.0, 1.0,
    ]),
    context.gl.STATIC_DRAW
  );
  context.gl.enableVertexAttribArray(texCoordLocation);
  context.gl.vertexAttribPointer(texCoordLocation, 2, context.gl.FLOAT, false, 0, 0);

  // Convert uint16 array to 2*8uint array
  const src = new Uint16Array(request.response);
  const dst = new Uint8Array(request.response.byteLength);
  for (let i = 0; i < request.response.byteLength / 2; ++i) {
    dst[i * 2]     = src[i] & 0xFF;
    dst[i * 2 + 1] = src[i] >> 8;
  }
  // Create a texture.
  const texture = context.gl.createTexture();
  context.gl.bindTexture(context.gl.TEXTURE_2D, texture);
  // Set the parameters so we can render any size image.
  context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_WRAP_S, context.gl.CLAMP_TO_EDGE);
  context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_WRAP_T, context.gl.CLAMP_TO_EDGE);
  context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_MIN_FILTER, context.gl.NEAREST);
  context.gl.texParameteri(context.gl.TEXTURE_2D, context.gl.TEXTURE_MAG_FILTER, context.gl.NEAREST);
  // Upload the image into the texture.
  context.gl.texImage2D(
    context.gl.TEXTURE_2D,
    0,
    context.gl.LUMINANCE_ALPHA,
    context.canvas.width,
    context.canvas.height,
    0,
    context.gl.LUMINANCE_ALPHA,
    context.gl.UNSIGNED_BYTE,
    dst,
  );

  // We draw a rectangle, so 6 vertices
  context.drawScene(6);
}

// Retrieve the image
httpGetAsync('/case1_16.raw').then(request => {
  main(request);
}).catch(err => console.error(`failed to retrieve image: ${err}`));

