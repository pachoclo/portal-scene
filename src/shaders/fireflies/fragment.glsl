uniform float uTime;

void main() {
  float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
  float strength = (0.05 / distanceToCenter) - 0.05 * 2.0;

  gl_FragColor = vec4(0.7, 0.7, 0.0, strength  * (cos(uTime) + 1.7));
}