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
  float level = color[0];
  float window_center = u_window_center / 65535.0;
  float window_width = u_window_width / 65535.0;
  // Slope & intercept
  level = u_slope * level + u_intercept;
  // WW/WC
  level = (level - (window_center - 0.5)) / (window_width) + 0.5;
  clamp(level, 0.0, 1.0);
  // gl_FragColor is a special variable a fragment shader is responsible
  // for setting
  gl_FragColor = vec4(level, level, level, 1.0);
}
