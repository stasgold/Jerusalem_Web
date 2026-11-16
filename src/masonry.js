// Wall masonry measured from photographs, and the physically based texture set generated from it.
//
// Colours come from Scripts/analyze_walls.py in the original project, which samples the stone faces and
// joints in the photographs listed in docs/PHOTO-SOURCES.md. Block proportions are kept as the measured
// list, so the texture reproduces the real mix of long and short stones.
import { RNG } from './geo.js';

const towerRatios = [1.1, 1.74, 1.15, 0.63, 0.67, 1.04, 0.96, 1.04, 2.0, 1.6, 1.37, 1.0, 2.6, 2.5, 1.0, 1.5, 1.2, 2.0];

/** courseHeight: mean course (m); courses per tile; courseFactors: relative course heights; ratios: block length / course
 *  height, one per measured block; palette: face colours (sRGB); joint colour; jointWidth, margin (m); boss, wear 0...1. */
export const Profiles = {
  /** Herodian enclosure masonry, as at the Western Wall: 108 blocks measured in six Herodian courses. */
  westernWall: {
    courseHeight: 1.05, courses: 6, courseFactors: [1.0, 0.86, 1.02, 1.0, 0.9, 0.99],
    ratios: [0.87, 1.01, 0.9, 0.8, 0.98, 1.0, 0.65, 0.93, 0.87, 0.84, 0.72, 0.55, 1.08, 0.73, 0.75, 0.71, 0.99, 0.86, 0.88, 0.83, 1.12, 1.65, 0.96, 1.52, 0.73, 0.62, 0.63, 0.75, 0.89, 1.23, 0.7, 1.1, 1.35, 0.69, 1.35, 1.15, 2.15, 2.01, 1.0, 0.66, 1.52, 0.62, 0.68, 1.09, 0.6, 1.05, 0.74, 0.79, 0.99, 0.8, 0.82, 1.01, 0.71, 0.52, 0.85, 0.87, 1.13, 0.54, 0.58, 2.31, 0.92, 2.04, 0.81, 0.52, 1.06, 0.71, 0.64, 0.86, 1.27, 1.17, 0.76, 1.73, 1.45, 1.34, 0.76, 0.84, 1.17, 0.89, 1.07, 0.96, 0.99, 1.11, 1.4, 1.65, 1.13, 1.23, 1.09, 1.08, 1.23, 1.96, 0.52, 2.05, 0.71, 0.54, 0.51, 1.2, 0.54, 0.51, 1.06, 1.49, 1.56, 0.77, 0.59, 1.65, 1.68, 1.51, 0.56, 1.73],
    palette: [[0.651, 0.618, 0.549], [0.620, 0.570, 0.498], [0.691, 0.642, 0.566], [0.657, 0.613, 0.534], [0.702, 0.660, 0.591], [0.713, 0.641, 0.555], [0.722, 0.671, 0.599], [0.728, 0.669, 0.580], [0.740, 0.687, 0.611], [0.738, 0.690, 0.602], [0.759, 0.695, 0.614], [0.752, 0.707, 0.613], [0.755, 0.709, 0.640], [0.784, 0.716, 0.615], [0.768, 0.717, 0.639], [0.788, 0.727, 0.636]],
    joint: [0.244, 0.209, 0.191], jointWidth: 0.03, margin: 0.07, boss: 0.14, faceVariation: 0.10, wear: 0.15,
  },
  /** Tower masonry with wide margins and rough bosses, as on the Herodian tower base in the Citadel. */
  tower: {
    courseHeight: 0.75, courses: 8, courseFactors: [], ratios: towerRatios,
    palette: [[0.697, 0.640, 0.590], [0.699, 0.652, 0.603], [0.692, 0.657, 0.622], [0.715, 0.661, 0.618], [0.727, 0.665, 0.610], [0.719, 0.672, 0.625], [0.737, 0.675, 0.614], [0.742, 0.678, 0.614], [0.729, 0.689, 0.646], [0.741, 0.697, 0.654], [0.755, 0.707, 0.658], [0.760, 0.712, 0.668], [0.764, 0.721, 0.674], [0.772, 0.733, 0.693], [0.791, 0.736, 0.685], [0.799, 0.751, 0.692]],
    joint: [0.451, 0.41, 0.331], jointWidth: 0.03, margin: 0.05, boss: 0.22, faceVariation: 0.10, wear: 0.2,
  },
  /** City-wall masonry, from the owner's close photograph of the Old City wall. */
  cityWall: {
    courseHeight: 0.6, courses: 10, courseFactors: [1.0, 0.9, 1.08, 1.0, 0.94, 1.1, 0.95, 1.0, 1.06, 0.97], ratios: towerRatios,
    palette: [[0.728, 0.675, 0.624], [0.697, 0.640, 0.590], [0.726, 0.684, 0.635], [0.692, 0.657, 0.622], [0.732, 0.686, 0.632], [0.727, 0.665, 0.610], [0.732, 0.688, 0.638], [0.737, 0.675, 0.614], [0.741, 0.688, 0.629], [0.729, 0.689, 0.646], [0.738, 0.688, 0.634], [0.755, 0.707, 0.658], [0.740, 0.690, 0.633], [0.764, 0.721, 0.674], [0.741, 0.691, 0.639], [0.791, 0.736, 0.685]],
    joint: [0.239, 0.203, 0.193], jointWidth: 0.03, margin: 0.03, boss: 0.15, faceVariation: 0.10, wear: 0.2,
  },
  /** Plain dressed ashlar for restored superstructures; colours from a photograph of an arcade on the platform. */
  dressed: {
    courseHeight: 0.5, courses: 10, courseFactors: [], ratios: towerRatios,
    palette: [[0.762, 0.716, 0.638], [0.774, 0.725, 0.644], [0.768, 0.730, 0.644], [0.779, 0.731, 0.646], [0.794, 0.743, 0.652], [0.803, 0.747, 0.649], [0.801, 0.749, 0.645], [0.802, 0.751, 0.659], [0.798, 0.752, 0.668], [0.801, 0.757, 0.671], [0.802, 0.759, 0.667], [0.811, 0.761, 0.671], [0.819, 0.762, 0.670], [0.813, 0.766, 0.681], [0.818, 0.766, 0.677], [0.825, 0.771, 0.682]],
    joint: [0.55, 0.52, 0.47], jointWidth: 0.02, margin: 0, boss: 0, faceVariation: 0.10, wear: 0.3,
  },
  /** White marble ashlar for the courts and the sanctuary, as on the Holyland model. */
  marbleAshlar: {
    courseHeight: 0.7, courses: 8, courseFactors: [], ratios: towerRatios,
    palette: [[0.86, 0.855, 0.83], [0.875, 0.87, 0.845], [0.885, 0.88, 0.86], [0.89, 0.885, 0.865], [0.9, 0.895, 0.875],
      [0.905, 0.9, 0.88], [0.91, 0.905, 0.89], [0.92, 0.915, 0.9], [0.865, 0.86, 0.845], [0.895, 0.89, 0.87]],
    joint: [0.70, 0.69, 0.66], jointWidth: 0.014, margin: 0, boss: 0, faceVariation: 0.04, wear: 0.05,
  },
};
export const tileOf = (p) => p.courses * p.courseHeight;

/** Value noise that repeats exactly once per unit square. */
class Field {
  constructor(cx, cy, rng) {
    this.cx = cx; this.cy = cy;
    this.v = new Float32Array(cx * cy);
    for (let i = 0; i < this.v.length; i++) this.v[i] = rng.unit();
  }
  at(u, w) {
    const cx = this.cx, cy = this.cy, v = this.v;
    // Arguments are at most slightly negative, so after this truncation is the floor.
    if (u < 0) u += 1;
    if (w < 0) w += 1;
    const fx = (u - (u | 0)) * cx, fy = (w - (w | 0)) * cy;
    let x0 = fx | 0, y0 = fy | 0;
    if (x0 >= cx) x0 = cx - 1;
    if (y0 >= cy) y0 = cy - 1;
    const x1 = x0 + 1 === cx ? 0 : x0 + 1, y1 = y0 + 1 === cy ? 0 : y0 + 1;
    let tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const a = v[y0 * cx + x0], b = v[y0 * cx + x1], c = v[y1 * cx + x0], d = v[y1 * cx + x1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  }
}

const smooth = (x) => { const t = x < 0 ? 0 : x > 1 ? 1 : x; return t * t * (3 - 2 * t); };
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Box blur with wrap-around, used for the occlusion map. */
function blur(src, size, radius) {
  const tmp = new Float32Array(size * size), out = new Float32Array(size * size);
  const n = 2 * radius + 1;
  for (let y = 0; y < size; y++) {
    let s = 0;
    for (let k = -radius; k <= radius; k++) s += src[y * size + (k + size) % size];
    for (let x = 0; x < size; x++) {
      tmp[y * size + x] = s / n;
      s += src[y * size + (x + radius + 1) % size] - src[y * size + (x - radius + size) % size];
    }
  }
  for (let x = 0; x < size; x++) {
    let s = 0;
    for (let k = -radius; k <= radius; k++) s += tmp[((k + size) % size) * size + x];
    for (let y = 0; y < size; y++) {
      out[y * size + x] = s / n;
      s += tmp[((y + radius + 1) % size) * size + x] - tmp[((y - radius + size) % size) * size + x];
    }
  }
  return out;
}

/** Base colour, normal, roughness and occlusion (RGBA byte arrays, row 0 at v = 0), all tiling seamlessly.
 *  A height field is built per pixel from the distance to the block edge (open joint, bevel, drafted margin, boss)
 *  plus layers of tiling noise; normal and occlusion come from that height field at physical scale. */
export function makeMasonry(p, seed, size = p.margin > 0 ? 1024 : 512) {
  const S = size;
  const tile = tileOf(p);
  const ppm = S / tile;
  const rng = new RNG(seed);
  const low = [new Field(5, 5, rng), new Field(11, 11, rng), new Field(23, 23, rng)];
  const mid = [new Field(47, 47, rng), new Field(97, 97, rng)];
  const fine = [new Field(193, 193, rng), new Field(389, 389, rng)];
  const streak = new Field(26, 4, rng);
  const edge = new Field(61, 61, rng);
  const chipF = new Field(19, 19, rng);
  const crackF = [new Field(7, 7, rng), new Field(15, 15, rng)];
  const patinaF = [new Field(4, 4, rng), new Field(9, 9, rng)];

  // Lay out the courses. Each course closes exactly at the tile width so the texture repeats.
  const factors = [];
  for (let i = 0; i < p.courses; i++) factors.push(p.courseFactors.length ? p.courseFactors[i % p.courseFactors.length] : 1);
  const fsum = factors.reduce((a, b) => a + b, 0);
  const blocks = [];
  let y = 0;
  for (let r = 0; r < p.courses; r++) {
    const h = factors[r] / fsum * S;
    const widths = [];
    let total = 0;
    while (total < S) {
      const w = p.ratios[Math.floor(rng.unit() * p.ratios.length) % p.ratios.length] * h;
      widths.push(w); total += w;
    }
    const over = total - S;
    if (widths.length > 1 && widths[widths.length - 1] - over < 0.45 * h) {
      widths.pop();
      widths[widths.length - 1] += S - widths.reduce((a, b) => a + b, 0);
    } else {
      widths[widths.length - 1] -= over;
    }
    let x = rng.range(0, S);
    for (const w of widths) {
      const wear = Math.pow(rng.unit(), 1.6) * p.wear;
      blocks.push({
        x: x % S, y, w, h,
        color: Math.floor(rng.unit() * p.palette.length) % p.palette.length,
        color2: Math.floor(rng.unit() * p.palette.length) % p.palette.length,
        shade: rng.range(-0.065, 0.065), wear,
        radius: (0.01 + 0.07 * wear + 0.03 * p.boss) * ppm,
        ox: rng.range(0, S), oy: rng.range(0, S),
        crack: rng.unit() < 0.25 * p.wear - 0.06 ? 1 : 0,
        patina: rng.unit() * (0.25 + 0.5 * p.wear),
      });
      x += w;
    }
    y += h;
  }

  const count = S * S;
  const height = new Float32Array(count);
  const rgb = new Uint8Array(count * 4), rgh = new Uint8Array(count * 4);
  // Joints: recessed, rough, and slightly uneven in tone.
  for (let i = 0; i < count; i++) {
    const n = fine[0].at((i % S) / S, Math.floor(i / S) / S);
    const k = 0.8 + 0.4 * n;
    rgb[i * 4] = Math.min(p.joint[0] * k, 1) * 255; rgb[i * 4 + 1] = Math.min(p.joint[1] * k, 1) * 255;
    rgb[i * 4 + 2] = Math.min(p.joint[2] * k, 1) * 255; rgb[i * 4 + 3] = 255;
    rgh[i * 4] = rgh[i * 4 + 1] = rgh[i * 4 + 2] = 248; rgh[i * 4 + 3] = 255;
  }

  const jointHalf = Math.max(0.8, p.jointWidth * ppm / 2 * 0.7);
  const marginPx = p.margin * ppm;
  const bevel = Math.max(1.5, 0.014 * ppm);
  const bossRamp = Math.max(2.0, (0.035 + 0.10 * p.boss * p.boss) * ppm);
  const jitter = (0.004 + 0.012 * p.boss) * ppm;
  const rough = 0.06 + 0.22 * p.boss;
  const blotch = Math.min(p.faceVariation * 2.5, 0.75);
  const ledge = 0.13 * ppm;
  // Fresh, cleanly dressed stone shows little mottling; it grows with weathering.
  const grain = 0.3 + 0.7 * p.wear;

  for (const b of blocks) {
    const x0 = Math.floor(b.x), x1 = Math.ceil(b.x + b.w);
    const y0 = Math.max(0, Math.floor(b.y)), y1 = Math.min(S, Math.ceil(b.y + b.h));
    const c = p.palette[b.color], c2 = p.palette[b.color2];
    for (let py = y0; py < y1; py++) {
      const v = py + 0.5 - b.y;
      if (v < 0 || v >= b.h) continue;
      for (let pxr = x0; pxr < x1; pxr++) {
        const u = pxr + 0.5 - b.x;
        if (u < 0 || u >= b.w) continue;
        const px = ((pxr % S) + S) % S;
        // Noise is looked up at a per-block offset so patterns do not run across joints.
        const nu = (pxr + b.ox) / S, nv = (py + b.oy) / S;
        const n1 = low[0].at(nu, nv) * 0.5 + low[1].at(nu, nv) * 0.3 + low[2].at(nu, nv) * 0.2;
        const n2 = mid[0].at(nu, nv) * 0.6 + mid[1].at(nu, nv) * 0.4;
        const n3 = fine[0].at(nu, nv) * 0.55 + fine[1].at(nu, nv) * 0.45;

        // Distance to the block edge: rounded corners, a wandering edge, and chips.
        const dx = Math.min(u, b.w - u), dy = Math.min(v, b.h - v);
        let d = Math.min(dx, dy);
        if (dx < b.radius && dy < b.radius) d = b.radius - Math.hypot(b.radius - dx, b.radius - dy);
        d += (edge.at(nu, nv) - 0.5) * jitter * 2;
        d -= smooth((chipF.at(nu, nv) * 0.6 + n2 * 0.4 - 0.62) / 0.14) * (0.01 + 0.05 * b.wear) * ppm;
        if (d < jointHalf) continue;
        const t = smooth((d - jointHalf) / bevel);
        let tb = 1;
        if (marginPx > 0) tb = smooth((d - jointHalf - marginPx + (n1 - 0.5) * jitter * 4) / bossRamp);

        const st = streak.at(nu + (n1 - 0.5) * 0.05, nv);
        const channel = Math.max(0, 1 - Math.abs(st - 0.5) * 7) * tb;
        const pit = smooth((0.24 - n3) / 0.14) * smooth((n2 - 0.42) / 0.25) * (0.3 + 0.7 * b.wear);
        let line = 0;
        if (b.crack) {
          const cr = crackF[0].at(nu + (n2 - 0.5) * 0.04, nv + (n1 - 0.5) * 0.04) * 0.65 + crackF[1].at(nu, nv + (n2 - 0.5) * 0.03) * 0.35;
          line = smooth((1 - Math.abs(2 * cr - 1) - 0.986) / 0.012) * smooth((n1 - 0.47) / 0.12) * t;
        }

        let hgt = 0.40 + tb * 0.42 * p.boss;
        hgt += tb * ((n1 - 0.5) * rough * 1.4 + (n2 - 0.5) * rough * 0.8 + (n3 - 0.5) * (0.05 + rough * 0.3));
        hgt += (1 - tb) * ((n3 - 0.5) * 0.05 + (n2 - 0.5) * 0.03);
        hgt -= b.wear * channel * 0.12 + pit * 0.07 + line * 0.2;
        const i = py * S + px;
        height[i] = t * Math.max(hgt, 0.03);

        // Colour: two palette colours blended by broad noise, then weathering.
        const m = smooth((n1 - 0.35) / 0.3) * blotch;
        let r = c[0] + (c2[0] - c[0]) * m, g = c[1] + (c2[1] - c[1]) * m, bl = c[2] + (c2[2] - c[2]) * m;
        const pn = patinaF[0].at(nu, nv) * 0.6 + patinaF[1].at(nu, nv) * 0.4;
        const pat = smooth((pn - (1 - b.patina)) / 0.25) * 0.55;
        const lum = 0.3 * r + 0.6 * g + 0.1 * bl;
        r += (lum * 0.80 - r) * pat; g += (lum * 0.78 - g) * pat; bl += (lum * 0.74 - bl) * pat;
        let k = 1 + b.shade + ((n1 - 0.5) * 0.16 + (n2 - 0.5) * 0.14 + (n3 - 0.5) * 0.10) * grain;
        k *= 0.86 + 0.14 * t;
        k *= 1 - (1 - smooth(dy / ledge)) * 0.20 * n2 * grain;
        k *= 1 - 0.10 * b.wear * channel - pit * 0.12 - line * 0.38;
        if (marginPx > 0) k *= 0.97 + 0.03 * tb;
        rgb[i * 4] = clamp01(r * k) * 255; rgb[i * 4 + 1] = clamp01(g * k) * 255; rgb[i * 4 + 2] = clamp01(bl * k) * 255;

        const ro = Math.min(Math.max(0.80 + (n3 - 0.5) * 0.22 + pit * 0.1 + pat * 0.08 - tb * b.wear * 0.05, 0.5), 1) * 255;
        rgh[i * 4] = rgh[i * 4 + 1] = rgh[i * 4 + 2] = ro;
      }
    }
  }

  // Ambient occlusion: how far each point lies below its surroundings.
  const depth = 0.04 + 0.10 * p.boss;
  const around = blur(height, S, Math.max(2, Math.floor(0.025 * ppm)));
  const occ = new Uint8Array(count * 4), nrm = new Uint8Array(count * 4);
  const kk = depth * ppm / 2;
  for (let py = 0; py < S; py++) {
    const up = ((py + 1) % S) * S, dn = ((py + S - 1) % S) * S;
    for (let px = 0; px < S; px++) {
      const i = py * S + px;
      const ao = Math.min(Math.max(1 - 1.8 * Math.max(0, around[i] - height[i]), 0.3), 1);
      occ[i * 4] = occ[i * 4 + 1] = occ[i * 4 + 2] = ao * 255; occ[i * 4 + 3] = 255;
      // A little of the occlusion also goes into the colour, as dirt settles in hollows.
      const dirt = 0.90 + 0.10 * ao;
      rgb[i * 4] *= dirt; rgb[i * 4 + 1] *= dirt; rgb[i * 4 + 2] *= dirt;
      // Normal from the height field at physical scale.
      const l = height[py * S + (px + S - 1) % S], r = height[py * S + (px + 1) % S];
      const ddx = (r - l) * kk, ddy = (height[up + px] - height[dn + px]) * kk;
      const ln = Math.sqrt(ddx * ddx + ddy * ddy + 1);
      nrm[i * 4] = (-ddx / ln * 0.5 + 0.5) * 255;
      nrm[i * 4 + 1] = (ddy / ln * 0.5 + 0.5) * 255;
      nrm[i * 4 + 2] = (1 / ln * 0.5 + 0.5) * 255;
      nrm[i * 4 + 3] = 255;
    }
  }
  return { size: S, color: rgb, normal: nrm, roughness: rgh, occlusion: occ };
}
