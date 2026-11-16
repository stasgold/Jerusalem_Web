// Grid, frames, polygon maths and deterministic random numbers.
// A point is a two-element array [x, y]: x = metres east, y = metres north of the origin.

export const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
export const mul = (a, s) => [a[0] * s, a[1] * s];
export const neg = (a) => [-a[0], -a[1]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const cross2 = (a, b) => a[0] * b[1] - a[1] * b[0];
export const len = (a) => Math.hypot(a[0], a[1]);
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const norm = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Sum of any number of points. */
export const sum = (...ps) => { let x = 0, y = 0; for (const p of ps) { x += p[0]; y += p[1]; } return [x, y]; };

/** Georeferencing. The origin is the south-west corner of the Herodian Temple Mount enclosure,
 *  taken from the OpenStreetMap outline of the Haram (relation 5862584). */
export const Geo = (() => {
  const originLat = 31.7756683, originLon = 35.2346228;
  const p = originLat * Math.PI / 180;
  const mLat = 111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p);
  const mLon = 111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p) + 0.118 * Math.cos(5 * p);
  return {
    originLat, originLon,
    /** WGS84 degrees to local metres (equirectangular; error < 0.1 m over the 3 km model). */
    local: (lat, lon) => [(lon - originLon) * mLon, (lat - originLat) * mLat],
    latLon: (q) => ({ lat: originLat + q[1] / mLat, lon: originLon + q[0] / mLon }),
  };
})();

/** Length of the cubit used for the Temple (the "royal" cubit of 52.5 cm, as in Ritmeyer 2006). */
export const cubit = 0.525;
export const cu = (c) => c * cubit;

/** A rotated 2D frame, used to enter measurements relative to a wall line. */
export class Frame {
  constructor(origin, u, v) { this.origin = origin; this.u = u; this.v = v; }
  static north(origin, north) { const v = norm(north); return new Frame(origin, [v[1], -v[0]], v); }
  static east(origin, east) { const u = norm(east); return new Frame(origin, u, [-u[1], u[0]]); }
  p(x, y) {
    if (Array.isArray(x)) { y = x[1]; x = x[0]; }
    return [this.origin[0] + this.u[0] * x + this.v[0] * y, this.origin[1] + this.u[1] * x + this.v[1] * y];
  }
  rect(x0, y0, x1, y1) { return [this.p(x0, y0), this.p(x1, y0), this.p(x1, y1), this.p(x0, y1)]; }
  toFrame(q) { const d = sub(q, this.origin); return [dot(d, this.u), dot(d, this.v)]; }
  get angle() { return Math.atan2(this.u[1], this.u[0]); }
}

// ---------------------------------------------------------------------------------------------
// 64-bit integer arithmetic on (hi, lo) pairs of unsigned 32-bit numbers, so the SplitMix64
// generator gives exactly the same sequence as the Swift original.

function mul64(ah, al, bh, bl) {
  const a0 = al & 0xffff, a1 = al >>> 16, b0 = bl & 0xffff, b1 = bl >>> 16;
  const p00 = a0 * b0, p01 = a0 * b1, p10 = a1 * b0, p11 = a1 * b1;
  const mid = (p00 >>> 16) + (p01 & 0xffff) + (p10 & 0xffff);
  const lo = (((mid & 0xffff) << 16) | (p00 & 0xffff)) >>> 0;
  let hi = p11 + Math.floor(p01 / 65536) + Math.floor(p10 / 65536) + Math.floor(mid / 65536);
  hi = (hi + Math.imul(al, bh) + Math.imul(ah, bl)) >>> 0;
  return [hi, lo];
}
function add64(ah, al, bh, bl) {
  const lo = al + bl;
  return [(ah + bh + (lo > 0xffffffff ? 1 : 0)) >>> 0, lo >>> 0];
}
function xorShr(h, l, n) { // z ^ (z >> n), n < 32
  return [(h ^ (h >>> n)) >>> 0, (l ^ ((l >>> n) | (h << (32 - n)))) >>> 0];
}
/** A JavaScript integer (possibly negative) as a 64-bit two's-complement pair. */
export function int64(n) { return [Math.floor(n / 4294967296) >>> 0, n >>> 0]; }

function mix64(h, l) {
  [h, l] = xorShr(h, l, 30);
  [h, l] = mul64(h, l, 0xBF58476D, 0x1CE4E5B9);
  [h, l] = xorShr(h, l, 27);
  [h, l] = mul64(h, l, 0x94D049BB, 0x133111EB);
  return xorShr(h, l, 31);
}
const toUnit = (h, l) => (h * 2097152 + (l >>> 11)) / 9007199254740992; // (z >> 11) / 2^53

/** Deterministic random numbers (SplitMix64), so the generated city is identical on every run.
 *  The seed is a non-negative integer or a [hi, lo] pair. */
export class RNG {
  constructor(seed) {
    const [sh, sl] = Array.isArray(seed) ? seed : int64(seed);
    [this.h, this.l] = add64(sh, sl, 0x9E3779B9, 0x7F4A7C15);
  }
  unit() {
    [this.h, this.l] = add64(this.h, this.l, 0x9E3779B9, 0x7F4A7C15);
    const [h, l] = mix64(this.h, this.l);
    return toUnit(h, l);
  }
  range(a, b) { return a + (b - a) * this.unit(); }
}

/** Seed arithmetic as in the Swift code: a &* m &+ b on 64-bit values. */
export function seedMulAdd(a, m, b) {
  const [ah, al] = Array.isArray(a) ? a : int64(a);
  const [mh, ml] = Array.isArray(m) ? m : int64(m);
  const [bh, bl] = Array.isArray(b) ? b : int64(b);
  const [ph, pl] = mul64(ah, al, mh, ml);
  return add64(ph, pl, bh, bl);
}

/** Smooth value noise in 0...1 for clustering and terrain colour. */
const latticeCache = new Map();
function lattice(i, j, seed) {
  // The 64-bit hash is costly in JavaScript and every lattice point is shared by many samples, so keep them.
  let cache = latticeCache.get(seed);
  if (!cache) { cache = new Map(); latticeCache.set(seed, cache); }
  const key = i * 1048576 + j;
  let v = cache.get(key);
  if (v === undefined) {
    const [kh, kl] = mul64(0, seed >>> 0, 0, 0x9E3779B9);
    const [ah, al] = int64(i * 73856093), [bh, bl] = int64(j * 19349663);
    const [zh, zl] = mix64(...add64((ah ^ bh) >>> 0, (al ^ bl) >>> 0, kh, kl));
    v = toUnit(zh, zl);
    cache.set(key, v);
  }
  return v;
}

export function valueNoise(x, y, seed = 0) {
  const h = (i, j) => lattice(i, j, seed);
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

// ---------------------------------------------------------------------------------------------

export const Poly = {
  /** Signed area: positive when the vertices run counter-clockwise (x east, y north). */
  area(p) {
    let s = 0;
    for (let i = 0; i < p.length; i++) s += cross2(p[i], p[(i + 1) % p.length]);
    return s / 2;
  },
  ccw(p) { return Poly.area(p) < 0 ? p.slice().reverse() : p; },
  centroid(p) {
    if (p.length <= 2) return mul(sum(...p), 1 / Math.max(p.length, 1));
    let cx = 0, cy = 0, a = 0;
    for (let i = 0; i < p.length; i++) {
      const q = p[(i + 1) % p.length];
      const w = cross2(p[i], q);
      cx += (p[i][0] + q[0]) * w; cy += (p[i][1] + q[1]) * w;
      a += w;
    }
    if (Math.abs(a) < 1e-9) return mul(sum(...p), 1 / p.length);
    return [cx / (3 * a), cy / (3 * a)];
  },
  contains(poly, q) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > q[1]) !== (b[1] > q[1]) && q[0] < (b[0] - a[0]) * (q[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  },
  bbox(p) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
    return { min: [x0, y0], max: [x1, y1] };
  },
  circle(c, r, n) {
    const out = [];
    for (let i = 0; i < n; i++) { const t = 2 * Math.PI * i / n; out.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]); }
    return out;
  },
  /** Rectangle of width w (along the rotated x axis) and depth d, rotated by `angle` radians. */
  rect(c, w, d, angle) {
    const ux = [Math.cos(angle), Math.sin(angle)], uy = [-Math.sin(angle), Math.cos(angle)];
    const hx = mul(ux, w / 2), hy = mul(uy, d / 2);
    return [sub(sub(c, hx), hy), sub(add(c, hx), hy), add(add(c, hx), hy), add(sub(c, hx), hy)];
  },
  length(path) {
    let s = 0;
    for (let i = 1; i < path.length; i++) s += dist(path[i - 1], path[i]);
    return s;
  },
  /** Subdivides every segment into pieces no longer than `step`, keeping the original vertices. */
  resample(path, step) {
    if (path.length < 2) return path;
    const out = [path[0]];
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const n = Math.max(1, Math.ceil(dist(a, b) / step));
      for (let k = 1; k <= n; k++) out.push(lerp(a, b, k / n));
    }
    return out;
  },
  /** Point and unit tangent at a distance along the path. */
  along(path, d) {
    let s = d;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const l = dist(a, b);
      if (s <= l || i === path.length - 1) {
        const t = l > 0 ? mul(sub(b, a), 1 / l) : [1, 0];
        return { p: add(a, mul(t, Math.min(Math.max(s, 0), l))), t };
      }
      s -= l;
    }
    return { p: path[0], t: [1, 0] };
  },
  /** Closest point on a path, its tangent and the distance to it. */
  nearest(path, q) {
    let best = { p: path[0], t: [1, 0], d: Infinity };
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const ab = sub(b, a);
      const l2 = dot(ab, ab);
      if (l2 < 1e-12) continue;
      const t = Math.min(Math.max(dot(sub(q, a), ab) / l2, 0), 1);
      const c = add(a, mul(ab, t));
      const d = dist(c, q);
      if (d < best.d) best = { p: c, t: mul(ab, 1 / Math.sqrt(l2)), d };
    }
    return best;
  },
  distanceToPath(q, path) { return Poly.nearest(path, q).d; },
  /** Distance from q to the boundary of a closed polygon. */
  distanceToBoundary(q, poly) { return Poly.nearest([...poly, poly[0]], q).d; },
  /** Ear-clipping triangulation of a simple counter-clockwise polygon. Returns vertex index triples. */
  triangulate(poly) {
    const inTri = (p, a, b, c) => cross2(sub(b, a), sub(p, a)) > 1e-9 && cross2(sub(c, b), sub(p, b)) > 1e-9 && cross2(sub(a, c), sub(p, c)) > 1e-9;
    const idx = poly.map((_, i) => i);
    const out = [];
    while (idx.length > 3) {
      let clipped = false;
      const n = idx.length;
      for (let i = 0; i < n; i++) {
        const i0 = idx[(i + n - 1) % n], i1 = idx[i], i2 = idx[(i + 1) % n];
        const a = poly[i0], b = poly[i1], c = poly[i2];
        if (cross2(sub(b, a), sub(c, b)) <= 1e-9) continue;
        let ear = true;
        for (const j of idx) {
          if (j === i0 || j === i1 || j === i2) continue;
          if (inTri(poly[j], a, b, c)) { ear = false; break; }
        }
        if (ear) { out.push(i0, i1, i2); idx.splice(i, 1); clipped = true; break; }
      }
      if (!clipped) {
        // Degenerate (collinear) vertex: drop the flattest corner and carry on.
        let worst = 0, worstVal = Infinity;
        for (let i = 0; i < n; i++) {
          const a = poly[idx[(i + n - 1) % n]], b = poly[idx[i]], c = poly[idx[(i + 1) % n]];
          const v = Math.abs(cross2(sub(b, a), sub(c, b)));
          if (v < worstVal) { worstVal = v; worst = i; }
        }
        idx.splice(worst, 1);
      }
    }
    if (idx.length === 3) out.push(...idx);
    return out;
  },
  /** Intersection of two circles; returns the solution on the left of the line c1 -> c2. */
  circleIntersection(c1, r1, c2, r2) {
    const d = dist(c1, c2);
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
    const e = mul(sub(c2, c1), 1 / d);
    return add(add(c1, mul(e, a)), mul([-e[1], e[0]], h));
  },
};
