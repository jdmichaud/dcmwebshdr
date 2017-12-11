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
