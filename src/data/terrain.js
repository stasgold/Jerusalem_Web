// Control data for the reconstructed first-century ground surface, and the 5 m heightfield.
//
// This is not a survey DEM. A modern DEM would be wrong for the period: the central (Tyropoeon) valley
// is filled with up to 20 m of later debris and the Kidron bed has risen by more than 10 m. The values
// below are spot heights and valley / ridge profiles in metres above sea level, read from Warren's
// rock-level surveys (Warren & Conder 1884), the topographic maps in Bahat 1990, and excavated Herodian
// street and floor levels. Expect errors of 5 to 10 m away from the control lines.
import { Poly, add, sub } from '../geo.js';
import { Bounds, mountPoly, esplanade, south, southPlaza, sunkSpecs } from './cityBase.js';

const lines = [
  // Kidron valley thalweg, from Wadi el-Joz in the north to below En Rogel.
  [[-400, 1700, 752], [0, 1620, 742], [300, 1450, 730], [450, 1200, 718], [450, 950, 706],
    [430, 700, 696], [410, 500, 688], [400, 350, 680], [385, 150, 668], [360, -50, 655],
    [290, -200, 642], [225, -300, 631], [200, -450, 620], [185, -600, 612], [165, -750, 606],
    [150, -840, 602], [220, -1000, 592], [300, -1100, 585]],
  // Hinnom valley, from the Mamilla basin round the Western Hill to the Kidron.
  [[-1150, 300, 778], [-950, 180, 765], [-830, 0, 750], [-800, -300, 728], [-760, -500, 705],
    [-650, -640, 682], [-450, -720, 658], [-250, -755, 638], [-100, -770, 624], [40, -790, 612],
    [130, -830, 604]],
  // Tyropoeon (central) valley at Herodian street level.
  [[-430, 1000, 760], [-430, 850, 750], [-400, 700, 742], [-340, 560, 737], [-260, 430, 732],
    [-170, 330, 729], [-90, 250, 726], [-50, 170, 723], [-30, 100, 721], [-25, 0, 718],
    [-20, -100, 706], [-15, -200, 690], [-10, -300, 672], [0, -400, 655], [15, -500, 638],
    [36, -580, 626], [80, -680, 614], [130, -780, 606]],
  // St Anne's (Bethesda) valley running under the north-east corner of the Temple Mount.
  [[-60, 900, 752], [30, 780, 742], [100, 660, 730], [150, 580, 722], [200, 535, 714],
    [260, 500, 703], [340, 470, 690]],
  // Transversal valley along the north edge of the Western Hill.
  [[-600, 115, 766], [-450, 125, 757], [-300, 140, 745], [-150, 160, 733]],
  // South-eastern ridge (City of David) crest.
  [[140, -20, 722], [128, -120, 708], [115, -220, 694], [105, -320, 680], [98, -420, 664],
    [92, -500, 648], [88, -570, 636]],
  // Bezetha ridge north of the Antonia.
  [[-35, 512, 750], [-90, 650, 756], [-150, 800, 764], [-220, 950, 770], [-280, 1150, 774],
    [-330, 1400, 778]],
  // Mount of Olives ridge.
  [[850, 1500, 812], [900, 1100, 805], [950, 700, 812], [880, 295, 815], [860, -100, 800],
    [760, -450, 770], [640, -750, 735], [520, -1000, 690]],
  // Watershed ridge west of the city.
  [[-1250, 1500, 815], [-1000, 1300, 805], [-1050, 740, 800], [-1250, 600, 805],
    [-1100, -100, 778], [-950, -500, 765], [-800, -800, 750], [-500, -950, 740],
    [-250, -1000, 745]],
  // Ground along the foot of the Temple Mount walls (street and slope levels).
  [[-10, 0, 719], [-28, 100, 721], [-46, 200, 724], [-64, 300, 728], [-82, 400, 733],
    [-98, 480, 738]],
  [[0, -8, 719], [100, 10, 723], [190, 25, 724], [262, 36, 712]],
  [[288, 42, 698], [272, 200, 708], [254, 360, 715], [238, 512, 714]],
  // East scarp of the Western Hill above the Tyropoeon.
  [[-140, 138, 737], [-110, -50, 733], [-150, -250, 735], [-250, -480, 725],
    [-350, -560, 740], [-520, -520, 762]],
  // Lower east slope of Mount Zion.
  [[-70, -40, 724], [-80, -280, 702], [-150, -500, 690], [-200, -610, 700]],
];

const spots = [
  // Western Hill plateau (Upper City).
  [-648, 49, 772], [-670, 104, 772], [-600, -100, 773], [-560, -300, 771], [-480, -450, 765],
  [-400, -150, 768], [-300, -250, 758], [-300, -50, 757], [-241, -46, 750], [-180, -60, 742],
  [-498, -311, 770], [-540, -385, 770], [-60, -520, 655], [-80, -640, 660],
  // North-west hill and the ground north of the transversal valley.
  [-464, 295, 755], [-522, 168, 762], [-789, 369, 785], [-391, 662, 742], [-700, 1100, 790],
  [-600, 600, 768], [-850, 850, 795],
  // North plateau.
  [-515, 1425, 768], [-200, 1300, 770], [0, 1350, 762], [150, 1200, 750], [200, 800, 742],
  [250, 1000, 745],
  // East bank of the Kidron and the Mount of Olives slopes.
  [600, 300, 742], [620, 800, 755], [560, -200, 722], [420, -420, 680], [330, -650, 650],
  [420, 145, 674], [700, 1400, 790],
  // South of the Hinnom.
  [-165, -805, 640], [0, -1050, 700], [-1000, -185, 772],
  // Model borders.
  [-1300, -1100, 770], [-1300, 300, 805], [-1300, 1700, 818], [-900, 1700, 812],
  [500, 1700, 780], [1100, 1700, 815], [1100, 900, 805], [1100, 0, 795], [1100, -600, 750],
  [1100, -1100, 700], [700, -1100, 680], [-600, -1100, 745],
];

function smooth(src, w, hh, passes) {
  let a = src;
  for (let p = 0; p < passes; p++) {
    const b = a.slice();
    for (let j = 1; j < hh - 1; j++) {
      for (let i = 1; i < w - 1; i++) {
        const k = j * w + i;
        b[k] = (a[k] * 4 + a[k - 1] + a[k + 1] + a[k - w] + a[k + w]) / 8;
      }
    }
    a = b;
  }
  return a;
}

export class Heightfield {
  constructor() {
    const { minX, maxX, minY, maxY, cell } = Bounds;
    // 1. Control points: polylines densified every 12 m so they act as continuous lines,
    //    each point weighted by the length it stands for, plus spot heights.
    const cx = [], cy = [], cz = [], cw = [];
    for (const line of lines) {
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const n = Math.max(1, Math.ceil(l / 12));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) {
          const t = k / n;
          cx.push(a[0] + (b[0] - a[0]) * t); cy.push(a[1] + (b[1] - a[1]) * t); cz.push(a[2] + (b[2] - a[2]) * t);
          cw.push(l / n / 35);
        }
      }
    }
    for (const s of spots) { cx.push(s[0]); cy.push(s[1]); cz.push(s[2]); cw.push(1); }
    const px = Float64Array.from(cx), py = Float64Array.from(cy), pz = Float64Array.from(cz), pw = Float64Array.from(cw);

    // 2. Inverse-distance interpolation on a 10 m grid, then smoothing.
    const cc = 10;
    const cnx = Math.floor((maxX - minX) / cc) + 1, cny = Math.floor((maxY - minY) / cc) + 1;
    let coarse = new Float64Array(cnx * cny);
    const count = px.length;
    for (let j = 0; j < cny; j++) {
      const y = minY + j * cc;
      for (let i = 0; i < cnx; i++) {
        const x = minX + i * cc;
        let sw = 0, sz = 0;
        for (let k = 0; k < count; k++) {
          const dx = x - px[k], dy = y - py[k];
          const d2 = dx * dx + dy * dy + 49;
          const w = pw[k] / (d2 * Math.sqrt(d2));
          sw += w; sz += w * pz[k];
        }
        coarse[j * cnx + i] = sz / sw;
      }
    }
    coarse = smooth(coarse, cnx, cny, 4);

    // 3. Upsample to the 5 m grid.
    this.nx = Math.floor((maxX - minX) / cell) + 1;
    this.ny = Math.floor((maxY - minY) / cell) + 1;
    const nx = this.nx, ny = this.ny;
    let fine = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const fx = i / 2, fy = j / 2;
        const i0 = Math.min(Math.floor(fx), cnx - 2), j0 = Math.min(Math.floor(fy), cny - 2);
        const tx = fx - i0, ty = fy - j0;
        const a = coarse[j0 * cnx + i0], b = coarse[j0 * cnx + i0 + 1];
        const c = coarse[(j0 + 1) * cnx + i0], d = coarse[(j0 + 1) * cnx + i0 + 1];
        fine[j * nx + i] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
      }
    }
    fine = smooth(fine, nx, ny, 1);
    this.h = Float32Array.from(fine);

    // 4. Man-made changes to the surface.
    // The Temple Mount platform buries the hill: nothing may poke above the esplanade.
    this.clampMax(mountPoly, esplanade - 0.5);
    // The plaza at the foot of the southern steps is cut level into the slope of the Ophel.
    this.clampMax(south.rect(48, -52, 222, 6), southPlaza - 0.4);
    // Rims are measured on the natural ground first, then the basins are cut.
    this.sunk = {};
    for (const spec of sunkSpecs) {
      const rim = this.groundMin(spec.outer) + 1.0;
      this.sunk[spec.id] = { rim, floor: rim - spec.depth };
    }
    for (const spec of sunkSpecs) {
      const lv = this.sunk[spec.id];
      this.clampMax(spec.outer, lv.rim - 0.3);
      this.clampMax(spec.lowZone, lv.floor - 1.0);
    }
  }

  clampMax(poly, level) {
    const { minX, minY, cell } = Bounds;
    const bb = Poly.bbox(poly);
    const i0 = Math.max(0, Math.trunc((bb.min[0] - minX) / cell)), i1 = Math.min(this.nx - 1, Math.trunc((bb.max[0] - minX) / cell) + 1);
    const j0 = Math.max(0, Math.trunc((bb.min[1] - minY) / cell)), j1 = Math.min(this.ny - 1, Math.trunc((bb.max[1] - minY) / cell) + 1);
    const lv = Math.fround(level);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (Poly.contains(poly, [minX + i * cell, minY + j * cell])) {
          const k = j * this.nx + i;
          if (this.h[k] > lv) this.h[k] = lv;
        }
      }
    }
  }

  node(i, j) { return this.h[j * this.nx + i]; }

  /** Ground elevation in metres above sea level (bilinear). */
  height(p) {
    const { minX, minY, cell } = Bounds;
    const fx = Math.min(Math.max((p[0] - minX) / cell, 0), this.nx - 1 - 1e-6);
    const fy = Math.min(Math.max((p[1] - minY) / cell, 0), this.ny - 1 - 1e-6);
    const i = Math.floor(fx), j = Math.floor(fy);
    const tx = fx - i, ty = fy - j;
    const nx = this.nx, h = this.h, k = j * nx + i;
    const a = h[k], b = h[k + 1], c = h[k + nx], d = h[k + nx + 1];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  }

  /** Steepness (rise over run). */
  slope(p) {
    const e = 4;
    const dx = (this.height([p[0] + e, p[1]]) - this.height([p[0] - e, p[1]])) / (2 * e);
    const dy = (this.height([p[0], p[1] + e]) - this.height([p[0], p[1] - e])) / (2 * e);
    return Math.hypot(dx, dy);
  }

  samples(poly) {
    const pts = Poly.resample([...poly, poly[0]], 8);
    pts.push(Poly.centroid(poly));
    return pts;
  }
  groundMin(poly) { let m = Infinity; for (const q of this.samples(poly)) m = Math.min(m, this.height(q)); return m; }
  groundMax(poly) { let m = -Infinity; for (const q of this.samples(poly)) m = Math.max(m, this.height(q)); return m; }
}

let shared = null;
/** The one heightfield of the model, built on first use. */
export function terrain() {
  if (!shared) shared = new Heightfield();
  return shared;
}
