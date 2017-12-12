// an attribute will receive data from a buffer
attribute vec2 a_position;
uniform vec2 u_resolution;

attribute vec2 a_texCoord;
varying vec2 v_texCoord;

uniform vec2 u_pan;

void main() {
  // Apply pan
  vec2 panned_position = a_position + u_pan;
  // vec2 panned_texCoord = a_texCoord + u_pan;
  vec2 panned_texCoord = a_texCoord;

  // convert the position from pixels to 0.0 to 1.0
  vec2 zeroToOne = panned_position / u_resolution;

  // convert from 0->1 to 0->2
  vec2 zeroToTwo = zeroToOne * 2.0;

  // convert from 0->2 to -1->+1 (clipspace)
  vec2 clipSpace = zeroToTwo - 1.0;

  // gl_Position is a special variable a vertex shader
  // is responsible for setting
  gl_Position = vec4(clipSpace, 0, 1);
  // pass the texCoord to the fragment shader
  // The GPU will interpolate this value between points
  v_texCoord = panned_texCoord;
}
