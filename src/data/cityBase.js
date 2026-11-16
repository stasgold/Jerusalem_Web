// Layout constants, wall lines and shape helpers of the dataset.
// All coordinates are metres in the local grid (see Geo), elevations metres above sea level.
import { Geo, Frame, Poly, RNG, valueNoise, cu, add, sub, mul, neg, norm, dot, dist, cross2, sum } from '../geo.js';
import { S, abs, groundMin, groundAt } from '../model.js';

/** Extent of the terrain model. */
export const Bounds = { minX: -1300, maxX: 1100, minY: -1100, maxY: 1700, cell: 5 };
export const inBounds = (p) => p[0] >= Bounds.minX && p[0] <= Bounds.maxX && p[1] >= Bounds.minY && p[1] <= Bounds.maxY;

// MARK: Temple Mount enclosure

/** Level of the outer court. The present esplanade south of the Dome of the Rock is at about 738 m. */
export const esplanade = 738.0;
/** Published lengths of the Herodian enclosure walls (Ritmeyer 2006; Warren & Conder 1884). */
export const wallWest = 488, wallSouth = 280, wallNorth = 315, wallEast = 470;

/** Corners of the Haram outline in OpenStreetMap (relation 5862584). */
export const osmSW = Geo.local(31.7756683, 35.2346228);
export const osmSE = Geo.local(31.7760818, 35.2375555);
export const osmNE = Geo.local(31.7802965, 35.2370561);
export const osmNW = Geo.local(31.7800306, 35.2336977);

/** Frame with its y axis along the west wall, origin at the south-west corner. */
export const mount = Frame.north(osmSW, sub(osmNW, osmSW));
/** Plaza at the foot of the southern steps, and the sill of the Double and Triple Gates above it. */
export const southPlaza = 720.0;
export const southSill = 726.0;

/** SW, SE, NE, NW, built from the published wall lengths, anchored at the OSM south-west corner
 *  and oriented by the OSM west and south wall bearings. */
export const mountCorners = (() => {
  const sw = osmSW;
  const se = add(sw, mul(norm(sub(osmSE, osmSW)), wallSouth));
  const nw = add(sw, mul(mount.v, wallWest));
  const ne = Poly.circleIntersection(nw, wallNorth, se, wallEast);
  return [sw, se, ne, nw];
})();
export const mountPoly = mountCorners;

/** Frame along the south wall (x from the SW corner eastwards, y into the court). */
export const south = Frame.east(mountCorners[0], sub(mountCorners[1], mountCorners[0]));
/** Frame along the north wall (x from the NW corner eastwards, y outwards to the north). */
export const north = Frame.east(mountCorners[3], sub(mountCorners[2], mountCorners[3]));

/** Centre of the Dome of the Rock (es-Sakhra), 31°46'41"N 35°14'07"E. */
const sakhra = Geo.local(31 + 46 / 60 + 41 / 3600, 35 + 14 / 60 + 7 / 3600);
/** Temple frame: x runs east along the Temple axis from the centre of the Holy of Holies. Following Ritmeyer,
 *  the Holy of Holies is placed on es-Sakhra and the axis is set perpendicular to the east wall. */
export const temple = Frame.north(sakhra, sub(mountCorners[2], mountCorners[1]));

export const porticoDepth = cu(30);
export const porticoHeight = cu(25) + 1.0;

// MARK: City walls (centre lines)

const citadel = Geo.local(31.77611, 35.22778);
export const hippicus = add(citadel, [-25, 32]);
export const phasael = add(citadel, [12, 30]);
export const mariamne = add(citadel, [45, 23]);
export const psephinus = [-1050, 740];
export const gennath = [-400, 108];

/** Point just inside the east wall of the enclosure, `d` metres north of its south-east corner. */
function eastWallPoint(d) {
  const dir = norm(sub(mountCorners[2], mountCorners[1]));
  return sum(mountCorners[1], mul(dir, d), mul([-dir[1], dir[0]], 1.5));
}

/** First ("Old") Wall, from the bridge at the Temple Mount westwards to the Citadel, south round Mount Zion,
 *  across the mouth of the Tyropoeon below Siloam and north along the south-eastern ridge to the Temple Mount. */
export const firstWall = [
  mount.p(1.5, 170), mount.p(-112, 170), [-250, 122], gennath, [-520, 88], mariamne, phasael, hippicus,
  [-676, -60], [-674, -200], [-668, -310], [-650, -420], [-600, -530],
  [-450, -585], [-300, -625], [-150, -665], [-30, -690], [55, -700],
  [112, -655], [125, -560], [128, -420], [132, -290], [150, -170],
  [190, -70], [245, 5], eastWallPoint(45),
];

/** Second Wall, from the Gennath Gate to the Antonia. The course is conjectural. */
export const secondWall = [
  [-400, 114], [-405, 250], [-410, 400], [-400, 560], [-385, 640],
  [-280, 622], [-170, 592], [-100, 562], north.p(14, 43),
];

/** Third (Agrippa's) Wall on the Sukenik-Mayer line. */
export const thirdWall = [
  add(hippicus, [-4, 6]), [-800, 300], [-960, 560], psephinus, [-900, 930],
  [-640, 1070], [-400, 1125], [-150, 1140], [100, 1110], [300, 1000],
  [345, 800], [330, 640], [300, 545], [318, 440], add(mountCorners[2], mul(norm(sub(mountCorners[0], mountCorners[2])), 2)),
];

export const gateEssene = [-560, -545];
export const gateSiloam = [85, -680];
export const gateGennath = [-378, 110];
export const gateSecondNorth = [-350, 634];
export const gateWomensTowers = [-440, 1118];

/** Area inside the First Wall (Upper and Lower City). */
export const firstPoly = [...firstWall, mountCorners[1], mountCorners[0], mount.p(0, 160)];
/** Quarter enclosed by the Second Wall. */
export const secondPoly = [...secondWall, mountCorners[3], mount.p(0, 170), mount.p(-112, 170), [-250, 122]];
/** Everything inside the Third Wall north of the First Wall and the Temple Mount. */
export const thirdPoly = [...thirdWall, mountCorners[3], mount.p(0, 170), mount.p(-112, 170),
  [-250, 122], gennath, [-520, 88], mariamne, phasael];

export const insideCity = (p) => Poly.contains(firstPoly, p) || Poly.contains(thirdPoly, p) || Poly.contains(mountPoly, p);

// MARK: Pools and other cuts into the ground

export const siloamFrame = Frame.north(Geo.local(31.77056, 35.23500), [-21, 80]);
export const bethesdaFrame = Frame.north(Geo.local(31.78139, 35.23583), mount.v);
export const towersPoolFrame = Frame.north(Geo.local(31.77718, 35.22911), [0, 1]);
export const helenaFrame = Frame.north(Geo.local(31.78852, 35.22919), [0, 1]);

/** A pool or sunken court cut below the surrounding ground. `r` is the basin and `o` the paved apron
 *  round it, both as (x0, y0, x1, y1) in the frame. */
function sunk(id, frame, r, o, depth) {
  return {
    id, frame, r, o, depth,
    inner: frame.rect(...r),
    outer: frame.rect(...o),
    /** Zone in which the terrain is pushed below the floor. */
    lowZone: frame.rect(Math.max(r[0] - 7.5, o[0]), Math.max(r[1] - 7.5, o[1]), Math.min(r[2] + 7.5, o[2]), Math.min(r[3] + 7.5, o[3])),
  };
}
export const sunkSpecs = [
  sunk('siloam', siloamFrame, [-23, -25, 23, 25], [-38, -40, 38, 40], 2.5),
  sunk('bethesdaS', bethesdaFrame, [-25, -48, 25, -4], [-40, -63, 40, 61], 3),
  sunk('bethesdaN', bethesdaFrame, [-22, 4, 22, 46], [-40, -63, 40, 61], 3),
  sunk('israel', north, [190, 7, 300, 45], [175, 1, 313, 60], 6),
  sunk('struthion', mount, [-19, 501, -5, 553], [-34, 490, 0, 568], 3),
  sunk('towers', towersPoolFrame, [-22, -36.5, 22, 36.5], [-37, -51.5, 37, 51.5], 3),
  sunk('helena', helenaFrame, [-13.5, -13, 13.5, 13], [-28.5, -28, 28.5, 28], 8),
];
export const sunkSpec = (id) => sunkSpecs.find((s) => s.id === id);

// MARK: Shape helpers

export function segRect(a, b, t) {
  const d = norm(sub(b, a));
  const n = mul([-d[1], d[0]], t / 2);
  return [sub(a, n), sub(b, n), add(b, n), add(a, n)];
}

/** Walls with absolute elevations along a path given in frame coordinates.
 *  Gaps are [point in the frame, width]; a gap applies to the segment it lies on. */
export function wallPrisms(f, path, { closed = false, t, bottom, top, mat, gaps = [], stamp = 'solid' }) {
  const out = [];
  const n = path.length;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const a = path[i], b = path[(i + 1) % n];
    const len = dist(a, b);
    const d = mul(sub(b, a), 1 / len);
    const cuts = [];
    for (const [gp, gw] of gaps) {
      const s = dot(sub(gp, a), d);
      if (Math.abs(cross2(d, sub(gp, a))) < 1.0 && s > 0 && s < len) cuts.push([s - gw / 2, s + gw / 2]);
    }
    cuts.sort((x, y) => x[0] - y[0]);
    let start = -t / 2;
    for (const c of [...cuts, [len + t / 2, len + t / 2]]) {
      if (c[0] > start + 0.05) {
        out.push(S.prism({ poly: segRect(f.p(add(a, mul(d, start))), f.p(add(a, mul(d, c[0]))), t), bottom: abs(bottom), top: abs(top), mat, stamp }));
      }
      start = c[1];
    }
  }
  return out;
}

/** Four prisms forming a rim between an outer and an inner quadrilateral. */
export function ring(outer, inner, bottom, top, mat, cap = null) {
  return [0, 1, 2, 3].map((i) => {
    const j = (i + 1) % 4;
    return S.prism({ poly: [outer[i], outer[j], inner[j], inner[i]], bottom, top, mat, cap });
  });
}

/** Thin panel standing proud of a wall face: gate openings, door frames. */
export function decal(a, b, { outward, depth = 0.2, bottom, top, mat = 'dark' }) {
  const o = mul(norm(outward), depth);
  return S.prism({ poly: [a, b, add(b, o), add(a, o)], bottom: abs(bottom), top: abs(top), mat, stamp: 'none' });
}

/** Gate in a city wall: two flanking towers and an arched passage. */
export function cityGate(path, near, wallHeight, thickness) {
  const n = Poly.nearest(path, near);
  const ang = Math.atan2(n.t[1], n.t[0]);
  const out = [];
  for (const s of [-1, 1]) {
    out.push(S.prism({ poly: Poly.rect(add(n.p, mul(n.t, s * 7.5)), 7, thickness + 4, ang), bottom: groundMin(-2), top: groundAt(wallHeight + 5), mat: 'cityWall', cap: 'paving' }));
  }
  // Arched passage 5 m wide between jambs, with a band of lighter voussoirs on both faces and the door leaves open inside.
  const spring = 4.4, opening = 5.0;
  const across = [-n.t[1], n.t[0]];
  for (const s of [-1, 1]) {
    out.push(S.prism({ poly: Poly.rect(add(n.p, mul(n.t, s * 3.3)), 1.6, thickness, ang), bottom: groundMin(-1), top: groundAt(spring), mat: 'cityWall' }));
    out.push(S.prism({ poly: Poly.rect(sum(n.p, mul(n.t, s * 2.32), mul(across, thickness / 2 + 1.25)), 0.16, 2.5, ang), bottom: groundMin(0), top: groundAt(spring + 0.6), mat: 'door', stamp: 'none' }));
  }
  out.push(S.arch({ center: n.p, along: n.t, width: opening, thickness, length: 8.2, spring: groundAt(spring), top: groundAt(wallHeight), mat: 'cityWall' }));
  out.push(S.arch({ center: n.p, along: n.t, width: opening, thickness: thickness + 0.3, length: 0, spring: groundAt(spring), top: groundAt(spring), ring: 0.6, mat: 'cityWall' }));
  return { shapes: out, at: n.p };
}

/** Merlons along the top of a wall running a -> b, set just inside its outer face. */
export function battlement(a, b, n, top, mat) {
  const len = dist(a, b);
  const d = mul(sub(b, a), 1 / len);
  const count = Math.max(1, Math.floor(len / 2.6));
  const out = [];
  for (let k = 0; k < count; k++) {
    const c = add(add(a, mul(d, (k + 0.5) * len / count)), mul(n, 0.45));
    const d7 = mul(d, 0.7), n4 = mul(n, 0.4);
    out.push(S.prism({ poly: [sub(sub(c, d7), n4), sub(add(c, d7), n4), add(add(c, d7), n4), add(sub(c, d7), n4)], bottom: abs(top), top: abs(top + 1.3), mat, stamp: 'none' }));
  }
  return out;
}

/** Merlons round a rectangle given in a frame. */
export function battlementRect(f, x0, y0, x1, y1, top, mat) {
  return [
    ...battlement(f.p(x0, y0), f.p(x1, y0), f.v, top, mat),
    ...battlement(f.p(x1, y0), f.p(x1, y1), neg(f.u), top, mat),
    ...battlement(f.p(x1, y1), f.p(x0, y1), neg(f.v), top, mat),
    ...battlement(f.p(x0, y1), f.p(x0, y0), f.u, top, mat),
  ];
}

/** Double colonnade along the inside of an enclosure wall running a -> b. */
export function portico(a, b, n, { gaps = [], trimStart = 0, trimEnd = 0 } = {}) {
  const E = esplanade;
  const len = dist(a, b);
  const d = mul(sub(b, a), 1 / len);
  const out = [];
  let start = 0;
  for (const g of [...gaps.slice().sort((x, y) => x[0] - y[0]), [len, 0]]) {
    const end = g[0] - g[1] / 2;
    if (end > start + 0.1) {
      out.push(S.prism({ poly: [add(a, mul(d, start)), add(a, mul(d, end)), sum(a, mul(d, end), mul(n, 1.6)), sum(a, mul(d, start), mul(n, 1.6))],
        bottom: abs(E), top: abs(E + porticoHeight), mat: 'ashlar', cap: 'paving' }));
    }
    start = g[0] + g[1] / 2;
  }
  out.push(...battlement(a, b, n, E + porticoHeight, 'ashlar'));
  // The roof starts behind the outer wall face; sharing that plane makes the two surfaces flicker.
  out.push(S.prism({ poly: [add(a, mul(n, 0.4)), add(b, mul(n, 0.4)), add(b, mul(n, porticoDepth)), add(a, mul(n, porticoDepth))],
    bottom: abs(E + porticoHeight - 1), top: abs(E + porticoHeight), mat: 'timber', cap: 'roof', stamp: 'none' }));
  // Arcades: arches of dressed stone spring from the capitals, with a plain spandrel wall above.
  const s0 = 6 + trimStart, s1 = len - 6 - trimEnd;
  const count = Math.max(2, Math.floor((s1 - s0) / 4.6) + 1);
  const bay = (s1 - s0) / (count - 1);
  const columnHeight = porticoHeight - 1 - 2.75;
  for (const off of [8.2, porticoDepth - 0.8]) {
    out.push(S.columns({ from: sum(a, mul(d, s0), mul(n, off)), to: sum(a, mul(d, s1), mul(n, off)), count, diameter: 1.15, bottom: abs(E), height: columnHeight, mat: 'marble' }));
    for (let k = 0; k < count - 1; k++) {
      out.push(S.arch({ center: sum(a, mul(d, s0 + (k + 0.5) * bay), mul(n, off)), along: d, width: bay - 1.1, thickness: 1.1,
        length: bay, spring: abs(E + columnHeight), top: abs(E + porticoHeight - 1), mat: 'limestone' }));
    }
  }
  return out;
}

/** Engaged pilasters on the outer face of the enclosure above court level. */
export function pilasters(a, b, n, top = esplanade + porticoHeight, mat = 'ashlar') {
  const len = dist(a, b);
  const d = mul(sub(b, a), 1 / len);
  const count = Math.floor(len / 4.6);
  const out = [];
  for (let i = 0; i < count; i++) {
    const c = add(a, mul(d, (i + 0.5) * len / count));
    const d7 = mul(d, 0.75), n3 = mul(n, 0.35);
    out.push(S.prism({ poly: [sub(c, d7), add(c, d7), sum(c, d7, n3), add(sub(c, d7), n3)], bottom: abs(esplanade), top: abs(top), mat, stamp: 'none' }));
  }
  return out;
}

/** Deterministic scatter of points inside a polygon, thinned by smooth noise so they cluster. */
export function scatter(poly, spacing, keep, seed) {
  const bb = Poly.bbox(poly);
  const rng = new RNG(seed);
  const out = [];
  for (let y = bb.min[1]; y < bb.max[1]; y += spacing) {
    for (let x = bb.min[0]; x < bb.max[0]; x += spacing) {
      const p = [x + rng.range(0, spacing), y + rng.range(0, spacing)];
      const n = valueNoise(p[0] / 90, p[1] / 90, seed);
      if (rng.unit() < keep * (0.35 + 1.3 * n) && Poly.contains(poly, p) && inBounds(p)) out.push(p);
    }
  }
  return out;
}
