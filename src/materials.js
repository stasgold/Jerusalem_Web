// All surface materials. Textures and normal maps are generated in code; the only images loaded are the
// door textures made from a photograph (public/textures).
import * as THREE from 'three';
import { RNG } from './geo.js';
import { Mats, confidenceList } from './model.js';
import { Profiles, makeMasonry, tileOf } from './masonry.js';

// Aerial perspective: distant surfaces fade towards the horizon colour, as 1 - exp(-d * density),
// at most 90%. Patched into three's fog so every lit material gets it.
THREE.ShaderChunk.fog_fragment = `
#ifdef USE_FOG
  #ifdef FOG_EXP2
    float fogFactor = (1.0 - exp(-fogDensity * vFogDepth)) * 0.9;
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;

const rgb = (r, g, b) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);

function dataTexture(px, size, { srgb = false, tile = 1, clamp = false } = {}) {
  const t = new THREE.DataTexture(px, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.repeat.set(1 / tile, 1 / tile);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

/** Tangent-space normal map from the red channel read as height, wrapping at the edges. */
function normalMap(px, size, strength) {
  const out = new Uint8Array(size * size * 4);
  const h = (x, y) => px[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const l = Math.sqrt(dx * dx + dy * dy + 1);
      const i = (y * size + x) * 4;
      out[i] = (-dx / l * 0.5 + 0.5) * 255;
      out[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      out[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      out[i + 3] = 255;
    }
  }
  return out;
}

const c255 = (v) => Math.min(Math.max(v, 0), 1) * 255;

/** Seamlessly tiling fractal noise around a base colour, with a matching normal map. */
function speckle(size, base, spread, seed, bump) {
  const rng = new RNG(seed);
  const field = new Float64Array(size * size);
  let total = 0;
  for (const [cells, amp] of [[4, 0.45], [8, 0.3], [16, 0.2], [32, 0.14], [64, 0.1]]) {
    if (cells >= size) continue;
    const lattice = new Float64Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng.unit();
    total += amp;
    for (let y = 0; y < size; y++) {
      const fy = y / size * cells;
      const y0 = Math.floor(fy) % cells, y1 = (y0 + 1) % cells;
      const ty = fy - Math.floor(fy), sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = x / size * cells;
        const x0 = Math.floor(fx) % cells, x1 = (x0 + 1) % cells;
        const tx = fx - Math.floor(fx), sx = tx * tx * (3 - 2 * tx);
        const top = lattice[y0 * cells + x0] + (lattice[y0 * cells + x1] - lattice[y0 * cells + x0]) * sx;
        const bot = lattice[y1 * cells + x0] + (lattice[y1 * cells + x1] - lattice[y1 * cells + x0]) * sx;
        field[y * size + x] += amp * (top + (bot - top) * sy);
      }
    }
  }
  const pixels = new Uint8Array(size * size * 4), height = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const f = field[i] / total;
    const v = (f - 0.5) * 2.4 * spread + rng.range(-0.012, 0.012);
    pixels[i * 4] = c255(base[0] + v); pixels[i * 4 + 1] = c255(base[1] + v); pixels[i * 4 + 2] = c255(base[2] + v * 0.9); pixels[i * 4 + 3] = 255;
    height[i * 4] = c255(f + rng.range(-0.03, 0.03));
  }
  return { size, color: pixels, normal: normalMap(height, size, bump) };
}

/** Draws twice on a canvas (colour, then height) and returns both bitmaps. */
function drawn(size, draw, strength) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const grab = (height) => {
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, size, size);
    draw(ctx, height);
    return new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer.slice(0));
  };
  const color = grab(false);
  const height = grab(true);
  return { size, color, normal: normalMap(height, size, strength) };
}
const fill = (ctx, c, a = 1) => { ctx.globalAlpha = a; ctx.fillStyle = `rgb(${c255(c[0])},${c255(c[1])},${c255(c[2])})`; };
const gray = (ctx, v, a = 1) => fill(ctx, [v, v, v], a);
function grain(ctx, size, rng, count, strength) {
  for (let i = 0; i < count; i++) {
    const dark = rng.unit() < 0.5;
    fill(ctx, dark ? [0.25, 0.2, 0.15] : [1, 1, 1], rng.range(0.02, strength));
    const s = rng.range(1, 5);
    ctx.fillRect(rng.range(0, size), rng.range(0, size), s, s);
  }
}
const ellipse = (ctx, x, y, w, h) => { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); };

function paving(seed) {
  const size = 256;
  return drawn(size, (ctx, height) => {
    const rng = new RNG(seed);
    if (height) gray(ctx, 0.15); else fill(ctx, [0.46, 0.42, 0.35]);
    ctx.fillRect(0, 0, size, size);
    const rows = 4, h = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rng.range(0, h);
      while (x < size) {
        const w = h * rng.range(0.9, 1.9);
        const v = rng.range(-0.06, 0.05);
        if (height) gray(ctx, 0.72 + v * 1.5); else fill(ctx, [0.75 + v, 0.71 + v, 0.62 + v]);
        ctx.fillRect(x + 1.5, r * h + 1.5, w - 3, h - 3);
        x += w;
      }
    }
    grain(ctx, size, rng, 3500, height ? 0.10 : 0.08);
  }, 3.5);
}

/** Plank door with bronze bands and studs. */
function door(seed) {
  const size = 256;
  return drawn(size, (ctx, height) => {
    const rng = new RNG(seed);
    if (height) gray(ctx, 0.15); else fill(ctx, [0.08, 0.05, 0.03]);
    ctx.fillRect(0, 0, size, size);
    const planks = 8, w = size / planks;
    for (let i = 0; i < planks; i++) {
      const v = rng.range(-0.05, 0.05);
      if (height) gray(ctx, 0.5 + v); else fill(ctx, [0.34 + v, 0.22 + v, 0.12 + v]);
      ctx.fillRect(i * w + 1.5, 0, w - 3, size);
      for (let k = 0; k < 5; k++) {
        if (height) gray(ctx, 0.4, 0.5); else fill(ctx, [0.18, 0.11, 0.06], 0.35);
        ctx.fillRect(i * w + rng.range(3, w - 4), 0, 1, size);
      }
    }
    for (const by of [0.18, 0.68]) {
      const y = by * size;
      if (height) gray(ctx, 0.78); else fill(ctx, [0.50, 0.33, 0.15]);
      ctx.fillRect(0, y, size, 16);
      for (let i = 0; i < planks * 2; i++) {
        if (height) gray(ctx, 1.0); else fill(ctx, [0.72, 0.52, 0.26]);
        ellipse(ctx, (i + 0.5) * w / 2 - 3.5, y + 4.5, 7, 7);
      }
    }
  }, 4);
}

/** Coffered gilded door panels. */
function goldPanels() {
  const size = 256;
  return drawn(size, (ctx, height) => {
    if (height) gray(ctx, 0.75); else fill(ctx, [1.0, 0.80, 0.36]);
    ctx.fillRect(0, 0, size, size);
    const cols = 2, rows = 3, w = size / cols, h = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * w + 10, y = r * h + 10, rw = w - 20, rh = h - 20;
        if (height) gray(ctx, 0.35); else fill(ctx, [0.92, 0.68, 0.26]);
        ctx.fillRect(x, y, rw, rh);
        if (height) gray(ctx, 0.6); else fill(ctx, [1.0, 0.84, 0.42]);
        ctx.fillRect(x + 12, y + 12, rw - 24, rh - 24);
        if (height) gray(ctx, 0.95); else fill(ctx, [1.0, 0.90, 0.55]);
        ellipse(ctx, x + rw / 2 - 7, y + rh / 2 - 7, 14, 14);
      }
    }
    // The seam between the two leaves.
    if (height) gray(ctx, 0.1); else fill(ctx, [0.45, 0.30, 0.08]);
    ctx.fillRect(size / 2 - 1.5, 0, 3, size);
  }, 4);
}

/** Small windows and doors cut into house plaster from the wall coordinates (metres from the ground). */
function addWindows(m, uvScale) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uvScale = { value: uvScale };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uvScale;
float h2_(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
float wd_ = 0.0;
{
  vec2 uv_ = vMapUv * uvScale;
  float h_ = uv_.y;
  if (h_ > 0.15 && h_ < 6.0) {
    float cw_ = 3.6;
    float cx_ = floor(uv_.x / cw_);
    float fx_ = uv_.x - cx_ * cw_;
    float st_ = floor(h_ / 3.0);
    float y_ = h_ - st_ * 3.0;
    float r_ = h2_(vec2(cx_, st_ + 7.0));
    float win_ = step(1.5, fx_) * step(fx_, 2.05) * step(1.7, y_) * step(y_, 2.45) * step(0.45, r_);
    float door_ = (1.0 - step(0.5, st_)) * step(1.2, fx_) * step(fx_, 2.25) * step(y_, 2.05) * step(r_, 0.25);
    float sill_ = step(1.4, fx_) * step(fx_, 2.15) * step(1.58, y_) * step(y_, 1.7) * step(0.45, r_);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.12, sill_);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.03, 0.028), win_ * 0.95);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.10, 0.06) * (0.8 + 0.4 * fract(fx_ * 5.0)), door_ * 0.95);
    wd_ = max(win_, door_);
  }
}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, 0.95, wd_);`);
  };
  m.customProgramCacheKey = () => 'windows';
}

/** The masonry sets the materials need, as [profile, seed]. */
const MASONRY = { ashlar: ['westernWall', 1], towerAshlar: ['tower', 21], cityWall: ['cityWall', 22], limestone: ['dressed', 2], marbleAshlar: ['marbleAshlar', 41] };

// Generated sets are kept in IndexedDB so a second visit skips the work. Bump the version when the generator changes.
const CACHE_DB = 'jerusalem-web', CACHE_STORE = 'masonry', CACHE_VERSION = 1;
function openCache() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(CACHE_DB, CACHE_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (db.objectStoreNames.contains(CACHE_STORE)) db.deleteObjectStore(CACHE_STORE);
        db.createObjectStore(CACHE_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch { resolve(null); }
  });
}
const idb = (db, mode, fn) => new Promise((resolve) => {
  try {
    const tx = db.transaction(CACHE_STORE, mode);
    const req = fn(tx.objectStore(CACHE_STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = tx.onabort = () => resolve(undefined);
  } catch { resolve(undefined); }
});

async function generateMasonry() {
  const db = await openCache();
  if (db) {
    const cached = await idb(db, 'readonly', (s) => s.getAll());
    if (cached && cached.length === Object.keys(MASONRY).length) return cached;
  }
  const sets = await generateMasonryNow();
  if (db) idb(db, 'readwrite', (s) => { for (const t of sets) s.put(t, `${t.name}:${t.seed}`); return null; });
  return sets;
}

/** Generates every masonry set in parallel in module workers, or on the main thread if workers fail. */
async function generateMasonryNow() {
  const jobs = Object.values(MASONRY);
  try {
    return await Promise.all(jobs.map(([name, seed]) => new Promise((resolve, reject) => {
      const w = new Worker(new URL('./masonryWorker.js', import.meta.url), { type: 'module' });
      w.onmessage = (e) => { resolve(e.data); w.terminate(); };
      w.onerror = (e) => { reject(e); w.terminate(); };
      w.postMessage({ name, seed });
    })));
  } catch (err) {
    console.warn('Masonry workers unavailable, generating on the main thread', err);
    return jobs.map(([name, seed]) => ({ name, seed, ...makeMasonry(Profiles[name], seed) }));
  }
}

export class MaterialLibrary {
  static async create(renderer) {
    const sets = await generateMasonry();
    return new MaterialLibrary(renderer, Object.fromEntries(sets.map((s) => [`${s.name}:${s.seed}`, s])));
  }

  constructor(renderer, masonrySets = {}) {
    this.masonrySets = masonrySets;
    this.maxAniso = renderer.capabilities.getMaxAnisotropy();
    this.base = {};
    this.confidence = {};
    this.highlightCache = new Map();
    const loader = new THREE.TextureLoader();
    for (const m of Mats) this.base[m] = this.make(m, loader);
    for (const c of confidenceList) {
      this.confidence[c.key] = new THREE.MeshStandardMaterial({ color: rgb(...c.rgb), roughness: 0.75, metalness: 0 });
    }
    const ground = speckle(512, [0.82, 0.78, 0.70], 0.10, 91, 3.0);
    this.terrain = new THREE.MeshStandardMaterial({
      map: this.tex(ground.color, ground.size, { srgb: true, tile: 48 }),
      normalMap: this.tex(ground.normal, ground.size, { tile: 48 }),
      normalScale: new THREE.Vector2(1, -1),
      roughness: 0.95, metalness: 0, vertexColors: true,
    });
  }

  tex(px, size, opts) {
    const t = dataTexture(px, size, opts);
    t.anisotropy = Math.min(8, this.maxAniso);
    return t;
  }

  textured(m, set, tile, rough, bump = 1) {
    m.map = this.tex(set.color, set.size, { srgb: true, tile });
    m.normalMap = this.tex(set.normal, set.size, { tile });
    m.normalScale.set(bump, -bump);
    m.roughness = rough;
  }

  masonry(m, name, seed) {
    const profile = Profiles[name];
    const t = this.masonrySets[`${name}:${seed}`] ?? makeMasonry(profile, seed);
    const tile = tileOf(profile);
    m.map = this.tex(t.color, t.size, { srgb: true, tile });
    m.normalMap = this.tex(t.normal, t.size, { tile });
    m.normalScale.set(1, -1);
    m.roughnessMap = this.tex(t.roughness, t.size, { tile });
    m.roughness = 1;
    m.aoMap = this.tex(t.occlusion, t.size, { tile });
    m.aoMapIntensity = 1;
  }

  make(kind, loader) {
    const m = new THREE.MeshStandardMaterial({ metalness: 0, roughness: 0.8, vertexColors: true });
    m.name = kind;
    switch (kind) {
      case 'ashlar': case 'towerAshlar': case 'cityWall': case 'limestone': case 'marbleAshlar':
        this.masonry(m, ...MASONRY[kind]);
        break;
      case 'plaster':
        this.textured(m, speckle(256, [0.80, 0.77, 0.71], 0.08, 3, 2.2), 5, 0.92);
        addWindows(m, 5);
        break;
      case 'roof': this.textured(m, speckle(256, [0.68, 0.64, 0.57], 0.08, 4, 2.5), 5, 0.96); break;
      case 'paving': this.textured(m, paving(5), 4, 0.78); break;
      case 'marble': this.textured(m, speckle(256, [0.86, 0.85, 0.81], 0.035, 6, 0.6), 6, 0.36); break;
      case 'gold':
        m.color = rgb(1.0, 0.78, 0.34); m.metalness = 0.8; m.roughness = 0.3; m.emissive = rgb(0.16, 0.10, 0.02);
        break;
      case 'goldDoor': this.textured(m, goldPanels(), 2.6, 0.3, 1.4); m.metalness = 1.0; break;
      case 'bronze': m.color = rgb(0.72, 0.45, 0.20); m.metalness = 1.0; m.roughness = 0.42; break;
      case 'door': this.textured(m, door(13), 2.4, 0.7, 1.6); break;
      case 'tile': this.textured(m, speckle(256, [0.56, 0.30, 0.20], 0.10, 31, 3.0), 2.5, 0.8); break;
      case 'timber': this.textured(m, speckle(128, [0.40, 0.29, 0.19], 0.08, 7, 1.5), 3, 0.85); break;
      case 'rock': this.textured(m, speckle(256, [0.74, 0.69, 0.60], 0.12, 8, 4), 8, 0.95); break;
      case 'water': m.color = rgb(0.05, 0.16, 0.17); m.roughness = 0.06; m.vertexColors = false; break;
      case 'dark': m.color = rgb(0.03, 0.025, 0.02); m.roughness = 1.0; break;
      case 'foliage': m.color = rgb(0.27, 0.36, 0.20); m.roughness = 0.9; break;
      case 'bronzeDoor':
        // Corinthian bronze (Middot 2:3): the panelled door texture, darkened to aged bronze.
        this.textured(m, goldPanels(), 2.6, 0.45, 1.8);
        m.map = null; m.color = rgb(0.40, 0.38, 0.33); m.metalness = 0.7;
        break;
      case 'sanctuaryDoor': case 'nicanorDoor': case 'nicanorSideDoor': {
        // Textures made from a photograph of panelled gilt-bronze doors, mapped once across each door by the `panel` shape.
        const gold = kind === 'sanctuaryDoor';
        const name = gold ? 'door-gold' : kind === 'nicanorDoor' ? 'door-bronze' : 'door-bronze-tall';
        const load = (file, srgb) => {
          const t = loader.load(`public/textures/${file}.jpg`);
          t.flipY = false;
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.anisotropy = Math.min(8, this.maxAniso);
          if (srgb) t.colorSpace = THREE.SRGBColorSpace;
          return t;
        };
        m.map = load(name, true);
        m.normalMap = load(name + '-normal', false);
        m.normalScale.set(1.4, -1.4);
        m.metalness = gold ? 0.9 : 0.7;
        m.roughness = gold ? 0.32 : 0.45;
        m.vertexColors = false;
        break;
      }
      case 'recess': m.color = rgb(0.34, 0.31, 0.27); m.roughness = 0.9; break;
      case 'whitewash': this.textured(m, speckle(128, [0.94, 0.93, 0.89], 0.04, 9, 1.2), 4, 0.9); break;
    }
    return m;
  }

  /** A copy of a material glowing with the selection colour. */
  highlighted(m) {
    let c = this.highlightCache.get(m);
    if (!c) {
      c = m.clone();
      c.emissive = rgb(0.55, 0.30, 0.02);
      c.onBeforeCompile = m.onBeforeCompile;
      if (m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) c.customProgramCacheKey = m.customProgramCacheKey;
      this.highlightCache.set(m, c);
    }
    return c;
  }
}

// ---------------------------------------------------------------------------------------------
// Sky dome: atmosphere gradient, sun disc and glow, drifting clouds lit from the sun's side, stars at night.

export function makeSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      zenithColor: { value: new THREE.Vector3() }, horizonColor: { value: new THREE.Vector3() },
      sunColor: { value: new THREE.Vector3() }, cloudLit: { value: new THREE.Vector3() }, cloudDark: { value: new THREE.Vector3() },
      cloudCover: { value: 0.42 }, starAmount: { value: 0 }, time: { value: 0 },
    },
    vertexShader: `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  gl_Position.z = gl_Position.w; // always at the far plane
}`,
    fragmentShader: `
uniform vec3 sunDir, zenithColor, horizonColor, sunColor, cloudLit, cloudDark;
uniform float cloudCover, starAmount, time;
varying vec3 vWorld;
float H2(vec2 v) { return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(H2(i), H2(i + vec2(1.0, 0.0)), f.x), mix(H2(i + vec2(0.0, 1.0)), H2(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 q) {
  float a = 0.5, s = 0.0;
  s += a * vnoise(q); q = q * 2.03 + vec2(11.3, 7.1); a *= 0.5;
  s += a * vnoise(q); q = q * 2.01 + vec2(3.7, 19.2); a *= 0.5;
  s += a * vnoise(q); q = q * 2.02 + vec2(5.1, 2.9); a *= 0.5;
  s += a * vnoise(q); q = q * 2.04 + vec2(8.3, 13.7); a *= 0.5;
  s += a * vnoise(q);
  return s / 0.96875;
}
void main() {
  vec3 dir = normalize(vWorld - cameraPosition);
  float up = max(dir.y, 0.0);
  vec3 sky = mix(horizonColor, zenithColor, pow(up, 0.42));
  float sd = max(dot(dir, sunDir), 0.0);
  float low = 1.0 - smoothstep(0.0, 0.35, up);
  sky += sunColor * (pow(sd, 6.0) * 0.10 * low + pow(sd, 48.0) * 0.22 + pow(sd, 700.0) * 0.8);
  sky += sunColor * smoothstep(0.99985, 0.99995, sd) * 14.0;
  if (starAmount > 0.01 && dir.y > 0.0) {
    vec2 sg = floor(dir.xz / (0.35 + dir.y) * 260.0);
    sky += vec3(0.9, 0.95, 1.0) * step(0.9975, H2(sg)) * starAmount * (0.4 + 0.6 * H2(sg + 3.0));
  }
  if (dir.y > 0.012) {
    vec2 cp = dir.xz / (dir.y + 0.11) * 1.15 + vec2(time * 0.006, time * 0.0022);
    float c1 = fbm(cp);
    float c2 = fbm(cp * 2.7 + vec2(4.0, 1.0));
    float dens = c1 * 0.78 + c2 * 0.22;
    float cov = smoothstep(1.0 - cloudCover, 1.0 - cloudCover + 0.22, dens);
    vec2 ld = normalize(sunDir.xz + vec2(0.0001, 0.0)) * 0.16;
    float c3 = fbm(cp + ld);
    float lit = clamp(0.62 + (dens - c3) * 3.2 - (dens - (1.0 - cloudCover)) * 0.9, 0.0, 1.0);
    vec3 ccol = mix(cloudDark, cloudLit, lit) + sunColor * pow(sd, 10.0) * 0.25;
    float fade = smoothstep(0.012, 0.16, dir.y);
    ccol = mix(horizonColor, ccol, 0.35 + 0.65 * fade);
    sky = mix(sky, ccol, cov * fade * 0.96);
  }
  if (dir.y <= 0.0) sky = mix(horizonColor, horizonColor * vec3(0.78, 0.72, 0.62), clamp(-dir.y * 9.0, 0.0, 1.0));
  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
}
