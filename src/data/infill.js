// Representative houses, by quarter, and the assembly of the whole dataset.
import { Frame, Poly, RNG, valueNoise, seedMulAdd, int64, add, sub, mul } from '../geo.js';
import { S, feature, cite, dim, footprints, corridors, Area, Confidence } from '../model.js';
import { mount, firstPoly, secondPoly, thirdPoly, sunkSpecs, inBounds } from './cityBase.js';
import { terrain } from './terrain.js';
import { templeMountFeatures } from './templeMount.js';
import { wallFeatures, cityFeatures, outsideFeatures } from './city.js';

/** x of the Tyropoeon street at a given northing; east of it is the Lower City. */
export function tyropoeonX(y) {
  const line = [[-800, 70], [-700, 60], [-580, 36], [-500, 15], [-400, 0], [-300, -10], [-200, -15], [-100, -20], [0, -25], [170, -30]];
  if (y <= line[0][0]) return line[0][1];
  for (let i = 1; i < line.length; i++) {
    if (y <= line[i][0]) {
      const t = (y - line[i - 1][0]) / (line[i][0] - line[i - 1][0]);
      return line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t;
    }
  }
  return line[line.length - 1][1];
}

/** Ordinary houses filling the built-up area. Deterministic for a given dataset. */
export function infillFeatures(named) {
  const H = terrain();
  // What the houses must keep clear of.
  const polys = [], lines = [];
  const addPoly = (p) => { const bb = Poly.bbox(p); polys.push({ lo: sub(bb.min, [4, 4]), hi: add(bb.max, [4, 4]), poly: p }); };
  for (const f of named) {
    footprints(f).forEach(addPoly);
    for (const c of corridors(f)) {
      const bb = Poly.bbox(c.path);
      const m = c.half + 3.5;
      lines.push({ lo: sub(bb.min, [m, m]), hi: add(bb.max, [m, m]), path: c.path, half: m });
    }
  }
  sunkSpecs.forEach((s) => addPoly(s.outer));

  const blocked = (q) => {
    for (const e of polys) {
      if (q[0] >= e.lo[0] && q[0] <= e.hi[0] && q[1] >= e.lo[1] && q[1] <= e.hi[1]) {
        if (Poly.contains(e.poly, q) || Poly.distanceToBoundary(q, e.poly) < 3) return true;
      }
    }
    for (const l of lines) {
      if (q[0] >= l.lo[0] && q[0] <= l.hi[0] && q[1] >= l.lo[1] && q[1] <= l.hi[1]) {
        if (Poly.distanceToPath(q, l.path) < l.half) return true;
      }
    }
    return false;
  };

  const houseCitations = [cite('avigad1983', 'houses of the Upper City'), cite('geva2000', 'final reports'), cite('geva2014', 'pp. 131-160')];
  const zones = [
    { id: 'infill-upper', name: 'Upper City houses', area: Area.upperCity, cell: 17, seed: 101, tall: 0.65,
      contains: (p) => Poly.contains(firstPoly, p) && p[0] < tyropoeonX(p[1]),
      density: () => 0.93, bounds: firstPoly, anchor: [-380, -220],
      summary: 'The Western Hill was the wealthy quarter. The houses excavated in the Jewish Quarter are large, of two storeys round a courtyard, with plastered stone walls and flat roofs; these blocks repeat that type across the rest of the hill, where almost nothing has been dug. Street lines between them are not known.',
      dimensions: [dim('Typical excavated house', '200 to 600 m2')],
      citations: [...houseCitations, cite('war', '5.137; 6.403-407')] },
    { id: 'infill-lower', name: 'Lower City houses', area: Area.lowerCity, cell: 12, seed: 102, tall: 0.4,
      contains: (p) => Poly.contains(firstPoly, p) && p[0] >= tyropoeonX(p[1]),
      density: () => 0.92, bounds: firstPoly, anchor: [60, -330],
      summary: 'The south-eastern ridge and the Tyropoeon slopes, densely built with smaller houses. Excavations on the ridge found first-century houses terraced down the slopes, most of them badly eroded. The blocks are typical, not individual.',
      dimensions: [],
      citations: [cite('shiloh1984', 'Stratum 6'), cite('reich2011', 'Second Temple period remains'), cite('geva2014', 'pp. 131-160'), cite('war', '5.140; 6.363')] },
    { id: 'infill-second', name: 'Second-wall quarter houses', area: Area.north, cell: 13, seed: 103, tall: 0.5,
      contains: (p) => Poly.contains(secondPoly, p),
      density: () => 0.9, bounds: secondPoly, anchor: [-250, 400],
      summary: 'The commercial quarter north of the First Wall, where Josephus mentions wool shops, smithies and a clothes market. It lies under the Muslim and Christian Quarters and is almost unexcavated; the blocks are typical only.',
      dimensions: [],
      citations: [cite('war', '5.331; 5.146'), cite('geva2014', 'pp. 131-160')] },
    { id: 'infill-new', name: 'New City (Bezetha) houses', area: Area.north, cell: 16, seed: 104, tall: 0.3,
      contains: (p) => Poly.contains(thirdPoly, p) && !Poly.contains(secondPoly, p),
      density: (p) => {
        let d = 0.9 - Math.max(0, p[1] - 650) / 700;
        if (p[0] < -600) d -= (-600 - p[0]) / 600;
        return Math.min(Math.max(d, 0.12), 0.9) * (0.55 + 0.9 * valueNoise(p[0] / 110, p[1] / 110, 5));
      },
      bounds: thirdPoly, anchor: [-120, 800],
      summary: 'The suburb that grew north of the Temple and was walled by Agrippa I. Josephus calls it the New City and says it was only partly inhabited, with a timber market. Excavation along the Third Wall found little building inside it, so the houses thin out towards the north.',
      dimensions: [],
      citations: [cite('war', '5.148-151; 2.530; 5.331'), cite('benarieh1974', 'pp. 97-107'), cite('geva2014', 'pp. 131-160')] },
  ];

  const F = Frame.north([0, 0], mount.v);
  const out = [];
  for (const z of zones) {
    const fr = z.bounds.map((q) => F.toFrame(q));
    const bb = Poly.bbox(fr);
    const i0 = Math.floor(bb.min[0] / z.cell), i1 = Math.ceil(bb.max[0] / z.cell);
    const j0 = Math.floor(bb.min[1] / z.cell), j1 = Math.ceil(bb.max[1] / z.cell);
    const shapes = [];
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const rng = new RNG(seedMulAdd(z.seed, 1000003, int64(i * 92821 + j * 68917)));
        const w = z.cell * rng.range(0.60, 0.84), d = z.cell * rng.range(0.60, 0.84);
        const jx = (z.cell - w) * rng.range(-0.3, 0.3), jy = (z.cell - d) * rng.range(-0.3, 0.3);
        const c = F.p((i + 0.5) * z.cell + jx, (j + 0.5) * z.cell + jy);
        const angle = F.angle + rng.range(-0.05, 0.05);
        const keep = rng.unit(), tall = rng.unit(), room = rng.unit(), tint = rng.range(0.84, 1.0);
        const h = tall < z.tall ? rng.range(6.2, 7.8) : rng.range(3.3, 4.5);
        if (!inBounds(c) || !z.contains(c) || !(keep < z.density(c))) continue;
        const poly = Poly.rect(c, w, d, angle);
        if (poly.some((q) => !z.contains(q) || blocked(q)) || blocked(c)) continue;
        if (H.slope(c) > 0.8) continue;
        let roomPoly = null;
        if (room < 0.3) {
          const off = mul(sub(poly[Math.floor(room * 13) % 4], c), 0.45);
          roomPoly = Poly.rect(add(c, off), w * 0.45, d * 0.45, angle);
        }
        shapes.push(S.house({ poly, height: h, tint: Math.fround(tint), room: roomPoly }));
      }
    }
    out.push(feature({
      id: z.id, name: z.name, area: z.area, confidence: Confidence.representative, uncertainty: 0,
      summary: z.summary, dimensions: [...z.dimensions, dim('Houses shown', String(shapes.length))],
      citations: z.citations, anchor: z.anchor, listed: false, shapes,
    }));
  }
  return out;
}

function terrainFeature() {
  return feature({
    id: 'terrain', name: 'Reconstructed ancient topography', area: Area.setting, confidence: Confidence.partial, uncertainty: 30,
    summary: "The ground surface as it stood in the first century, not today's. The central (Tyropoeon) valley and the Kidron bed are shown at their ancient levels, before 10 to 20 m of later fill. The surface is interpolated from spot heights and valley and ridge profiles; between them, heights can be off by 5 to 10 m.",
    dimensions: [dim('Modelled area', '2.4 x 2.8 km'), dim('Grid', '5 m'), dim('Lowest point', 'Kidron below En Rogel, c. 585 m'), dim('Highest point', 'Mount of Olives, c. 815 m')],
    citations: [cite('warren1884', 'rock-level plans and sections of the city and the Haram'), cite('bahat1990', 'topographic maps of the ancient city'),
      cite('war', '5.136-141 (the hills and the Tyropoeon valley)')],
    anchor: [-250, -300], listed: false, shapes: [],
  });
}

/** Every feature of the model, in drawing order. Deterministic. */
export function buildFeatures() {
  const named = [terrainFeature(), ...templeMountFeatures(), ...wallFeatures(), ...cityFeatures(), ...outsideFeatures()];
  return [...named, ...infillFeatures(named)];
}
