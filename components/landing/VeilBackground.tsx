'use client';

import { useEffect, useRef } from 'react';

const VERT = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

// Diamond shimmer — sparse, sharp light catches like a Tiffany solitaire
// rotating slowly under gallery lighting. Platinum-white with the faintest
// champagne warmth. Each sparkle is a tiny 4-point star that breathes in
// and out on its own slow cycle.
const FRAG = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;

// Pseudo-random hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 4-point star shape — sharp cross falloff
float star(vec2 uv, float size) {
  vec2 a = abs(uv);
  // Two crossed spikes
  float spike1 = max(a.x * 8.0, a.y) / size;
  float spike2 = max(a.x, a.y * 8.0) / size;
  float s = min(spike1, spike2);
  // Soft circular bloom underneath
  float bloom = length(uv) / (size * 1.8);
  return exp(-s * s * 3.0) + 0.3 * exp(-bloom * bloom * 6.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 st = vec2(uv.x * aspect, uv.y);

  float shimmer = 0.0;

  // Layer 1: primary sparkles — sparse grid
  {
    float scale = 12.0;
    vec2 grid = floor(st * scale);
    vec2 local = fract(st * scale) - 0.5;

    // Jitter position within cell
    float h = hash(grid);
    float h2 = hash(grid + 100.0);
    vec2 offset = vec2(h - 0.5, h2 - 0.5) * 0.7;
    vec2 p = local - offset;

    // Only ~18% of cells have a sparkle
    float active = step(0.82, hash(grid + 50.0));

    // Slow breathing with unique phase per cell
    float phase = hash(grid + 200.0) * 6.2832;
    float speed = 0.3 + hash(grid + 300.0) * 0.25;
    float breath = sin(u_time * speed + phase);
    // Sharp on/off — only visible at the peak of the sine
    float intensity = smoothstep(0.6, 0.95, breath) * active;

    shimmer += star(p, 0.08) * intensity;
  }

  // Layer 2: smaller accent sparkles — offset grid, even sparser
  {
    float scale = 20.0;
    vec2 shifted = st + vec2(3.7, 1.3);
    vec2 grid = floor(shifted * scale);
    vec2 local = fract(shifted * scale) - 0.5;

    float h = hash(grid + 400.0);
    float h2 = hash(grid + 500.0);
    vec2 offset = vec2(h - 0.5, h2 - 0.5) * 0.6;
    vec2 p = local - offset;

    float active = step(0.88, hash(grid + 600.0));

    float phase = hash(grid + 700.0) * 6.2832;
    float speed = 0.2 + hash(grid + 800.0) * 0.2;
    float breath = sin(u_time * speed + phase);
    float intensity = smoothstep(0.65, 0.97, breath) * active;

    shimmer += star(p, 0.05) * intensity * 0.6;
  }

  // Layer 3: rare large flares — very few, very slow
  {
    float scale = 6.0;
    vec2 shifted = st + vec2(7.1, 4.9);
    vec2 grid = floor(shifted * scale);
    vec2 local = fract(shifted * scale) - 0.5;

    float h = hash(grid + 900.0);
    float h2 = hash(grid + 1000.0);
    vec2 offset = vec2(h - 0.5, h2 - 0.5) * 0.5;
    vec2 p = local - offset;

    // Only ~8% of cells
    float active = step(0.92, hash(grid + 1100.0));

    float phase = hash(grid + 1200.0) * 6.2832;
    float speed = 0.15 + hash(grid + 1300.0) * 0.1;
    float breath = sin(u_time * speed + phase);
    float intensity = smoothstep(0.7, 0.98, breath) * active;

    shimmer += star(p, 0.12) * intensity * 0.4;
  }

  // Color: platinum white with the faintest champagne warmth
  vec3 sparkleColor = vec3(1.0, 0.98, 0.94);

  // Very subtle vignette — keep edges clean
  float vignette = 1.0 - 0.1 * length(uv - 0.5);

  float alpha = clamp(shimmer * vignette, 0.0, 1.0);
  vec3 col = sparkleColor * shimmer * vignette;

  gl_FragColor = vec4(col, alpha * 0.85);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[VeilBackground] Shader error:', gl.getShaderInfoLog(shader));
  }
  return shader;
}

export default function VeilBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const vert = createShader(gl, gl.VERTEX_SHADER, VERT);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vert!);
    gl.attachShader(prog, frag!);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('[VeilBackground] Program error:', gl.getProgramInfoLog(prog));
      return;
    }

    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let raf: number;
    const start = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
