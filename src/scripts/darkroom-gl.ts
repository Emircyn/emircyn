import type { Frame } from "./darkroom";

/* ---------------------------------------------------------------------------
   The room in WebGL. Raw WebGL 1, two passes, no library.

   Geometry is not decided here. darkroom.ts hands over each card's place on
   the cylinder and the same perspective the CSS uses, so the painted card
   lands on the real one. What this adds:

     the floor   a grid on an endless floor, found per pixel by casting a ray
                 from the eye, so the lines thin and fog with distance exactly
                 as they would in a room; and the crimson thread, drawn on the
                 floor where the cylinder of cards meets it
     the cards   each one wrapped round the cylinder vertex by vertex (CSS can
                 only turn a flat plane), rippling like a flag when the wall
                 moves, with real rounded corners and a shaded foot
--------------------------------------------------------------------------- */

// Shared uniforms must agree on precision in both stages, so the fragment
// stage asks for highp where it exists. Where it doesn't, the link fails and
// the room simply stays on its DOM cards.
const PREC = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif`;

const CARD_VERT = `
attribute vec2 aUv;
uniform vec2 uRes;
uniform vec2 uO;
uniform float uP;
uniform float uApex;
uniform float uR;
uniform float uS;
uniform float uTop;
uniform float uW;
uniform float uH;
uniform float uBend;
uniform float uTime;
uniform float uPhase;
varying vec2 vUv;
varying float vLight;

void main() {
  vUv = aUv;
  // Arc position of this vertex, and the angle it puts it at.
  float th = (uS + (aUv.x - 0.5) * uW) / uR;

  // The flag: speed bows the card out of the wall and sends a wave across it,
  // its far corners lifting most. At rest it still breathes a little.
  float bow = sin(aUv.x * 3.14159);
  float wave = sin(aUv.x * 6.28318 + aUv.y * 1.6 - uBend * 2.0);
  float d = uBend * uW * (0.2 * bow * (0.4 + 0.6 * aUv.y) + 0.07 * wave);
  d += sin(aUv.x * 6.28318 + uTime * 1.1 + uPhase) * uW * 0.004;
  float lift = uBend * uH * 0.16 * (aUv.x - 0.5) * 2.0 * (1.0 - aUv.y);

  float r = uR + d;
  vec3 p = vec3(uApex + r * sin(th), uTop + aUv.y * uH - abs(lift), -uR + r * cos(th));

  // Light falls off as the wall turns away, and rises where the card bows out.
  vLight = 1.0 - min(abs(th), 1.2) * 0.32 + (d / max(uW, 1.0)) * 1.4;

  vec2 s = uO + (p.xy - uO) * (uP / (uP - p.z));
  gl_Position = vec4(s.x / uRes.x * 2.0 - 1.0, 1.0 - s.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const CARD_FRAG = `${PREC}
uniform sampler2D uTex;
uniform vec2 uTexSize;
uniform float uW;
uniform float uH;
uniform float uRad;
uniform float uAlpha;
uniform float uFocus;
uniform float uReady;
varying vec2 vUv;
varying float vLight;

float box(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 size = vec2(uW, uH);
  vec2 px = vUv * size;
  // Rounded corners, antialiased over about a pixel.
  float edge = smoothstep(0.8, -0.8, box(px - size * 0.5, size * 0.5, uRad));

  // object-fit: cover, anchored to the top, like the DOM image.
  float pa = uW / uH;
  float ta = uTexSize.x / max(uTexSize.y, 1.0);
  vec2 uv = vUv;
  if (ta > pa) uv.x = 0.5 + (vUv.x - 0.5) * pa / ta;
  else uv.y = vUv.y * ta / pa;
  vec3 col = mix(vec3(0.082, 0.075, 0.075), texture2D(uTex, uv).rgb, uReady);

  // The same density the DOM card has at its foot, under the name.
  float foot = smoothstep(0.45, 1.0, vUv.y);
  col = mix(col, vec3(0.043, 0.039, 0.039), foot * 0.86);

  // Cards out of focus sit back in the dark.
  col *= clamp(vLight, 0.4, 1.25) * mix(0.55, 1.0, uFocus);

  float a = edge * uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;

const FLOOR_VERT = `
attribute vec2 aPos;
uniform vec2 uRes;
varying vec2 vPos;
void main() {
  vPos = vec2((aPos.x * 0.5 + 0.5) * uRes.x, (0.5 - aPos.y * 0.5) * uRes.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// Line widths come from screen-space derivatives: a floor seen at a grazing
// angle covers far more depth than width per pixel, and a width taken from
// one axis alone breaks thin lines into dashes.
const FLOOR_FRAG = `#extension GL_OES_standard_derivatives : enable
${PREC}
uniform vec2 uO;
uniform float uP;
uniform float uFloor;
uniform float uApex;
uniform float uR;
varying vec2 vPos;

void main() {
  float dy = vPos.y - uO.y;
  if (dy <= 0.5) discard;
  // Where the ray from the eye through this pixel meets the floor.
  float t = (uFloor - uO.y) / dy;
  if (t <= 0.0) discard;
  float wx = uO.x + t * (vPos.x - uO.x);
  float wz = uP - t * uP;

  float cell = 110.0;
  vec2 w = vec2(wx, wz) / cell;
  vec2 g = abs(fract(w - 0.5) - 0.5) / max(fwidth(w), vec2(1e-4));
  float grid = 1.0 - min(min(g.x, g.y), 1.0);
  float fog = exp(-max(0.0, -wz) / 5200.0) * smoothstep(0.0, 40.0, dy);

  // The thread: the arc where the wall of cards stands on the floor.
  vec2 rel = vec2(wx - uApex, wz + uR);
  float ring = length(rel) - uR;
  float ang = abs(atan(rel.x, rel.y));
  float thread = (1.0 - min(abs(ring) / max(fwidth(ring) * 1.4, 1e-4), 1.0)) * (1.0 - smoothstep(0.6, 1.05, ang));

  vec3 col = vec3(0.945, 0.945, 0.937) * grid * 0.16;
  float a = grid * 0.16;
  col = mix(col, vec3(1.0, 0.196, 0.278), thread);
  a = max(a, thread * 0.9);
  a *= fog;
  gl_FragColor = vec4(col * fog, a);
}`;

const SEG_X = 40;
const SEG_Y = 14;

type Tex = { tex: WebGLTexture; w: number; h: number; ready: boolean };

export function createRenderer(canvas: HTMLCanvasElement, images: (HTMLImageElement | null)[]) {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "low-power" });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  const program = (vs: string, fs: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    const u: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)!;
      u[info.name] = gl.getUniformLocation(p, info.name);
    }
    return { p, u };
  };
  // Without derivatives the floor is left out; the cards do not need them.
  const hasDerivatives = !!gl.getExtension("OES_standard_derivatives");
  const card = program(CARD_VERT, CARD_FRAG);
  const floor = hasDerivatives ? program(FLOOR_VERT, FLOOR_FRAG) : null;

  // One grid for every card: positions come from the uniforms.
  const uvs: number[] = [];
  for (let y = 0; y <= SEG_Y; y++) for (let x = 0; x <= SEG_X; x++) uvs.push(x / SEG_X, y / SEG_Y);
  const idx: number[] = [];
  for (let y = 0; y < SEG_Y; y++)
    for (let x = 0; x < SEG_X; x++) {
      const a = y * (SEG_X + 1) + x;
      const b = a + SEG_X + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);
  const idxBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  // One triangle that covers the screen, for the floor.
  const triBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aUv = gl.getAttribLocation(card.p, "aUv");
  const aPos = floor ? gl.getAttribLocation(floor.p, "aPos") : -1;

  // Textures come from the images the page already loaded: no second download.
  const texs: Tex[] = images.map((img) => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([21, 19, 19, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const t: Tex = { tex, w: 16, h: 10, ready: false };
    const upload = () => {
      if (!img) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      t.w = img.naturalWidth;
      t.h = img.naturalHeight;
      t.ready = true;
    };
    if (img?.complete && img.naturalWidth) upload();
    else img?.addEventListener("load", upload, { once: true });
    return t;
  });

  let ready = 0;

  const resize = (w: number, h: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, w < 768 ? 1.5 : 1.75);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const draw = (f: Frame) => {
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    ready = Math.min(1, ready + 0.06);

    if (floor && f.floor > f.oy) {
      gl.useProgram(floor.p);
      gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      const u = floor.u;
      gl.uniform2f(u.uRes, f.width, f.height);
      gl.uniform2f(u.uO, f.ox, f.oy);
      gl.uniform1f(u.uP, f.persp);
      gl.uniform1f(u.uFloor, f.floor);
      gl.uniform1f(u.uApex, f.apex);
      gl.uniform1f(u.uR, f.radius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(aPos);
    }

    gl.useProgram(card.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);
    const u = card.u;
    gl.uniform2f(u.uRes, f.width, f.height);
    gl.uniform2f(u.uO, f.ox, f.oy);
    gl.uniform1f(u.uP, f.persp);
    gl.uniform1f(u.uApex, f.apex);
    gl.uniform1f(u.uR, f.radius);
    gl.uniform1f(u.uBend, f.bend);
    gl.uniform1f(u.uTime, f.time);
    gl.uniform1f(u.uRad, f.radiusPx);
    gl.uniform1i(u.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);

    // Back to front: the cards turned furthest away first.
    const order = f.cards.map((_, i) => i).sort((a, b) => Math.abs(f.cards[b].s) - Math.abs(f.cards[a].s));
    for (const i of order) {
      const c = f.cards[i];
      if (c.alpha < 0.01) continue;
      const t = texs[i];
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      gl.uniform2f(u.uTexSize, t.w, t.h);
      gl.uniform1f(u.uReady, t.ready ? ready : 0);
      gl.uniform1f(u.uS, c.s);
      gl.uniform1f(u.uTop, c.top + f.offY);
      gl.uniform1f(u.uW, c.w);
      gl.uniform1f(u.uH, c.h);
      gl.uniform1f(u.uPhase, c.phase);
      gl.uniform1f(u.uAlpha, c.alpha);
      gl.uniform1f(u.uFocus, c.focus);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
  };

  canvas.addEventListener("webglcontextlost", (e) => e.preventDefault());
  // Leaving the page: give the GPU memory back now rather than at GC, so a few
  // page changes never pile up contexts until the browser drops the oldest.
  const dispose = () => {
    texs.forEach((t) => gl.deleteTexture(t.tex));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  return { draw, resize, dispose };
}
