// One-metre collision grid for walk mode. Every solid shape writes its top elevation here;
// bridges ("decks") are stored separately so the walker can pass underneath or cross on top.
import { Poly } from './geo.js';
import { Bounds, inBounds } from './data/cityBase.js';

export class WalkGrid {
  static maxStep = 1.2;

  constructor(terrain) {
    this.terrain = terrain;
    this.x0 = Bounds.minX; this.y0 = Bounds.minY;
    this.nx = 2000; this.ny = 2600;
    this.top = new Float32Array(this.nx * this.ny).fill(-1);
    this.decks = new Map();
  }

  forEachCell(poly, body) {
    const bb = Poly.bbox(poly);
    const i0 = Math.max(0, Math.floor(bb.min[0] - this.x0)), i1 = Math.min(this.nx - 1, Math.ceil(bb.max[0] - this.x0));
    const j0 = Math.max(0, Math.floor(bb.min[1] - this.y0)), j1 = Math.min(this.ny - 1, Math.ceil(bb.max[1] - this.y0));
    if (i0 > i1 || j0 > j1) return;
    const c = [0, 0];
    for (let j = j0; j <= j1; j++) {
      c[1] = this.y0 + j + 0.5;
      for (let i = i0; i <= i1; i++) {
        c[0] = this.x0 + i + 0.5;
        if (Poly.contains(poly, c)) body(j * this.nx + i);
      }
    }
  }

  stamp(poly, e) {
    const v = Math.fround(e), top = this.top;
    this.forEachCell(poly, (k) => { if (top[k] < v) top[k] = v; });
    // A wall thinner than the grid can slip between cell centres, so trace its outline too.
    const ring = [...poly, poly[0]];
    const perimeter = Poly.length(ring);
    if (perimeter > 0 && 2 * Math.abs(Poly.area(poly)) / perimeter < 1.5) {
      for (const p of Poly.resample(ring, 0.4)) {
        const k = this.index(p);
        if (k !== null && top[k] < v) top[k] = v;
      }
    }
  }

  stampDeck(poly, bottom, t) {
    this.forEachCell(poly, (k) => this.decks.set(k, [bottom, t]));
  }

  index(p) {
    const i = Math.floor(p[0] - this.x0), j = Math.floor(p[1] - this.y0);
    if (i < 0 || j < 0 || i >= this.nx || j >= this.ny) return null;
    return j * this.nx + i;
  }

  /** Highest solid surface at a point, ignoring bridges. */
  surface(p) {
    const g = this.terrain.height(p);
    const k = this.index(p);
    return k === null ? g : Math.max(g, this.top[k]);
  }

  /** Level the walker would stand on at `q`, coming from feet level `feet`, or null if blocked. */
  step(feet, q) {
    if (!inBounds(q)) return null;
    const g = this.surface(q);
    let level = g;
    const k = this.index(q);
    const d = k === null ? undefined : this.decks.get(k);
    if (d) {
      const [db, dt] = d;
      if (feet >= dt - WalkGrid.maxStep) level = Math.max(g, dt);      // on the deck
      else if (Math.max(g, feet) + 1.9 <= db) level = g;                // underneath it
      else return null;
    }
    return level - feet > WalkGrid.maxStep ? null : level;
  }
}
