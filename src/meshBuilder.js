// Turns the declarative shapes of a feature into triangles and collision stamps.
import { Poly, RNG, add, sub, mul, neg, norm, dist, lerp, cross2 } from './geo.js';
import { Mats } from './model.js';

/** Local grid point plus elevation to world space (x east, y up, z south). */
const W = (p, e) => [p[0], e, -p[1]];
const v3sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const v3add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const v3mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const v3dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const v3cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const v3len = (a) => Math.hypot(a[0], a[1], a[2]);

/** Accumulates triangles for one feature, split by material. */
export class MeshBuffer {
  constructor() {
    this.pos = []; this.nrm = []; this.uv = []; this.col = [];
    this.idx = new Map();
    this.tint = [1, 1, 1];
  }
  get vertexCount() { return this.pos.length / 3; }
  get triangleCount() { let n = 0; for (const v of this.idx.values()) n += v.length / 3; return n; }

  vert(p, n, u, v) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.col.push(this.tint[0], this.tint[1], this.tint[2]);
    return this.pos.length / 3 - 1;
  }
  p3(i) { return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]]; }

  /** Adds a triangle, flipping it if needed so its front faces along `n`. */
  tri(a, b, c, n, m) {
    const pa = this.p3(a);
    const flip = v3dot(v3cross(v3sub(this.p3(b), pa), v3sub(this.p3(c), pa)), n) < 0;
    let list = this.idx.get(m);
    if (!list) { list = []; this.idx.set(m, list); }
    if (flip) list.push(a, c, b); else list.push(a, b, c);
  }

  /** Flat convex face (3 or 4 corners) with its own vertices. */
  face(p, uvs, n, mat) {
    const base = this.vertexCount;
    for (let i = 0; i < p.length; i++) this.vert(p[i], n, uvs[i][0], uvs[i][1]);
    for (let i = 1; i < p.length - 1; i++) this.tri(base, base + i, base + i + 1, n, mat);
  }

  /** Face whose normal is computed from the corners and oriented towards `toward`. */
  faceAuto(p, uvs, toward, mat) {
    let n = v3cross(v3sub(p[1], p[0]), v3sub(p[2], p[0]));
    const l = v3len(n);
    if (l < 1e-9) return;
    n = v3mul(n, 1 / l);
    if (v3dot(n, toward) < 0) n = v3mul(n, -1);
    this.face(p, uvs, n, mat);
  }

  /** Typed arrays and per-material index groups, in the fixed material order. */
  finish() {
    if (this.pos.length === 0) return null;
    const groups = [];
    let total = 0;
    for (const m of Mats) { const l = this.idx.get(m); if (l && l.length) { groups.push({ mat: m, start: total, count: l.length }); total += l.length; } }
    const vc = this.vertexCount;
    const index = vc > 65535 ? new Uint32Array(total) : new Uint16Array(total);
    for (const g of groups) index.set(this.idx.get(g.mat), g.start);
    return {
      position: new Float32Array(this.pos), normal: new Float32Array(this.nrm), uv: new Float32Array(this.uv),
      color: new Float32Array(this.col), index, groups,
    };
  }
}

const SOLID_PARAPET_MATS = new Set(['towerAshlar', 'cityWall', 'ashlar', 'limestone', 'marble', 'marbleAshlar']);

export class ShapeBuilder {
  constructor(terrain, walk) {
    this.terrain = terrain;
    this.walk = walk;
    this.mesh = new MeshBuffer();
  }

  resolve(e, poly) {
    switch (e.t) {
      case 'abs': return e.v;
      case 'groundMin': return this.terrain.groundMin(poly) + e.v;
      case 'groundMax': return this.terrain.groundMax(poly) + e.v;
      case 'groundAt': return this.terrain.height(Poly.centroid(poly)) + e.v;
    }
    throw new Error('bad elevation');
  }

  add(s) {
    const T = this.terrain, walk = this.walk;
    switch (s.kind) {
      case 'prism': {
        const b = this.resolve(s.bottom, s.poly), t = this.resolve(s.top, s.poly);
        this.prism(s.poly, b, t, s.mat, s.cap ?? s.mat);
        // Blocks held up off the ground (cornices, lintels, roofs) also get an underside.
        if (b > T.height(Poly.centroid(s.poly)) + 0.5) this.underside(Poly.ccw(s.poly), b, s.cap ?? s.mat);
        // Free-standing masonry towers get the same parapet as the wall towers.
        const area = Math.abs(Poly.area(s.poly));
        if (SOLID_PARAPET_MATS.has(s.mat) && (s.cap === 'paving' || s.cap === 'marbleAshlar') && s.poly.length <= 8 && t - b > 9 &&
          area < 600 && 2 * area / Poly.length([...s.poly, s.poly[0]]) > 3) {
          this.crenellate(Poly.ccw(s.poly), t, s.mat);
        }
        if (s.stamp === 'solid') walk?.stamp(s.poly, t);
        else if (s.stamp && s.stamp.deck !== undefined) walk?.stampDeck(s.poly, t - s.stamp.deck, t);
        break;
      }
      case 'wall': this.wall(s); break;
      case 'columns':
        for (let i = 0; i < s.count; i++) {
          const p = lerp(s.from, s.to, s.count === 1 ? 0.5 : i / (s.count - 1));
          this.column(p, this.resolve(s.bottom, [p]), s.height, s.diameter, s.mat);
        }
        break;
      case 'stairs':
        this.stairs(s, this.resolve(s.lowElev, [s.lowA, s.lowB]), this.resolve(s.highElev, [s.highA, s.highB]),
          s.soffit ? this.resolve(s.soffit, [s.lowA, s.lowB]) : null);
        break;
      case 'water': {
        const e = this.resolve(s.level, s.poly);
        this.cap(Poly.ccw(s.poly), e, 'water');
        walk?.stamp(s.poly, e + 8);   // keeps the walker out of the pool
        break;
      }
      case 'gable': this.gable(s.rect, this.resolve(s.eaves, s.rect), s.rise, s.mat); break;
      case 'pyramid': {
        const b = this.resolve(s.bottom, s.poly);
        this.pyramid(Poly.ccw(s.poly), b, s.height, s.mat);
        walk?.stamp(s.poly, b + s.height);
        break;
      }
      case 'ribbon': this.ribbon(s.path, s.width, s.mat); break;
      case 'trees': s.points.forEach((p, i) => this.tree(p, i)); break;
      case 'house': {
        const ground = T.height(Poly.centroid(s.poly));
        const b = T.groundMin(s.poly) - 0.6, t = ground + s.height;
        this.mesh.tint = [s.tint, s.tint * 0.985, s.tint * 0.95];
        // Wall coordinates start at the ground so the plaster shader can place doors and windows.
        const shift = s.tint * 97;
        this.prism(s.poly, b, t, 'plaster', 'roof', ground, shift);
        walk?.stamp(s.poly, t);
        if (s.room) this.prism(s.room, t, t + 2.7, 'plaster', 'roof', t - 3, shift + 1.3);
        this.mesh.tint = [1, 1, 1];
        break;
      }
      case 'arch': {
        const sp = this.resolve(s.spring, [s.center]), t = this.resolve(s.top, [s.center]);
        this.arch(s.center, norm(s.along), s.width, s.thickness, s.length, sp, t, s.ring, s.mat);
        if (s.ring === null) walk?.stampDeck(Poly.rect(s.center, s.length, s.thickness, Math.atan2(s.along[1], s.along[0])), sp, t);
        break;
      }
      case 'panel': {
        const o = norm(s.outward);
        // Order the ends so the face points along `outward`; u then runs left to right for a viewer.
        const swap = cross2(sub(s.b, s.a), o) > 0;
        const a = add(swap ? s.b : s.a, mul(o, 0.02)), b = add(swap ? s.a : s.b, mul(o, 0.02));
        const e0 = this.resolve(s.bottom, [a, b]), e1 = this.resolve(s.top, [a, b]);
        this.mesh.face([W(a, e0), W(b, e0), W(b, e1), W(a, e1)], [[0, 1], [1, 1], [1, 0], [0, 0]], [o[0], 0, -o[1]], s.mat);
        break;
      }
      case 'portal': this.portal(s.a, s.b, s.outward, this.resolve(s.sill, [s.a, s.b]), s.height, s.arched, s.door, s.frame, s.pediment); break;
      default: throw new Error('unknown shape ' + s.kind);
    }
  }

  // MARK: Primitives

  underside(poly, e, mat) {
    const down = [0, -1, 0];
    const base = poly.map((q) => this.mesh.vert(W(q, e), down, q[0], q[1]));
    const t = Poly.triangulate(poly);
    for (let i = 0; i + 2 < t.length; i += 3) this.mesh.tri(base[t[i]], base[t[i + 2]], base[t[i + 1]], down, mat);
  }

  cap(poly, e, mat) {
    const up = [0, 1, 0];
    const base = poly.map((q) => this.mesh.vert(W(q, e), up, q[0], q[1]));
    const t = Poly.triangulate(poly);
    for (let i = 0; i + 2 < t.length; i += 3) this.mesh.tri(base[t[i]], base[t[i + 1]], base[t[i + 2]], up, mat);
  }

  prism(polyIn, bottom, top, mat, capMat, vOrigin = 0, uOffset = 0) {
    const poly = Poly.ccw(polyIn);
    const n = poly.length;
    let run = uOffset;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const d = sub(b, a);
      const l = Math.hypot(d[0], d[1]);
      if (l < 1e-6) continue;
      const out = [d[1] / l, 0, d[0] / l];
      this.mesh.face([W(a, bottom), W(b, bottom), W(b, top), W(a, top)],
        [[run, bottom - vOrigin], [run + l, bottom - vOrigin], [run + l, top - vOrigin], [run, top - vOrigin]], out, mat);
      run += l;
    }
    this.cap(poly, top, capMat);
  }

  /** Steps in equal flights separated by landings, with optional solid balustrades on both flanks. */
  stairs(s, e0, e1, soffit) {
    const { lowA, lowB, highA, highB, steps, mat, parapet, landings, side } = s;
    const walk = this.walk;
    const base = soffit ?? Math.min(e0, this.terrain.groundMin([lowA, lowB, highB, highA])) - 1;
    const rise = (e1 - e0) / steps;
    // A landing is as deep as four treads. Runs are (start, end, elevation at start, elevation at end).
    const rest = 4.0;
    const units = steps + rest * landings;
    const perFlight = Math.ceil(steps / (landings + 1));
    const runs = [];
    let u = 0, done = 0, flightStart = 0, flightBase = e0;
    for (let i = 0; i < steps; i++) {
      const top = e0 + rise * (i + 1);
      const last = i === steps - 1;
      const landing = !last && landings > 0 && (i + 1 - done) === perFlight;
      const depth = landing ? 1 + rest : 1;
      const t0 = u / units, t1 = (u + depth) / units;
      const poly = [lerp(lowA, highA, t0), lerp(lowB, highB, t0), lerp(lowB, highB, t1), lerp(lowA, highA, t1)];
      this.prism(poly, base, top, mat, mat);
      if (soffit !== null) walk?.stampDeck(poly, soffit, top); else walk?.stamp(poly, top);
      u += depth;
      if (landing) {
        runs.push([flightStart, (u - rest) / units, flightBase, top]);
        runs.push([(u - rest) / units, u / units, top, top]);
        flightStart = u / units;
        flightBase = top;
        done = i + 1;
      } else if (last) {
        runs.push([flightStart, 1, flightBase, top]);
      }
    }
    if (!(parapet > 0)) return;

    const thick = 0.6, lap = 0.05;
    const across = norm(sub(lowB, lowA));
    const along = norm(sub(highA, lowA));
    const length = dist(lowA, highA);
    for (const [lo, hi, out] of [[lowA, highA, neg(across)], [lowB, highB, across]]) {
      const inner = mul(out, -lap), outer = mul(out, thick - lap);
      for (const [rt0, rt1, ra, rb] of runs) {
        const p0 = lerp(lo, hi, rt0), p1 = lerp(lo, hi, rt1);
        const ta = ra + rise + parapet, tb = rb + rise + parapet;
        const s0 = rt0 * length, s1 = rt1 * length;
        const o3 = [out[0], 0, -out[1]];
        for (const [off, n] of [[inner, v3mul(o3, -1)], [outer, o3]]) {
          this.mesh.face([W(add(p0, off), base), W(add(p1, off), base), W(add(p1, off), tb), W(add(p0, off), ta)],
            [[s0, base], [s1, base], [s1, tb], [s0, ta]], n, side);
        }
        // Coping along the top, and the two ends.
        this.mesh.faceAuto([W(add(p0, inner), ta), W(add(p1, inner), tb), W(add(p1, outer), tb), W(add(p0, outer), ta)],
          [[s0, 0], [s1, 0], [s1, thick], [s0, thick]], [0, 1, 0], 'limestone');
        const a3 = [along[0], 0, -along[1]];
        this.mesh.face([W(add(p0, inner), base), W(add(p0, outer), base), W(add(p0, outer), ta), W(add(p0, inner), ta)],
          [[0, base], [thick, base], [thick, ta], [0, ta]], v3mul(a3, -1), side);
        this.mesh.face([W(add(p1, inner), base), W(add(p1, outer), base), W(add(p1, outer), tb), W(add(p1, inner), tb)],
          [[0, base], [thick, base], [thick, tb], [0, tb]], a3, side);
        if (soffit === null) walk?.stamp([add(p0, inner), add(p1, inner), add(p1, outer), add(p0, outer)], Math.max(ta, tb));
      }
      if (soffit !== null) continue;
      // Newel pier at the foot.
      const c = sub(add(lo, mul(out, thick / 2 - lap)), mul(along, 0.45));
      const pier = Poly.rect(c, 0.9, 0.9, Math.atan2(along[1], along[0]));
      this.prism(pier, base, e0 + rise + parapet + 0.35, side, 'limestone');
      walk?.stamp(pier, e0 + parapet + 1);
    }
  }

  /** Flat vertical face from an outline given as (distance along `dir`, elevation). */
  verticalFace(outline, origin, dir, normal, mat) {
    const poly = Poly.ccw(outline);
    const base = poly.map((q) => this.mesh.vert(W(add(origin, mul(dir, q[0])), q[1]), normal, q[0], q[1]));
    const t = Poly.triangulate(poly);
    for (let i = 0; i + 2 < t.length; i += 3) this.mesh.tri(base[t[i]], base[t[i + 1]], base[t[i + 2]], normal, mat);
  }

  /** Block with a semicircular opening (or, with `ring`, just the voussoir band round the opening). */
  arch(c, t, w, th, length, spring, top, ring, mat) {
    const r = w / 2;
    const n = [-t[1], t[0]];
    const segs = 16;
    const inner = [];
    for (let k = 0; k <= segs; k++) {
      const a = Math.PI * (1 - k / segs);
      inner.push([r * Math.cos(a), spring + r * Math.sin(a)]);
    }
    let outer = [];
    if (ring !== null) {
      const R = r + ring;
      for (let k = 0; k <= segs; k++) {
        const a = Math.PI * k / segs;
        outer.push([R * Math.cos(a), spring + R * Math.sin(a)]);
      }
    } else {
      const half = Math.max(length / 2, r + 0.05);
      outer = [[half, spring], [half, top], [-half, top], [-half, spring]];
    }
    const outline = [...inner, ...outer];
    const n3 = [n[0], 0, -n[1]];
    if (ring === null) {
      this.verticalFace(outline, add(c, mul(n, th / 2)), t, n3, mat);
      this.verticalFace(outline, sub(c, mul(n, th / 2)), t, v3mul(n3, -1), mat);
    }
    const wp = (q, side) => W(add(add(c, mul(t, q[0])), mul(n, side * th / 2)), q[1]);
    const centre = W(c, spring + r * 0.4);
    if (ring !== null) {
      // The band is mapped along the arc, so the wall texture's vertical joints become the radial joints between voussoirs.
      let s = 0;
      for (let k = 0; k < segs; k++) {
        const a = inner[k], b = inner[k + 1], oa = outer[segs - k], ob = outer[segs - k - 1];
        const l = (dist(oa, ob) + dist(a, b)) / 2;
        const ww = dist(a, oa);
        for (const side of [1, -1]) {
          this.mesh.face([wp(a, side), wp(b, side), wp(ob, side), wp(oa, side)], [[s, 0], [s + l, 0], [s + l, ww], [s, ww]], v3mul(n3, side), mat);
        }
        s += l;
      }
    }
    // Soffit of the arch, then the outer surfaces, then the two undersides at the springing.
    let run = 0;
    for (let k = 0; k < segs; k++) {
      const a = inner[k], b = inner[k + 1];
      const l = dist(a, b);
      const mid = v3mul(v3add(wp(a, 0), wp(b, 0)), 0.5);
      this.mesh.faceAuto([wp(a, -1), wp(b, -1), wp(b, 1), wp(a, 1)], [[run, 0], [run + l, 0], [run + l, th], [run, th]], v3sub(centre, mid), mat);
      run += l;
    }
    for (let k = 0; k < outer.length - 1; k++) {
      const a = outer[k], b = outer[k + 1];
      const l = dist(a, b);
      const mid = v3mul(v3add(wp(a, 0), wp(b, 0)), 0.5);
      this.mesh.faceAuto([wp(a, -1), wp(b, -1), wp(b, 1), wp(a, 1)], [[run, 0], [run + l, 0], [run + l, th], [run, th]], v3sub(mid, centre), mat);
      run += l;
    }
    for (const [a, b] of [[inner[segs], outer[0]], [outer[outer.length - 1], inner[0]]]) {
      const l = dist(a, b);
      if (l < 0.01) continue;
      this.mesh.faceAuto([wp(a, -1), wp(b, -1), wp(b, 1), wp(a, 1)], [[0, 0], [l, 0], [l, th], [0, th]], [0, -1, 0], mat);
    }
  }

  /** Gateway standing proud of a wall face between a and b. */
  portal(a, b, outward, sill, height, arched, door, frame, pediment) {
    const w = dist(a, b);
    const d = mul(sub(b, a), 1 / w);
    const o = norm(outward);
    const spring = arched ? sill + height - w / 2 : sill + height;
    const outline = [[0, sill], [w, sill], [w, spring]];
    if (arched) {
      for (let k = 1; k < 14; k++) {
        const ang = Math.PI * k / 14;
        outline.push([w / 2 + w / 2 * Math.cos(ang), spring + w / 2 * Math.sin(ang)]);
      }
    }
    outline.push([0, spring]);
    const o3 = [o[0], 0, -o[1]];
    this.verticalFace(outline, add(a, mul(o, 0.12)), d, o3, door);

    const jamb = Math.max(0.5, w * 0.11), proud = 0.45;
    for (const x0 of [-jamb, w]) {
      const p0 = add(a, mul(d, x0)), p1 = add(a, mul(d, x0 + jamb));
      this.prism([p0, p1, add(p1, mul(o, proud)), add(p0, mul(o, proud))], sill, spring, frame, frame);
    }
    if (arched) {
      this.arch(add(add(a, mul(d, w / 2)), mul(o, proud / 2)), d, w, proud, 0, spring, 0, jamb * 1.15, frame);
    } else {
      const lh = Math.max(0.9, w * 0.3);
      const p0 = add(a, mul(d, -jamb - 0.4)), p1 = add(a, mul(d, w + jamb + 0.4));
      this.prism([p0, p1, add(p1, mul(o, proud + 0.15)), add(p0, mul(o, proud + 0.15))], spring, spring + lh, frame, frame);
      if (pediment) {
        // Cornice, then a gable standing proud of the wall.
        const c0 = add(a, mul(d, -jamb - 0.7)), c1 = add(a, mul(d, w + jamb + 0.7));
        const base = spring + lh + 0.25, out = proud + 0.3;
        this.prism([c0, c1, add(c1, mul(o, out)), add(c0, mul(o, out))], spring + lh, base, frame, frame);
        const span = dist(c0, c1), rise = span * 0.2;
        this.verticalFace([[0, base], [span, base], [span / 2, base + rise]], add(c0, mul(o, out)), d, o3, frame);
        const apex = add(c0, mul(d, span / 2));
        for (const [e, side] of [[c0, -1], [c1, 1]]) {
          const toward = [d[0] * side, 2, -d[1] * side];
          this.mesh.faceAuto([W(add(e, mul(o, out)), base), W(add(apex, mul(o, out)), base + rise), W(apex, base + rise), W(e, base)],
            [[0, 0], [span / 2, 0], [span / 2, out], [0, out]], toward, frame);
        }
      }
    }
    // Threshold.
    const s0 = add(a, mul(d, -jamb)), s1 = add(a, mul(d, w + jamb));
    this.prism([s0, s1, add(s1, mul(o, 0.9)), add(s0, mul(o, 0.9))], sill - 0.6, sill + 0.12, frame, 'paving');
  }

  miterNormals(pts) {
    return pts.map((_, i) => {
      const prev = pts[Math.max(i - 1, 0)], next = pts[Math.min(i + 1, pts.length - 1)];
      let d = sub(next, prev);
      const l = Math.hypot(d[0], d[1]);
      d = l > 1e-9 ? mul(d, 1 / l) : [1, 0];
      return [-d[1], d[0]];
    });
  }

  wall({ path, height, thickness, mat, towers, towerSize, towerExtra, gates, merlons }) {
    const T = this.terrain, walk = this.walk;
    const pts = Poly.resample(path, 5);
    const nrm = this.miterNormals(pts);
    const half = thickness / 2;
    const nearGate = (p, r) => gates.some((g) => dist(g, p) < r);

    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const mid = mul(add(a, b), 0.5);
      if (nearGate(mid, 3.6)) continue;
      const poly = [sub(a, mul(nrm[i - 1], half)), sub(b, mul(nrm[i], half)), add(b, mul(nrm[i], half)), add(a, mul(nrm[i - 1], half))];
      const bottom = Math.min(...poly.map((q) => T.height(q))) - 2;
      const top = Math.max(T.height(a), T.height(b)) + height;
      this.prism(poly, bottom, top, mat, 'paving');
      walk?.stamp(poly, top);
      if (merlons) {
        const d = norm(sub(b, a));
        const l = dist(a, b);
        const out = mul([-d[1], d[0]], thickness / 2 - 0.4);
        const ang = Math.atan2(d[1], d[0]);
        for (const side of [1, -1]) this.prism(Poly.rect(add(mid, mul(out, side)), l, 0.8, ang), top, top + 0.9, mat, mat);
        this.prism(Poly.rect(add(mid, out), l * 0.55, 0.8, ang), top + 0.9, top + 2.2, mat, mat);
        this.prism(Poly.rect(sub(mid, out), l * 0.55, 0.8, ang), top + 0.9, top + 2.2, mat, mat);
      }
    }

    if (towers <= 0) return;
    const total = Poly.length(path);
    for (let k = 0; k < towers; k++) {
      const { p, t } = Poly.along(path, (k + 0.5) * total / towers);
      if (nearGate(p, 14)) continue;
      const poly = Poly.rect(p, towerSize, towerSize, Math.atan2(t[1], t[0]));
      const bottom = T.groundMin(poly) - 2;
      const top = T.height(p) + height + towerExtra;
      this.prism(poly, bottom, top, mat, 'paving');
      walk?.stamp(poly, top);
      this.crenellate(poly, top, mat);
    }
  }

  /** Parapet with merlons round the top of a tower, as on the standing walls. */
  crenellate(poly, top, mat) {
    const c = Poly.centroid(poly);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const l = dist(a, b);
      const d = mul(sub(b, a), 1 / l);
      const inward = norm(sub(c, mul(add(a, b), 0.5)));
      const ang = Math.atan2(d[1], d[0]);
      this.prism(Poly.rect(add(mul(add(a, b), 0.5), mul(inward, 0.4)), l, 0.8, ang), top, top + 0.9, mat, mat);
      const count = Math.max(2, Math.round(l / 2.6));
      for (let k = 0; k < count; k++) {
        const p = add(add(a, mul(d, (k + 0.5) * l / count)), mul(inward, 0.4));
        this.prism(Poly.rect(p, l / count * 0.55, 0.8, ang), top + 0.9, top + 2.2, mat, mat);
      }
    }
  }

  column(p, bottom, height, dia, mat) {
    const n = 10, r = dia / 2;
    const shaftTop = bottom + height - 0.6;
    const lo = [], hi = [], ns = [];
    for (let i = 0; i <= n; i++) {
      const t = 2 * Math.PI * i / n;
      const nn = [Math.cos(t), 0, Math.sin(t)];
      const u = i / n * 3;
      lo.push(this.mesh.vert([p[0] + r * Math.cos(t), bottom, -p[1] + r * Math.sin(t)], nn, u, bottom));
      hi.push(this.mesh.vert([p[0] + r * 0.88 * Math.cos(t), shaftTop, -p[1] + r * 0.88 * Math.sin(t)], nn, u, shaftTop));
      ns.push(nn);
    }
    for (let i = 0; i < n; i++) {
      this.mesh.tri(lo[i], lo[i + 1], hi[i + 1], ns[i], mat);
      this.mesh.tri(lo[i], hi[i + 1], hi[i], ns[i], mat);
    }
    const s = dia * 0.68;
    this.prism([[p[0] - s, p[1] - s], [p[0] + s, p[1] - s], [p[0] + s, p[1] + s], [p[0] - s, p[1] + s]], shaftTop, bottom + height, mat, mat);
  }

  gable(c, eaves, rise, mat) {
    if (c.length !== 4) return;
    const r0 = mul(add(c[0], c[3]), 0.5), r1 = mul(add(c[1], c[2]), 0.5);
    const ridge = eaves + rise;
    const up = [0, 1, 0];
    const centre = W(mul(add(r0, r1), 0.5), eaves);
    const l = dist(c[0], c[1]), half = dist(c[0], c[3]) / 2;
    this.mesh.faceAuto([W(c[0], eaves), W(c[1], eaves), W(r1, ridge), W(r0, ridge)], [[0, 0], [l, 0], [l, half], [0, half]], up, mat);
    this.mesh.faceAuto([W(c[3], eaves), W(c[2], eaves), W(r1, ridge), W(r0, ridge)], [[0, 0], [l, 0], [l, half], [0, half]], up, mat);
    this.mesh.faceAuto([W(c[0], eaves), W(c[3], eaves), W(r0, ridge)], [[0, eaves], [2 * half, eaves], [half, ridge]], v3sub(W(r0, eaves), centre), 'limestone');
    this.mesh.faceAuto([W(c[1], eaves), W(c[2], eaves), W(r1, ridge)], [[0, eaves], [2 * half, eaves], [half, ridge]], v3sub(W(r1, eaves), centre), 'limestone');
  }

  pyramid(poly, bottom, height, mat) {
    const c = Poly.centroid(poly);
    const apex = W(c, bottom + height);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const l = dist(a, b);
      const mid = W(mul(add(a, b), 0.5), bottom);
      this.mesh.faceAuto([W(a, bottom), W(b, bottom), apex], [[0, 0], [l, 0], [l / 2, height]], v3add(v3sub(mid, W(c, bottom)), [0, 0.5, 0]), mat);
    }
  }

  ribbon(path, width, mat) {
    const pts = Poly.resample(path, 4);
    const nrm = this.miterNormals(pts);
    const half = width / 2;
    const w = (p) => W(p, this.terrain.height(p) + 0.35);
    let s = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const l = dist(a, b);
      const al = add(a, mul(nrm[i - 1], half)), ar = sub(a, mul(nrm[i - 1], half));
      const bl = add(b, mul(nrm[i], half)), br = sub(b, mul(nrm[i], half));
      this.mesh.faceAuto([w(ar), w(br), w(bl), w(al)], [[0, s], [0, s + l], [width, s + l], [width, s]], [0, 1, 0], mat);
      s += l;
    }
  }

  tree(p, i) {
    const rng = new RNG(i * 7919 + 13);
    const g = this.terrain.height(p);
    const r = rng.range(1.8, 3.1), trunk = rng.range(1.4, 2.2);
    const shade = Math.fround(rng.range(0.78, 1.08));
    this.mesh.tint = [1, 1, 1];
    const s = 0.22;
    this.prism([[p[0] - s, p[1] - s], [p[0] + s, p[1] - s], [p[0] + s, p[1] + s], [p[0] - s, p[1] + s]], g - 0.3, g + trunk + 0.4, 'timber', 'timber');
    this.mesh.tint = [shade, shade, shade];
    const ring = Poly.circle(p, r, 6);
    const midE = g + trunk + r * 0.55;
    const topV = W(p, midE + r * 0.85), botV = W(p, g + trunk);
    for (let k = 0; k < 6; k++) {
      const a = ring[k], b = ring[(k + 1) % 6];
      const outward = v3sub(W(mul(add(a, b), 0.5), midE), W(p, midE));
      this.mesh.faceAuto([W(a, midE), W(b, midE), topV], [[0, 0], [1, 0], [0.5, 1]], v3add(outward, [0, 1, 0]), 'foliage');
      this.mesh.faceAuto([W(a, midE), W(b, midE), botV], [[0, 0], [1, 0], [0.5, 1]], v3sub(outward, [0, 1, 0]), 'foliage');
    }
    this.mesh.tint = [1, 1, 1];
  }
}
