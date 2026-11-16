// Data integrity checks, ported from the macOS app's test suite. Run with `node --test test/` or `deno test test/`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Poly, dist, cu } from '../src/geo.js';
import { footprints, allPoints } from '../src/model.js';
import { sources, byKey, notRendered } from '../src/data/bibliography.js';
import {
  mountCorners, mountPoly, osmSW, osmSE, osmNE, osmNW, inBounds, secondPoly, insideCity,
  mount, temple, siloamFrame, esplanade, firstWall, gateGennath,
} from '../src/data/cityBase.js';
import { levelWomen, levelIsrael, levelPriests } from '../src/data/templeMount.js';
import { buildFeatures } from '../src/data/infill.js';
import { terrain } from '../src/data/terrain.js';
import { WalkGrid } from '../src/walkGrid.js';
import { ShapeBuilder } from '../src/meshBuilder.js';

const features = buildFeatures();
const feature = (id) => { const f = features.find((x) => x.id === id); assert.ok(f, `missing feature ${id}`); return f; };
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} is not within ${tol} of ${b}`);

test('every feature is cited', () => {
  for (const f of features) {
    assert.ok(f.citations.length, `${f.id} has no citation`);
    assert.ok(f.summary, `${f.id} has no summary`);
    for (const c of f.citations) {
      assert.ok(byKey[c.key], `${f.id} cites unknown source '${c.key}'`);
      assert.ok(c.locator, `${f.id} cites ${c.key} without a locator`);
    }
  }
});

test('items not rendered are cited', () => {
  for (const n of notRendered) for (const c of n.citations) assert.ok(byKey[c.key], `${n.name}: ${c.key}`);
});

test('ids are unique and every source is used', () => {
  assert.equal(new Set(features.map((f) => f.id)).size, features.length);
  assert.equal(new Set(sources.map((s) => s.key)).size, sources.length);
  const used = new Set([...features.flatMap((f) => f.citations.map((c) => c.key)), ...notRendered.flatMap((n) => n.citations.map((c) => c.key))]);
  for (const s of sources) assert.ok(used.has(s.key), `source '${s.key}' is listed but never cited`);
});

test('59 features and about 4,100 houses, as in the macOS app', () => {
  assert.equal(features.length, 59);
  const houses = features.filter((f) => f.id.startsWith('infill')).reduce((n, f) => n + f.shapes.length, 0);
  near(houses, 4100, 150, 'houses');
});

test('geometry lies inside the terrain and footprints are valid', () => {
  for (const f of features) {
    for (const p of allPoints(f)) assert.ok(inBounds(p), `${f.id} has a point outside the terrain: ${p}`);
    for (const poly of footprints(f)) {
      assert.ok(poly.length >= 3, f.id);
      assert.ok(Math.abs(Poly.area(poly)) > 1, `${f.id} has a degenerate footprint`);
    }
  }
});

test('triangulation covers the polygon area', () => {
  for (const poly of [mountPoly, Poly.circle([0, 0], 10, 16), [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]]) {
    const p = Poly.ccw(poly);
    const t = Poly.triangulate(p);
    let s = 0;
    for (let i = 0; i < t.length; i += 3) s += Math.abs(Poly.area([p[t[i]], p[t[i + 1]], p[t[i + 2]]]));
    near(s, Math.abs(Poly.area(p)), 1e-6, 'area');
  }
});

test('Temple Mount wall lengths, area and agreement with OpenStreetMap', () => {
  const [sw, se, ne, nw] = mountCorners;
  near(dist(sw, nw), 488, 4.88, 'west wall');
  near(dist(sw, se), 280, 2.8, 'south wall');
  near(dist(nw, ne), 315, 3.15, 'north wall');
  near(dist(se, ne), 470, 4.7, 'east wall');
  [osmSW, osmSE, osmNE, osmNW].forEach((o, i) => assert.ok(dist(o, mountCorners[i]) < 6, `corner ${i} is ${dist(o, mountCorners[i])} m from OSM`));
  near(Math.abs(Poly.area(mountPoly)), 144000, 4000, 'area');
});

test("Royal Stoa: 162 columns, one stade long", () => {
  let columns = 0, longest = 0;
  for (const s of feature('tm-royal-stoa').shapes) {
    if (s.kind === 'columns') { columns += s.count; longest = Math.max(longest, dist(s.from, s.to)); }
  }
  assert.equal(columns, 162);
  near(longest + 4.6, 185, 1.85, 'length');
});

test('tombs lie outside the walls; the Holy Sepulchre quarry outside the Second Wall', () => {
  for (const id of ['tomb-absalom', 'tomb-zechariah', 'tomb-bene-hezir', 'tomb-helena', 'tomb-herod-family', 'akeldama']) {
    assert.ok(!insideCity(feature(id).anchor), `${id} is inside the city`);
  }
  assert.ok(!Poly.contains(secondPoly, feature('golgotha').anchor));
});

test('infill is deterministic', () => {
  const again = buildFeatures();
  for (const id of ['infill-upper', 'infill-lower', 'infill-second', 'infill-new']) {
    const a = features.find((f) => f.id === id).shapes, b = again.find((f) => f.id === id).shapes;
    assert.equal(a.length, b.length);
    assert.deepEqual(a[0].poly, b[0].poly);
  }
});

// MARK: Walk mode (the routes of the original SceneTests)

const grid = new WalkGrid(terrain());
for (const f of features) { const b = new ShapeBuilder(terrain(), grid); f.shapes.forEach((s) => b.add(s)); }

/** Moves a walker along a path in small steps, as walk mode does. Returns the final feet level, or null if blocked. */
function walk(path) {
  const pts = Poly.resample(path, 0.4);
  let feet = grid.surface(pts[0]);
  for (const p of pts.slice(1)) {
    const level = grid.step(feet, p);
    if (level === null) return { blockedAt: p, feet };
    feet = level;
  }
  return { feet };
}
const walkOK = (path) => { const r = walk(path); assert.ok(!r.blockedAt, `walker blocked at ${r.blockedAt?.map((v) => v.toFixed(1))}`); return r.feet; };

test('walk the stepped street from Siloam to the Temple Mount, under Robinson\'s Arch', () => {
  const M = mount, start = siloamFrame.p(0, 43);
  const end = walkOK([start, [22, -430], [5, -300], [-8, -180], [-12, -60], M.p(-6, -46), M.p(-6, -10), M.p(-6, 60)]);
  assert.ok(end - grid.surface(start) > 70, 'the street climbs from Siloam to the Temple Mount');
  assert.ok(end < esplanade - 8, "and passes under Robinson's Arch at street level");
});

test("climb Robinson's stair into the Royal Stoa", () => {
  near(walkOK([mount.p(-19, -46), mount.p(-19, 19.6), mount.p(-4, 19.6), mount.p(30, 19.6)]), esplanade, 0.05, 'level');
});

test('cross the bridge from the Upper City', () => {
  near(walkOK([mount.p(-132, 160), mount.p(-60, 160), mount.p(8, 160), mount.p(30, 160)]), esplanade, 0.05, 'level');
});

test('walk from the outer court up to the Court of the Priests', () => {
  const T = temple;
  near(walkOK([T.p(cu(289) + 30, 0), T.p(cu(216.5), 0)]), levelWomen, 0.05, 'Court of the Women');
  near(walkOK([T.p(cu(289) + 30, 0), T.p(cu(216.5), 0), T.p(cu(143), 0)]), levelIsrael, 0.05, 'Court of Israel');
  near(walkOK([T.p(cu(289) + 30, 0), T.p(cu(216.5), 0), T.p(cu(143), 0), T.p(cu(132), 0)]), levelPriests, 0.05, 'Court of the Priests');
});

test('the soreg and city walls block except at gates', () => {
  const T = temple;
  assert.ok(walk([T.p(cu(289) + 30, 14), T.p(cu(289), 14)]).blockedAt, 'the balustrade blocks');
  assert.ok(walk([[-300, 95], [-300, 140]]).blockedAt, 'the First Wall blocks');
  const g = Poly.nearest(firstWall, gateGennath);
  const n = [-g.t[1], g.t[0]];
  walkOK([[g.p[0] - n[0] * 14, g.p[1] - n[1] * 14], [g.p[0] + n[0] * 14, g.p[1] + n[1] * 14]]);
  assert.ok(walk([T.p(cu(90), 0), T.p(cu(40), 0)]).blockedAt, 'the sanctuary is solid');
});
