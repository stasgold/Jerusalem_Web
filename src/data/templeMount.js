// The Temple Mount: enclosure, porticoes, stoa, arches, gates, courts, altar, sanctuary, Antonia.
import { cu, add, sub, mul, neg, norm, sum } from '../geo.js';
import { S, feature, cite, dim, abs, groundMin, deck, Area, Confidence } from '../model.js';
import {
  esplanade, mount, south, north, temple, mountCorners, mountPoly, southPlaza, southSill,
  wallPrisms, decal, portico, battlement, battlementRect, pilasters,
} from './cityBase.js';
import { terrain } from './terrain.js';

// Inner-court levels, built up from the esplanade by the step counts of Mishnah Middot.
export const levelWomen = esplanade + cu(6);          // 12 steps of half a cubit (Middot 2:3)
export const levelIsrael = levelWomen + cu(7.5);      // 15 steps (Middot 2:5)
export const levelPriests = levelIsrael + cu(2.5);    // Middot 2:6
export const innerWallTop = esplanade + cu(40);       // War 5.196
export const sanctuaryTop = levelPriests + cu(100);   // Middot 4:6

const TM = Area.templeMount;

export function templeMountFeatures() {
  const M = mount, Sf = south, N = north, T = temple;
  const E = esplanade;
  const H = terrain();
  const [sw, se, ne, nw] = mountCorners;
  const eastDir = norm(sub(ne, se));
  const eastIn = [-eastDir[1], eastDir[0]];
  const out = [];

  // MARK: Enclosure
  const enclosure = [S.prism({ poly: mountPoly, bottom: groundMin(-3), top: abs(E), mat: 'ashlar', cap: 'paving' })];
  enclosure.push(...pilasters(sw, nw, neg(M.u)));
  // Under the Royal Stoa the pilasters stop at a cornice, with an attic of windows above.
  enclosure.push(...pilasters(sw, Sf.p(193, 0), neg(Sf.v), E + 10.6));
  enclosure.push(...pilasters(Sf.p(193, 0), se, neg(Sf.v)));
  enclosure.push(...pilasters(se, ne, neg(eastIn)));
  enclosure.push(...pilasters(nw, ne, N.v));
  out.push(feature({
    id: 'tm-enclosure', name: 'Temple Mount enclosure', altName: 'Har ha-Bayit / Haram al-Sharif',
    area: TM, confidence: Confidence.excavated, uncertainty: 4,
    summary: "Herod's platform, begun c. 20 BCE: a trapezoid of retaining walls built of margined ashlars, some over 10 m long, filled or vaulted behind to carry a level court. All four walls survive, in places to more than 30 courses. The corners are taken from the modern outline, which follows the Herodian walls; the upper zone with engaged pilasters is restored from fragments found at the foot of the walls and from the matching enclosure at Hebron.",
    dimensions: [dim('West wall', '488 m'), dim('South wall', '280 m'), dim('East wall', 'c. 470 m'), dim('North wall', 'c. 315 m'),
      dim('Area', 'c. 14.4 ha'), dim('Court level', 'c. 738 m above sea level'),
      dim('Height at SE corner', 'c. 48 m above bedrock'), dim('Largest stone', '13.6 m long (Western Wall tunnel)')],
    citations: [cite('warren1884', 'shafts and sections along the Haram walls'), cite('mazar2011', 'survey of all four walls'),
      cite('ritmeyer2006', 'chapter on the Herodian Temple Mount walls'), cite('ant', '15.380-402'), cite('war', '5.184-189'),
      cite('osm', 'relation 5862584, corner coordinates'),
      cite('photos', 'stone and joint colours, course heights and 108 measured block lengths of the masonry texture'),
      cite('holyland', 'battlements along the top of the enclosure')],
    anchor: M.p(150, 120), major: true, shapes: enclosure,
  }));

  // MARK: Porticoes
  const porticoes = [
    ...portico(M.p(0, 36), nw, M.u, { gaps: [[124, 12.6]], trimEnd: 16 }),
    ...portico(nw, ne, neg(N.v), { trimStart: 16, trimEnd: 16 }),
    ...portico(Sf.p(193, 0), se, Sf.v, { trimEnd: 16 }),
  ];
  out.push(feature({
    id: 'tm-porticoes', name: 'Porticoes of the outer court', area: TM, confidence: Confidence.textual, uncertainty: 4,
    summary: "Josephus describes double colonnades 30 cubits wide round the court, with monolithic columns of white marble 25 cubits high and panelled cedar ceilings. Nothing stands in place; their line is fixed by the enclosure walls they stood on. The arcaded form, with arches springing from the capitals, is modelled at the owner's request on the medieval arcades that stand on the platform today; Josephus does not describe what the columns carried, and Herodian colonnades more probably had flat architraves.",
    dimensions: [dim('Width', '30 cubits (15.75 m)'), dim('Column height', '25 cubits (13.1 m)')],
    citations: [cite('war', '5.190-192'), cite('ant', '15.396-401'), cite('ritmeyer2006', 'reconstruction of the porticoes')],
    anchor: M.p(8, 330), shapes: porticoes,
  }));

  out.push(feature({
    id: 'tm-solomon', name: "Solomon's Portico", area: TM, confidence: Confidence.textual, uncertainty: 4,
    summary: "The eastern colonnade, above the Kidron. Josephus calls it the work of Solomon and says it was older than Herod's building; a straight joint in the east wall 32 m north of the south-east corner shows where Herod's extension meets earlier masonry. The arcaded form follows the medieval arcades on the platform, as for the other porticoes.",
    dimensions: [dim('Length', 'c. 470 m')],
    citations: [cite('ant', '20.220-221'), cite('war', '5.185'), cite('nt', 'John 10:23; Acts 3:11; 5:12'),
      cite('warren1884', 'the straight joint in the east wall')],
    anchor: sum(se, mul(eastDir, 250), mul(eastIn, 8)), shapes: portico(se, ne, eastIn, { trimStart: 16, trimEnd: 16 }),
  }));

  // MARK: Royal Stoa
  const x0 = 6.0, x1 = 191.0;
  const rows = [1.9, 11.1, 24.8, 33.9];
  const stoa = [S.prism({ poly: Sf.rect(x0, 0, x1, 1.6), bottom: abs(E), top: abs(E + 15.2), mat: 'ashlar', cap: 'paving' })];
  for (const y of rows) {
    stoa.push(S.columns({ from: Sf.p(x0 + 2.3, y), to: Sf.p(x1 - 2.3, y), count: 40, diameter: 1.46, bottom: abs(E), height: 10, mat: 'marble' }));
  }
  stoa.push(S.columns({ from: Sf.p(x1 - 2.3, 15.7), to: Sf.p(x1 - 2.3, 20.2), count: 2, diameter: 1.46, bottom: abs(E), height: 10, mat: 'marble' }));
  for (const y of rows.slice(1)) {
    stoa.push(S.prism({ poly: Sf.rect(x0, y - 0.8, x1, y + 0.8), bottom: abs(E + 10), top: abs(E + 15.2), mat: 'limestone', stamp: 'none' }));
  }
  for (const y of [rows[1], rows[2]]) {
    stoa.push(S.prism({ poly: Sf.rect(x0, y - 0.7, x1, y + 0.7), bottom: abs(E + 15.2), top: abs(E + 29), mat: 'limestone', stamp: 'none' }));
  }
  stoa.push(S.prism({ poly: Sf.rect(x0 + 0.4, 0.4, x1 - 0.4, rows[1]), bottom: abs(E + 15.2), top: abs(E + 15.8), mat: 'timber', cap: 'tile', stamp: 'none' }));
  stoa.push(S.prism({ poly: Sf.rect(x0 + 0.4, rows[2], x1 - 0.4, 34.7), bottom: abs(E + 15.2), top: abs(E + 15.8), mat: 'timber', cap: 'tile', stamp: 'none' }));
  stoa.push(...battlement(Sf.p(x0, 0), Sf.p(x1, 0), Sf.v, E + 15.2, 'ashlar'));
  // Cornice over the pilasters and a row of square windows in the attic above it.
  stoa.push(decal(Sf.p(0.5, 0), Sf.p(192.5, 0), { outward: neg(Sf.v), depth: 0.42, bottom: E + 10.6, top: E + 11.2, mat: 'limestone' }));
  stoa.push(decal(Sf.p(0.5, 0), Sf.p(192.5, 0), { outward: neg(Sf.v), depth: 0.3, bottom: E + 14.7, top: E + 15.2, mat: 'limestone' }));
  const nBays = Math.floor(193 / 4.6);
  const bay = 193.0 / nBays;
  for (let k = 2; k < nBays - 1; k++) {
    const x = k * bay;
    stoa.push(decal(Sf.p(x - 0.85, 0), Sf.p(x + 0.85, 0), { outward: neg(Sf.v), depth: 0.10, bottom: E + 12.0, top: E + 13.7, mat: 'limestone' }));
    stoa.push(decal(Sf.p(x - 0.6, 0), Sf.p(x + 0.6, 0), { outward: neg(Sf.v), depth: 0.14, bottom: E + 12.25, top: E + 13.45, mat: 'dark' }));
  }
  stoa.push(S.gable({ rect: Sf.rect(x0, rows[1] - 0.7, x1, rows[2] + 0.7), eaves: abs(E + 29), rise: 2.6, mat: 'tile' }));
  for (const xe of [x0, x1 - 1.4]) {
    stoa.push(S.prism({ poly: Sf.rect(xe, 0, xe + 1.4, rows[1]), bottom: abs(E), top: abs(E + 15.2), mat: 'limestone' }));
    stoa.push(S.prism({ poly: Sf.rect(xe, rows[2], xe + 1.4, 34.7), bottom: abs(E), top: abs(E + 15.2), mat: 'limestone' }));
    stoa.push(S.prism({ poly: Sf.rect(xe, rows[1], xe + 1.4, rows[2]), bottom: abs(E + 12), top: abs(E + 29), mat: 'limestone', stamp: 'none' }));
  }
  out.push(feature({
    id: 'tm-royal-stoa', name: 'Royal Stoa', altName: 'Stoa Basileios', area: TM, confidence: Confidence.partial, uncertainty: 6,
    summary: 'A basilica along the south wall: four rows of Corinthian columns forming a tall nave and two aisles, which Josephus calls more noteworthy than any structure under the sun. Column drums, capitals and carved ceiling pieces were found in the debris below the south wall. The length of one stade and the count of 162 columns are his; the heights he gives are hard to reconcile and are followed only approximately.',
    dimensions: [dim('Length', '1 stade (c. 185 m)'), dim('Columns', '162 in four rows'), dim('Aisles', '30 ft wide, over 50 ft high'),
      dim('Nave', '45 ft wide, twice the aisle height'), dim('Column girth', 'three men with arms outstretched (c. 1.46 m diameter)')],
    citations: [cite('ant', '15.411-416'), cite('peleg2017', 'architectural fragments and reconstruction'),
      cite('mazar1975', 'finds below the southern wall'), cite('ritmeyer2006', 'reconstruction of the Royal Stoa'),
      cite('holyland', 'tiled roofs of the stoa')],
    anchor: Sf.p(98, 18), major: true, shapes: stoa,
  }));

  // MARK: Robinson's Arch
  // After the Ritmeyer model: a flight over the arch climbs to a gate porch in the wall; at the pier it turns south on a
  // landing and comes down in wide flights between solid balustrades, over vaults that get lower towards the street.
  const rTop = E - 3;
  const rFoot = H.groundMin([M.p(-25.4, -40), M.p(-12.8, -40)]);
  const robinson = [
    S.arch({ center: M.p(-6.4, 19.6), along: M.u, width: 12.8, thickness: 15.2, length: 12.8, spring: abs(rTop - 7.6), top: abs(rTop), mat: 'ashlar' }),
    S.arch({ center: M.p(-6.4, 19.6), along: M.u, width: 12.8, thickness: 15.4, length: 12.8, spring: abs(rTop - 7.6), top: abs(rTop), ring: 1.1, mat: 'limestone' }),
    S.stairs({ lowA: M.p(-12.8, 12), lowB: M.p(-12.8, 27.2), highA: M.p(0, 12), highB: M.p(0, 27.2),
      lowElev: abs(rTop), highElev: abs(E), steps: 12, mat: 'paving', parapet: 1.1, side: 'ashlar', soffit: abs(rTop - 0.4) }),
    // Pier and turning landing. (A limestone cap: a paved cap would be given battlements.)
    S.prism({ poly: M.rect(-25.4, 12, -12.8, 27.2), bottom: groundMin(-2), top: abs(rTop), mat: 'ashlar', cap: 'limestone' }),
    S.prism({ poly: M.rect(-25.95, 26.6, -12.8, 27.75), bottom: abs(rTop - 0.5), top: abs(rTop + 1.35), mat: 'ashlar', cap: 'limestone' }),
    S.prism({ poly: M.rect(-25.95, 12, -25.4, 26.6), bottom: abs(rTop - 0.5), top: abs(rTop + 1.35), mat: 'ashlar', cap: 'limestone' }),
    S.stairs({ lowA: M.p(-25.4, -40), lowB: M.p(-12.8, -40), highA: M.p(-25.4, 12), highB: M.p(-12.8, 12),
      lowElev: abs(rFoot), highElev: abs(rTop), steps: 84, mat: 'paving', parapet: 1.1, landings: 3, side: 'ashlar' }),
    // Gate porch at the head of the stair: four columns between antae under an entablature.
    S.prism({ poly: M.rect(-0.2, 10, 5.4, 12.6), bottom: abs(E), top: abs(E + 10), mat: 'limestone' }),
    S.prism({ poly: M.rect(-0.2, 26.6, 5.4, 29.2), bottom: abs(E), top: abs(E + 10), mat: 'limestone' }),
    S.columns({ from: M.p(1.2, 14.9), to: M.p(1.2, 24.3), count: 4, diameter: 1.3, bottom: abs(E), height: 10, mat: 'marble' }),
    S.prism({ poly: M.rect(-0.2, 10, 5.4, 29.2), bottom: abs(E + 10), top: abs(E + 12.2), mat: 'limestone', stamp: 'none' }),
    S.prism({ poly: M.rect(-0.75, 9.45, 5.95, 29.75), bottom: abs(E + 12.2), top: abs(E + 12.9), mat: 'limestone', cap: 'limestone', stamp: 'none' }),
  ];
  // Vaults under the stair: open to the west, blind towards the street.
  for (const [y, w, h] of [[5.0, 6.0, 10.5], [-3.0, 6.0, 8.6], [-11.0, 5.5, 6.4], [-19.0, 5.0, 4.3], [-26.5, 4.0, 2.4]]) {
    const gW = Math.max(H.height(M.p(-26, y - w / 2)), H.height(M.p(-26, y + w / 2))) + 0.05;
    const gE = Math.max(H.height(M.p(-12.2, y - w / 2)), H.height(M.p(-12.2, y + w / 2))) + 0.05;
    robinson.push(S.portal({ a: M.p(-25.95, y - w / 2), b: M.p(-25.95, y + w / 2), outward: neg(M.u), sill: abs(gW), height: h, arched: true, door: 'dark', frame: 'ashlar' }));
    robinson.push(S.portal({ a: M.p(-12.25, y + w / 2), b: M.p(-12.25, y - w / 2), outward: M.u, sill: abs(gE), height: h, arched: true, door: 'dark', frame: 'ashlar' }));
  }
  // The great vault through the pier, seen from the west.
  robinson.push(S.portal({ a: M.p(-25.4, 15.6), b: M.p(-25.4, 23.6), outward: neg(M.u), sill: abs(H.height(M.p(-26, 19.6)) + 0.05), height: 12, arched: true, door: 'dark', frame: 'ashlar' }));
  // Shops in the pier, opening on the street under the arch.
  for (const y of [14.0, 17.6, 21.2, 24.8]) {
    robinson.push(S.portal({ a: M.p(-12.8, y + 1.1), b: M.p(-12.8, y - 1.1), outward: M.u, sill: abs(H.height(M.p(-12, y)) + 0.05), height: 3.2, door: 'dark', frame: 'limestone' }));
  }
  out.push(feature({
    id: 'tm-robinson', name: "Robinson's Arch and stairway", area: TM, confidence: Confidence.excavated, uncertainty: 3,
    summary: 'The spring of a great arch still projects from the Western Wall 12 m north of the south-west corner. Excavation found its pier, with shops in it, and the fallen voussoirs lying on the Herodian street. The arch carried a stairway that turned south and came down to the street over a row of vaults of decreasing height; the vaults are shown here as a solid ramp.',
    dimensions: [dim('Width of arch', '15.2 m'), dim('Span', '12.8 m'), dim('Height above street', 'c. 17.5 m (drawn lower here, with a flight over the arch)'), dim('Distance from SW corner', '12 m')],
    citations: [cite('mazar1975', "the Robinson's Arch excavations"), cite('bendov1985', 'pier, shops and stairway'),
      cite('reich2000', 'pp. 340-350'), cite('ant', '15.410 (the gate leading to the other part of the city by many steps)'),
      cite('ritmeyer2006', 'model of the stairway: flight over the arch, turning landing, flights on vaults, gate porch')],
    anchor: M.p(-14, 19.6), major: true, shapes: robinson,
  }));

  // MARK: Wilson's Arch and the bridge
  // After Ritmeyer's drawings: a viaduct of arches on piers, ending in a gatehouse on the wall.
  const bridge = [];
  for (const [c, w] of [[-6.4, 12.8], [-25.3, 17.8], [-47.0, 18.4], [-69.0, 18.4], [-91.0, 18.4], [-107.9, 8.2]]) {
    const spring = E - 1.3 - w / 2;
    bridge.push(S.arch({ center: M.p(c, 160), along: M.u, width: w, thickness: 13.4, length: w, spring: abs(spring), top: abs(E), mat: 'ashlar' }));
    bridge.push(S.arch({ center: M.p(c, 160), along: M.u, width: w, thickness: 13.6, length: w, spring: abs(spring), top: abs(E), ring: 1.0, mat: 'limestone' }));
  }
  for (const x of [-14.6, -36.0, -58.0, -80.0, -102.0]) {
    bridge.push(S.prism({ poly: M.rect(x - 1.8, 153.3, x + 1.8, 166.7), bottom: groundMin(-2), top: abs(E), mat: 'ashlar', cap: 'limestone' }));
  }
  bridge.push(S.stairs({ lowA: M.p(-126, 153.3), lowB: M.p(-126, 166.7), highA: M.p(-112, 153.3), highB: M.p(-112, 166.7),
    lowElev: groundMin(0), highElev: abs(E), steps: 14, mat: 'paving', parapet: 1.1 }));
  bridge.push(S.prism({ poly: M.rect(-112, 153.3, 0, 153.9), bottom: abs(E), top: abs(E + 1.1), mat: 'ashlar', cap: 'limestone', stamp: 'none' }));
  bridge.push(S.prism({ poly: M.rect(-112, 166.1, 0, 166.7), bottom: abs(E), top: abs(E + 1.1), mat: 'ashlar', cap: 'limestone', stamp: 'none' }));
  // Gatehouse where the bridge meets the wall.
  bridge.push(S.prism({ poly: M.rect(-0.3, 150.3, 16.3, 153.7), bottom: abs(E), top: abs(E + 17), mat: 'ashlar', cap: 'paving' }));
  bridge.push(S.prism({ poly: M.rect(-0.3, 166.3, 16.3, 169.7), bottom: abs(E), top: abs(E + 17), mat: 'ashlar', cap: 'paving' }));
  bridge.push(S.prism({ poly: M.rect(-0.3, 153.7, 16.3, 166.3), bottom: abs(E + 9), top: abs(E + 17), mat: 'ashlar', cap: 'paving', stamp: 'none' }));
  bridge.push(...battlement(M.p(-0.3, 150.3), M.p(-0.3, 169.7), M.u, E + 17, 'ashlar'));
  out.push(feature({
    id: 'tm-wilson', name: "Wilson's Arch and the bridge", area: TM, confidence: Confidence.partial, uncertainty: 15,
    summary: 'The first arch of a bridge that crossed the Tyropoeon from the Upper City to the Temple Mount and carried the aqueduct. The arch stands complete; radiocarbon dating of its mortar puts the first build under Herod and a widening in the decades before 70 CE. Its distance from the south-west corner is entered from memory of the published plans and may be 15 m out; the western arches are restored.',
    dimensions: [dim('Span', '12.8 m'), dim('Width', '13.4 m'), dim('Bridge length', 'c. 110 m')],
    citations: [cite('warren1884', "Wilson's Arch and the causeway vaults"), cite('onn2011', 'preliminary report'),
      cite('regev2020', 'whole article'), cite('war', '2.344; 6.325 (the bridge joining the Upper City to the Temple)'),
      cite('ritmeyer2006', 'reconstruction drawing: arches of the bridge and the gatehouse on the wall')],
    anchor: M.p(-40, 160), shapes: bridge,
  }));

  // MARK: Gates in the western wall
  const westGate = (id, name, y, summary, dimensions, citations, uncertainty) => {
    const sill = H.height(M.p(-4, y)) + 0.6;
    return feature({ id, name, area: TM, confidence: Confidence.excavated, uncertainty, summary, dimensions, citations, anchor: M.p(-1, y + 2.8),
      shapes: [S.portal({ a: M.p(0, y), b: M.p(0, y + 5.6), outward: neg(M.u), sill: abs(sill), height: 8.8, door: 'door', frame: 'limestone' })] });
  };
  out.push(westGate('tm-barclay', "Barclay's Gate", 82,
    "One of the four western gates Josephus mentions, probably the Kiponus Gate of the Mishnah. Its lintel, a single stone, is visible above the women's section of the Western Wall; the passage behind it survives as a hall inside the platform.",
    [dim('Lintel', '7.5 m long, 2.1 m high'), dim('Opening', '5.6 m wide, 8.8 m high'), dim('From SW corner', 'c. 82 m')],
    [cite('warren1884', "Barclay's Gate"), cite('middot', '1:3'), cite('ant', '15.410'), cite('ritmeyer2006', 'the western gates')], 5));
  out.push(westGate('tm-warren-gate', "Warren's Gate", 206,
    'The northernmost of the two western gates at street level, found by Warren and now seen in the Western Wall tunnel. Its position along the wall is approximate here.',
    [dim('Opening', 'c. 5.6 m wide')],
    [cite('warren1884', "the gate north of Wilson's Arch"), cite('ant', '15.410'), cite('ritmeyer2006', 'the western gates')], 20));

  // MARK: Southern gates and steps
  // After Ritmeyer's reconstruction: two stairways climbing from a levelled plaza to a terrace along the wall,
  // with a block of buildings (ritual baths) between them.
  const plazaE = southPlaza, sill = southSill;
  const shop = (xa, xb) => S.portal({ a: Sf.p(xa, -22), b: Sf.p(xb, -22), outward: neg(Sf.v), sill: abs(plazaE), height: 2.9, door: 'dark', frame: 'limestone' });
  out.push(feature({
    id: 'tm-double-gate', name: 'Double Gate and the southern steps', altName: 'Western Huldah Gate', area: TM, confidence: Confidence.excavated, uncertainty: 5,
    summary: "The main pilgrim entrance. A stairway 64 m wide, with alternating deep and shallow treads cut partly in the rock, climbs from a paved plaza to a double gateway; behind it a ramped passage with carved Herodian domes still rises inside the platform to the court. Half of the gate's lintel is visible beside the later tower built against the wall.",
    dimensions: [dim('Stair width', '64 m'), dim('Steps', '30 (27 drawn)'), dim('Gate width', '12.8 m'), dim('West jamb from SW corner', 'c. 100 m')],
    citations: [cite('mazar1975', 'the southern wall excavations'), cite('bendov1985', 'the monumental stairway'),
      cite('middot', '1:3 (the two Huldah gates on the south)'), cite('ritmeyer2006', 'the Double Gate; reconstruction drawing of the southern stairways, terrace and the building between them')],
    anchor: Sf.p(107, -6), major: true,
    shapes: [
      S.prism({ poly: Sf.rect(55, -46, 215, -22), bottom: groundMin(-1), top: abs(plazaE), mat: 'paving', cap: 'paving' }),
      S.stairs({ lowA: Sf.p(75, -22), lowB: Sf.p(139, -22), highA: Sf.p(75, -4), highB: Sf.p(139, -4), lowElev: abs(plazaE), highElev: abs(sill), steps: 27, mat: 'paving', parapet: 0.9 }),
      // Terrace along the wall joining the two gates.
      S.prism({ poly: Sf.rect(74.45, -4, 203.55, 0), bottom: groundMin(-1), top: abs(sill), mat: 'ashlar', cap: 'paving' }),
      // Block of buildings between the stairways, entered from the plaza.
      S.prism({ poly: Sf.rect(139.55, -22, 177.45, -4), bottom: groundMin(-1), top: abs(sill), mat: 'ashlar', cap: 'paving' }),
      S.prism({ poly: Sf.rect(139.55, -22, 177.45, -21.4), bottom: abs(sill), top: abs(sill + 0.9), mat: 'ashlar', cap: 'limestone' }),
      shop(147.9, 146.1), shop(155.9, 154.1), shop(163.9, 162.1), shop(171.9, 170.1),
      S.portal({ a: Sf.p(105.9, 0), b: Sf.p(101.1, 0), outward: neg(Sf.v), sill: abs(sill), height: 7.2, door: 'door', frame: 'limestone', pediment: true }),
      S.portal({ a: Sf.p(112.9, 0), b: Sf.p(108.1, 0), outward: neg(Sf.v), sill: abs(sill), height: 7.2, door: 'door', frame: 'limestone', pediment: true }),
    ],
  }));
  out.push(feature({
    id: 'tm-triple-gate', name: 'Triple Gate', altName: 'Eastern Huldah Gate', area: TM, confidence: Confidence.partial, uncertainty: 6,
    summary: 'The eastern of the two southern gates. The present three arches are later; only the moulded west jamb is Herodian. A narrower stairway, largely restored on a vault, led up to it.',
    dimensions: [dim('Gate width', 'c. 15 m'), dim('West jamb from SW corner', 'c. 183 m')],
    citations: [cite('mazar1975', 'the southern wall excavations'), cite('middot', '1:3'), cite('ritmeyer2006', 'the Triple Gate; reconstruction with three lintelled doorways')],
    anchor: Sf.p(190, -6),
    shapes: [
      S.stairs({ lowA: Sf.p(178, -22), lowB: Sf.p(203, -22), highA: Sf.p(178, -4), highB: Sf.p(203, -4), lowElev: abs(plazaE), highElev: abs(sill), steps: 27, mat: 'paving', parapet: 0.9 }),
      S.portal({ a: Sf.p(186.6, 0), b: Sf.p(183.4, 0), outward: neg(Sf.v), sill: abs(sill), height: 5.0, door: 'door', frame: 'limestone' }),
      S.portal({ a: Sf.p(192.6, 0), b: Sf.p(188.4, 0), outward: neg(Sf.v), sill: abs(sill), height: 6.6, door: 'door', frame: 'limestone', pediment: true }),
      S.portal({ a: Sf.p(197.6, 0), b: Sf.p(194.4, 0), outward: neg(Sf.v), sill: abs(sill), height: 5.0, door: 'door', frame: 'limestone' }),
    ],
  }));

  // MARK: East gate
  const eg = add(se, mul(eastDir, 312));
  const egSill = H.height(sub(eg, mul(eastIn, 6))) + 1;
  out.push(feature({
    id: 'tm-east-gate', name: 'Eastern (Shushan) Gate', area: TM, confidence: Confidence.textual, uncertainty: 25,
    summary: 'The Mishnah names one gate on the east, decorated with a view of Susa. It is usually placed under the later Golden Gate, where two monolithic gateposts of an earlier gate remain inside the structure.',
    dimensions: [dim('From SE corner', 'c. 312 m')],
    citations: [cite('middot', '1:3'), cite('ritmeyer2006', 'the eastern wall and the Golden Gate')],
    anchor: eg, shapes: [S.portal({ a: sub(eg, mul(eastDir, 2.4)), b: add(eg, mul(eastDir, 2.4)), outward: neg(eastIn), sill: abs(egSill), height: 7.2, door: 'door', frame: 'limestone', pediment: true })],
  }));

  // MARK: Soreg and the stepped terrace
  const xW = cu(-43), xAz = cu(149), xE = cu(289), yO = cu(72.5), yI = cu(70);
  const soreg = [];
  for (let k = 0; k < 6; k++) {
    const e = 0.875 * (6 - k);
    soreg.push(S.prism({ poly: T.rect(xW - e, -yO - e, xE + e, yO + e), bottom: abs(E - 0.5), top: abs(E + 0.525 * (k + 1)), mat: 'limestone', cap: 'paving' }));
  }
  const so = 10.5;
  const soregGaps = [[[xE + so, 0], 5], [[xW - so, 0], 4]];
  for (const x of [cu(20), cu(70), cu(120), cu(216.5)]) {
    soregGaps.push([[x, yO + so], 4]);
    soregGaps.push([[x, -yO - so], 4]);
  }
  soreg.push(...wallPrisms(T, [[xW - so, -yO - so], [xE + so, -yO - so], [xE + so, yO + so], [xW - so, yO + so]],
    { closed: true, t: 0.5, bottom: E, top: E + 1.6, mat: 'marble', gaps: soregGaps }));
  out.push(feature({
    id: 'tm-soreg', name: 'Soreg and the rampart (hel)', area: TM, confidence: Confidence.partial, uncertainty: 20,
    summary: "A stone balustrade marked the limit beyond which gentiles could not go, with notices in Greek and Latin threatening death. One complete Greek notice and part of a second have been found. Inside it, steps led up a terrace 10 cubits wide to the gates. The balustrade's position depends on where the Temple itself is placed.",
    dimensions: [dim('Balustrade height', '3 cubits (Josephus) or 10 handbreadths (Mishnah)'), dim('Terrace', '10 cubits wide, 12 steps')],
    citations: [cite('war', '5.193-197'), cite('ant', '15.417'), cite('middot', '2:3'), cite('clermont1872', 'the warning inscription')],
    anchor: T.p(xE + so, -22), shapes: soreg,
  }));

  // MARK: Court of the Women
  /** Doorway through a court wall, as on the Holyland model: the wall carried over the opening,
   *  a stone frame on the outer face and closed golden doors. */
  const doorway = (x, y, alongY, outward, floor, width, height, pediment = false) => {
    const hw = width / 2, hg = cu(5);   // the gap left in the wall is 10 cubits
    const over = alongY ? T.rect(x - cu(2.5), y - hg, x + cu(2.5), y + hg) : T.rect(x - hg, y - cu(2.5), x + hg, y + cu(2.5));
    const res = [S.prism({ poly: over, bottom: abs(floor + height), top: abs(innerWallTop), mat: 'marbleAshlar', stamp: deck(innerWallTop - floor - height) })];
    // Cheeks narrowing the gap to the door width.
    if (hg - hw > 0.05) {
      for (const sgn of [-1, 1]) {
        const a = sgn * hw, b = sgn * hg;
        const cheek = alongY ? T.rect(x - cu(2.5), y + Math.min(a, b), x + cu(2.5), y + Math.max(a, b))
          : T.rect(x + Math.min(a, b), y - cu(2.5), x + Math.max(a, b), y + cu(2.5));
        res.push(S.prism({ poly: cheek, bottom: abs(floor - 0.5), top: abs(floor + height), mat: 'marbleAshlar' }));
      }
    }
    const face = alongY ? [x + (outward[0] > 0 ? cu(2.5) : -cu(2.5)), y] : [x, y + (outward[1] > 0 ? cu(2.5) : -cu(2.5))];
    const along = alongY ? [0, 1] : [1, 0];
    res.push(S.portal({ a: T.p(face[0] - along[0] * hw, face[1] - along[1] * hw), b: T.p(face[0] + along[0] * hw, face[1] + along[1] * hw),
      outward: add(mul(T.u, outward[0]), mul(T.v, outward[1])), sill: abs(floor), height, door: 'goldDoor', frame: 'marble', pediment }));
    return res;
  };

  const women = [S.prism({ poly: T.rect(xAz + cu(2.5), -yO, xE, yO), bottom: abs(E), top: abs(levelWomen), mat: 'marbleAshlar', cap: 'paving' })];
  women.push(...wallPrisms(T, [[xAz, -yI], [xE - cu(2.5), -yI], [xE - cu(2.5), yI], [xAz, yI]],
    { t: cu(5), bottom: levelWomen - 0.5, top: innerWallTop, mat: 'marbleAshlar',
      gaps: [[[xE - cu(2.5), 0], cu(10)], [[cu(216.5), yI], cu(10)], [[cu(216.5), -yI], cu(10)]] }));
  women.push(...doorway(xE - cu(2.5), 0, true, [1, 0], levelWomen, cu(10), cu(20)));
  women.push(...doorway(cu(216.5), yI, false, [0, 1], levelWomen, cu(7), cu(14), true));
  women.push(...doorway(cu(216.5), -yI, false, [0, -1], levelWomen, cu(7), cu(14), true));
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      // Four corner chambers of 40 cubits, open to the sky in the middle (Middot 2:5): a flat roof on columns
      // runs round each, as on the Holyland model.
      const xOut = sx > 0 ? xE - cu(5) : xAz + cu(2.5);
      const xIn = xOut - sx * cu(40);
      const yOut = sy * (yO - cu(5)), yIn = sy * (yO - cu(45));
      const ax0 = Math.min(xIn, xOut), ax1 = Math.max(xIn, xOut), ay0 = Math.min(yIn, yOut), ay1 = Math.max(yIn, yOut);
      const w = cu(10), rb = levelWomen + cu(13), rt = levelWomen + cu(14.6);
      for (const r of [[ax0, ay0, ax1, ay0 + w], [ax0, ay1 - w, ax1, ay1], [ax0, ay0 + w, ax0 + w, ay1 - w], [ax1 - w, ay0 + w, ax1, ay1 - w]]) {
        women.push(S.prism({ poly: T.rect(...r), bottom: abs(rb), top: abs(rt), mat: 'marbleAshlar', cap: 'marbleAshlar', stamp: 'none' }));
      }
      women.push(S.columns({ from: T.p(xIn + sx * 0.6, yIn + sy * 0.6), to: T.p(xIn + sx * 0.6, yOut - sy * 0.6), count: 6, diameter: 0.95, bottom: abs(levelWomen), height: cu(13), mat: 'marble' }));
      women.push(S.columns({ from: T.p(xIn + sx * 0.6, yIn + sy * 0.6), to: T.p(xOut - sx * 0.6, yIn + sy * 0.6), count: 6, diameter: 0.95, bottom: abs(levelWomen), height: cu(13), mat: 'marble' }));
      // Columns round the open middle.
      const ix0 = ax0 + w - 0.5, ix1 = ax1 - w + 0.5, iy0 = ay0 + w - 0.5, iy1 = ay1 - w + 0.5;
      women.push(S.columns({ from: T.p(ix0, iy0), to: T.p(ix1, iy0), count: 4, diameter: 0.8, bottom: abs(levelWomen), height: cu(13), mat: 'marble' }));
      women.push(S.columns({ from: T.p(ix0, iy1), to: T.p(ix1, iy1), count: 4, diameter: 0.8, bottom: abs(levelWomen), height: cu(13), mat: 'marble' }));
    }
  }
  // Four towers at the corners of the court, as on the Holyland model.
  for (const cx of [xAz, xE - 3.6]) {
    for (const cy of [-yO + 3.6, yO - 3.6]) {
      women.push(S.prism({ poly: T.rect(cx - 4.6, cy - 4.6, cx + 4.6, cy + 4.6), bottom: abs(E), top: abs(innerWallTop + cu(12)), mat: 'marbleAshlar', cap: 'marbleAshlar' }));
    }
  }
  out.push(feature({
    id: 'tm-court-women', name: 'Court of the Women', altName: 'Ezrat Nashim', area: TM, confidence: Confidence.textual, uncertainty: 20,
    summary: "The first inner court, open to all Jews, a square of 135 cubits with an unroofed chamber in each corner. No trace has been identified; its size is the Mishnah's and its position follows from placing the Holy of Holies on the rock under the Dome of the Rock. With that placing, its east end comes close to the eastern portico.",
    dimensions: [dim('Court', '135 x 135 cubits (70.9 m)'), dim('Corner chambers', '40 x 40 cubits'), dim('Level', '12 steps above the outer court')],
    citations: [cite('middot', '2:5'), cite('war', '5.198-200'), cite('ritmeyer2006', 'location of the Temple courts')],
    anchor: T.p(cu(216.5), 0), shapes: women,
  }));

  // MARK: Nicanor Gate
  // After the Holyland model. Widths are measured from the model with the main doors set to 10 cubits (Middot 2:3);
  // heights are the model's stretched by 1.3 so the cornice meets the top of the court walls, as it does on the model.
  const nicanor = [];
  const P = levelIsrael;   // the gate stands on a platform at the level of the inner court
  const xF = xAz + cu(5), nU = T.u, hw = cu(17);
  const doorTop = P + 7.8, lintelTop = P + 9.1, cornice = innerWallTop - 1.0, attic = innerWallTop + 1.2;
  // Fifteen steps of half a cubit (Middot 2:5), curved in plan and wider than the gate, as on the model.
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const ry = 11.8 - 5.8 * t, rx = 8.0 - 4.6 * t;
    const poly = [];
    for (let k = 0; k <= 16; k++) {
      const th = -Math.PI / 2 + Math.PI * k / 16;
      poly.push(T.p(xF + rx * Math.cos(th), ry * Math.sin(th)));
    }
    nicanor.push(S.prism({ poly, bottom: abs(levelWomen - 0.5), top: abs(levelWomen + (P - levelWomen) * (i + 1) / 15), mat: 'marble' }));
  }
  nicanor.push(...wallPrisms(T, [[xAz, -yI], [xAz, yI]], { t: cu(5), bottom: levelWomen - 0.5, top: innerWallTop, mat: 'marbleAshlar', gaps: [[[xAz, 0], cu(10)]] }));
  // Gatehouse: piers either side of the passage, the arch over it, a podium along the face, the floor of the passage,
  // a cornice and a crenellated attic.
  for (const sy of [-1, 1]) {
    nicanor.push(S.prism({ poly: T.rect(xAz - cu(5), sy > 0 ? cu(5) : -hw, xF, sy > 0 ? hw : -cu(5)), bottom: abs(E), top: abs(cornice), mat: 'marbleAshlar' }));
  }
  nicanor.push(S.arch({ center: T.p(xAz, 0), along: T.v, width: cu(10), thickness: cu(10), length: cu(10), spring: abs(lintelTop), top: abs(cornice), mat: 'marbleAshlar' }));
  nicanor.push(S.prism({ poly: T.rect(xAz - cu(5), -cu(5), xF + 0.2, cu(5)), bottom: abs(E), top: abs(P), mat: 'marbleAshlar', cap: 'paving' }));
  nicanor.push(S.prism({ poly: T.rect(xF, -hw, xF + 1.2, hw), bottom: abs(levelWomen - 0.5), top: abs(P), mat: 'marbleAshlar', cap: 'marble' }));
  nicanor.push(S.prism({ poly: T.rect(xAz - cu(5) - 0.5, -hw - 0.5, xF + 0.5, hw + 0.5), bottom: abs(cornice), top: abs(cornice + 1.0), mat: 'marble', cap: 'marble', stamp: 'none' }));
  nicanor.push(S.prism({ poly: T.rect(xAz - cu(5), -hw, xF, hw), bottom: abs(cornice + 1.0), top: abs(attic), mat: 'marbleAshlar', cap: 'marbleAshlar', stamp: 'none' }));
  nicanor.push(...battlementRect(T, xAz - cu(5), -hw, xF, hw, attic, 'marble'));
  // Main doors, closed, under a lintel carried on two columns with gilded capitals.
  nicanor.push(decal(T.p(xF, -cu(5)), T.p(xF, cu(5)), { outward: nU, depth: 0.12, bottom: P, top: doorTop, mat: 'bronzeDoor' }));
  nicanor.push(S.panel({ a: T.p(xF + 0.12, -cu(5)), b: T.p(xF + 0.12, cu(5)), outward: nU, bottom: abs(P), top: abs(doorTop), mat: 'nicanorDoor' }));
  nicanor.push(decal(T.p(xF, -4.5), T.p(xF, 4.5), { outward: nU, depth: 1.25, bottom: doorTop, top: lintelTop, mat: 'marble' }));
  for (const sy of [-1, 1]) {
    const y = sy * 3.4;
    nicanor.push(S.columns({ from: T.p(xF + 0.6, y), to: T.p(xF + 0.6, y), count: 1, diameter: 1.0, bottom: abs(P), height: doorTop - 0.9 - P, mat: 'marble' }));
    nicanor.push(S.prism({ poly: T.rect(xF + 0.05, y - 0.6, xF + 1.15, y + 0.6), bottom: abs(doorTop - 0.9), top: abs(doorTop), mat: 'gold', stamp: 'none' }));
  }
  // Lunette over the lintel: a marble arch round a grille of bronze bars on a dark ground.
  const r = cu(5);
  nicanor.push(S.arch({ center: T.p(xF + 0.2, 0), along: T.v, width: 2 * r, thickness: 0.4, length: 0, spring: abs(lintelTop), top: abs(lintelTop), ring: 0.65, mat: 'marble' }));
  nicanor.push(decal(T.p(xF - 0.3, -r), T.p(xF - 0.3, r), { outward: nU, depth: 0.1, bottom: lintelTop, top: lintelTop + r, mat: 'dark' }));
  for (let k = -6; k <= 6; k++) {
    const y = k * r / 7, h = Math.sqrt(r * r - y * y);
    nicanor.push(decal(T.p(xF - 0.2, y - 0.07), T.p(xF - 0.2, y + 0.07), { outward: nU, depth: 0.12, bottom: lintelTop, top: lintelTop + h, mat: 'bronzeDoor' }));
  }
  for (const sy of [-1, 1]) {
    // Side door: bronze, between marble jambs, under a lintel and an arched hood.
    const y = sy * 5.8, w = 2.1, h = 4.0;
    nicanor.push(decal(T.p(xF, y - w / 2), T.p(xF, y + w / 2), { outward: nU, depth: 0.04, bottom: P, top: P + h, mat: 'bronzeDoor' }));
    nicanor.push(S.panel({ a: T.p(xF + 0.04, y - w / 2), b: T.p(xF + 0.04, y + w / 2), outward: nU, bottom: abs(P), top: abs(P + h), mat: 'nicanorSideDoor' }));
    for (const e of [-1, 1]) {
      const y0 = y + e * (w / 2 + 0.175);
      nicanor.push(decal(T.p(xF, y0 - 0.175), T.p(xF, y0 + 0.175), { outward: nU, depth: 0.3, bottom: P, top: P + h, mat: 'marble' }));
    }
    // Lintel and arched hood exactly as wide as the jambs: the ring springs from the jambs' faces.
    nicanor.push(decal(T.p(xF, y - w / 2 - 0.35), T.p(xF, y + w / 2 + 0.35), { outward: nU, depth: 0.3, bottom: P + h, top: P + h + 0.3, mat: 'marble' }));
    nicanor.push(S.arch({ center: T.p(xF + 0.15, y), along: T.v, width: w, thickness: 0.3, length: 0, spring: abs(P + h + 0.3), top: abs(P + h + 0.3), ring: 0.35, mat: 'marble' }));
    // Arched window above.
    nicanor.push(S.portal({ a: T.p(xF, y - sy * 0.7), b: T.p(xF, y + sy * 0.7), outward: nU, sill: abs(P + 8.7), height: 3.0, arched: true, door: 'dark', frame: 'marble' }));
    // Corner pilaster with a gilded Corinthian capital.
    const yc = sy * (hw - 0.7);
    nicanor.push(S.columns({ from: T.p(xF + 0.45, yc), to: T.p(xF + 0.45, yc), count: 1, diameter: 1.2, bottom: abs(P), height: cornice - 1.7 - P, mat: 'marble' }));
    nicanor.push(S.prism({ poly: T.rect(xF - 0.1, yc - 0.85, xF + 1.3, yc + 0.85), bottom: abs(cornice - 1.7), top: abs(cornice), mat: 'gold', stamp: 'none' }));
  }
  out.push(feature({
    id: 'tm-nicanor', name: 'Nicanor Gate and the fifteen steps', area: TM, confidence: Confidence.textual, uncertainty: 20,
    summary: 'The gate between the Court of the Women and the Court of Israel, reached by fifteen semicircular steps on which the Levites sang. Josephus describes a gate of Corinthian bronze of great size. An ossuary inscribed for the family of "Nicanor of Alexandria who made the doors" was found on Mount Scopus in 1902.',
    dimensions: [dim('Steps', '15, each half a cubit high and deep'), dim('Rise', '7.5 cubits (3.9 m)')],
    citations: [cite('middot', '2:5-6; 1:4; 2:3 (its doors of Corinthian bronze)'), cite('war', '5.201-206'), cite('ritmeyer2006', 'location of the Temple courts'),
      cite('holyland', 'facade of the Nicanor Gate')],
    anchor: T.p(xAz + 4, 0), shapes: nicanor,
  }));

  // MARK: Court of Israel and of the Priests
  const azarah = [
    S.prism({ poly: T.rect(xW, -yO, cu(138), yO), bottom: abs(E), top: abs(levelPriests), mat: 'marbleAshlar', cap: 'paving' }),
    S.prism({ poly: T.rect(cu(138), -yO, xAz + cu(2.5), yO), bottom: abs(E), top: abs(levelIsrael), mat: 'marbleAshlar', cap: 'paving' }),
  ];
  // The step up to the priests' platform (Middot 2:6).
  azarah.push(S.prism({ poly: T.rect(cu(136.5), -yO, cu(138), yO), bottom: abs(levelIsrael), top: abs(levelIsrael + cu(1.25)), mat: 'marbleAshlar', cap: 'paving' }));
  azarah.push(...wallPrisms(T, [[xAz, -yI], [xW + cu(2.5), -yI], [xW + cu(2.5), yI], [xAz, yI]], { t: cu(5), bottom: levelWomen - 0.5, top: innerWallTop, mat: 'marbleAshlar' }));
  for (const x of [cu(20), cu(70), cu(120)]) {
    for (const sy of [-1, 1]) {
      // Gatehouses: deep blocks standing through the wall, taller than the chambers beside them.
      const y0 = sy > 0 ? cu(56) : -yO - 3.5, y1 = sy > 0 ? yO + 3.5 : -cu(56);
      azarah.push(S.prism({ poly: T.rect(x - cu(15), y0, x + cu(15), y1), bottom: abs(E), top: abs(innerWallTop + cu(9)), mat: 'marbleAshlar', cap: 'marbleAshlar' }));
      azarah.push(S.prism({ poly: T.rect(x - cu(15) - 0.3, y0 - 0.3, x + cu(15) + 0.3, y1 + 0.3), bottom: abs(innerWallTop + cu(7.6)), top: abs(innerWallTop + cu(8.4)), mat: 'marbleAshlar', stamp: 'none' }));
      const face = sy * (yO + 3.5);
      azarah.push(S.portal({ a: T.p(x - cu(5), face), b: T.p(x + cu(5), face), outward: mul(T.v, sy), sill: abs(levelWomen), height: cu(20), door: 'goldDoor', frame: 'marble' }));
    }
  }
  // Chambers built against the inside of the north and south walls, between the gatehouses, with flat roofs at
  // different levels (Middot 5:3-4 names six chambers in the court).
  for (const [xa, xb, dh] of [[cu(-40.5), cu(5), cu(4)], [cu(35), cu(55), -cu(4)], [cu(85), cu(105), cu(3)], [cu(135), cu(146.5), -cu(3)]]) {
    for (const sy of [-1, 1]) {
      const outer = dh > 0 ? yO + 0.15 : yO - 0.2;
      const poly = sy > 0 ? T.rect(xa, cu(60), xb, outer) : T.rect(xa, -outer, xb, -cu(60));
      azarah.push(S.prism({ poly, bottom: abs(E), top: abs(innerWallTop + dh), mat: 'marbleAshlar', cap: 'marbleAshlar' }));
      const xm = (xa + xb) / 2;
      azarah.push(S.portal({ a: T.p(xm - sy * 0.9, sy * cu(60)), b: T.p(xm + sy * 0.9, sy * cu(60)), outward: mul(T.v, -sy), sill: abs(levelPriests), height: 3.4, door: 'door', frame: 'marble' }));
    }
  }
  azarah.push(...battlementRect(T, xW, -yO, xE, yO, innerWallTop, 'marbleAshlar'));
  out.push(feature({
    id: 'tm-azarah', name: 'Court of Israel and Court of the Priests', altName: 'Azarah', area: TM, confidence: Confidence.textual, uncertainty: 20,
    summary: "The inner court round the sanctuary and altar, with three gates on the north and three on the south set in tower-like gatehouses. The side gates are shown closed. The court levels are built up from the esplanade by the Mishnah's step counts, which puts the sanctuary floor about 6 m above the surface of the rock under the Dome of the Rock: a known difficulty of any reconstruction that joins the Mishnah's figures to that rock.",
    dimensions: [dim('Whole court', '187 x 135 cubits (98.2 x 70.9 m)'), dim('Court of Israel', '11 cubits deep'),
      dim('Gatehouses', '30 cubits wide, 40 high (Josephus)'), dim('Wall', '40 cubits high outside, 25 inside')],
    citations: [cite('middot', '5:1-4; 1:4-5; 2:6'), cite('war', '5.196-206'), cite('ritmeyer2006', 'location of the Temple courts; gatehouses and chambers round the court')],
    anchor: T.p(cu(70), yO), shapes: azarah,
  }));

  // MARK: Altar
  const altarTop = levelPriests + cu(9);
  out.push(feature({
    id: 'tm-altar', name: 'Altar of burnt offering', area: TM, confidence: Confidence.textual, uncertainty: 20,
    summary: 'A stepped block of unhewn, whitewashed stones in front of the sanctuary, reached by a ramp on its south side, since iron tools and steps were both forbidden. Josephus gives a larger figure, 50 cubits square.',
    dimensions: [dim('Base', '32 x 32 cubits (16.8 m)'), dim('Height', 'c. 10 cubits with the horns'), dim('Ramp', '32 cubits long, 16 wide'), dim('Distance from the porch', '22 cubits')],
    citations: [cite('middot', '3:1-4'), cite('war', '5.225')],
    anchor: T.p(cu(111), 0),
    shapes: [
      S.prism({ poly: T.rect(cu(95), -cu(16), cu(127), cu(16)), bottom: abs(levelPriests), top: abs(levelPriests + cu(1)), mat: 'whitewash' }),
      S.prism({ poly: T.rect(cu(96), -cu(15), cu(126), cu(15)), bottom: abs(levelPriests), top: abs(levelPriests + cu(6)), mat: 'whitewash' }),
      S.prism({ poly: T.rect(cu(97), -cu(14), cu(125), cu(14)), bottom: abs(levelPriests), top: abs(altarTop), mat: 'whitewash' }),
      S.stairs({ lowA: T.p(cu(103), -cu(48)), lowB: T.p(cu(119), -cu(48)), highA: T.p(cu(103), -cu(16)), highB: T.p(cu(119), -cu(16)),
        lowElev: abs(levelPriests), highElev: abs(altarTop), steps: 24, mat: 'whitewash' }),
    ],
  }));

  // MARK: Sanctuary
  // After the Holyland model: white marble throughout, engaged columns with gilded capitals on the porch, a tall framed
  // doorway, a gilded frieze under a white cornice, and gold spikes round the flat roof.
  const sanctuary = [];
  for (let k = 0; k < 6; k++) {
    sanctuary.push(S.prism({ poly: T.rect(cu(73), -cu(50), cu(73) + 1.05 * (6 - k), cu(50)), bottom: abs(levelPriests), top: abs(levelPriests + 0.525 * (k + 1)), mat: 'marble' }));
  }
  const porch = [cu(51), -cu(50), cu(73), cu(50)], hall = [-cu(27), -cu(35), cu(51), cu(35)];
  const friezeBottom = sanctuaryTop - cu(9), friezeTop = sanctuaryTop - cu(4);
  const doorSill = levelPriests + cu(6);
  // The porch front is built as slabs round a doorway of three receding orders, so the opening is a real recess.
  // Innermost order: 20 cubits wide and 40 high, the porch entrance of Middot 3:7.
  const face = cu(73);
  const orders = [{ half: cu(13), top: doorSill + cu(46), depth: 1.2 }, { half: cu(11.5), top: doorSill + cu(43), depth: 1.2 }, { half: cu(10), top: doorSill + cu(40), depth: 1.4 }];
  let front = face;
  for (const o of orders) {
    const back = front - o.depth;
    for (const [y0, y1] of [[-cu(50), -o.half], [o.half, cu(50)]]) {
      sanctuary.push(S.prism({ poly: T.rect(back, y0, front, y1), bottom: abs(levelPriests), top: abs(sanctuaryTop), mat: 'marbleAshlar' }));
    }
    sanctuary.push(S.prism({ poly: T.rect(back, -o.half, front, o.half), bottom: abs(o.top), top: abs(sanctuaryTop), mat: 'marbleAshlar' }));
    sanctuary.push(S.prism({ poly: T.rect(back, -o.half, front, o.half), bottom: abs(levelPriests), top: abs(doorSill), mat: 'marble', cap: 'marble' }));
    front = back;
  }
  // Back of the recess: golden doors filling the whole opening of the innermost order.
  sanctuary.push(decal(T.p(front, -cu(10)), T.p(front, cu(10)), { outward: T.u, depth: 0.1, bottom: doorSill, top: doorSill + cu(40), mat: 'goldDoor' }));
  sanctuary.push(S.panel({ a: T.p(front + 0.1, -cu(10)), b: T.p(front + 0.1, cu(10)), outward: T.u, bottom: abs(doorSill), top: abs(doorSill + cu(40)), mat: 'sanctuaryDoor' }));
  // Moulded frame round the outer order, standing proud of the wall.
  const fw = cu(2.5), oh = orders[0].half, ot = orders[0].top;
  for (const [y0, y1] of [[-oh - fw, -oh], [oh, oh + fw]]) {
    sanctuary.push(S.prism({ poly: T.rect(face - 0.1, y0, face + 0.45, y1), bottom: abs(doorSill), top: abs(ot + fw), mat: 'marble', cap: 'marble' }));
  }
  sanctuary.push(S.prism({ poly: T.rect(face - 0.1, -oh - fw, face + 0.45, oh + fw), bottom: abs(ot), top: abs(ot + fw), mat: 'marble', cap: 'marble', stamp: 'none' }));
  sanctuary.push(S.prism({ poly: T.rect(face - 0.1, -oh - fw - 0.6, face + 0.8, oh + fw + 0.6), bottom: abs(ot + fw), top: abs(ot + fw + 0.7), mat: 'marble', cap: 'marble', stamp: 'none' }));

  for (const rr of [porch, hall]) {
    const r2 = rr[2] === face ? front : rr[2];
    sanctuary.push(S.prism({ poly: T.rect(rr[0], rr[1], r2, rr[3]), bottom: abs(levelPriests), top: abs(sanctuaryTop), mat: 'marbleAshlar' }));
    sanctuary.push(S.prism({ poly: T.rect(rr[0] - 0.3, rr[1] - 0.3, rr[2] + 0.3, rr[3] + 0.3), bottom: abs(friezeBottom), top: abs(friezeTop), mat: 'gold', stamp: 'none' }));
    sanctuary.push(S.prism({ poly: T.rect(rr[0] - 0.9, rr[1] - 0.9, rr[2] + 0.9, rr[3] + 0.9), bottom: abs(friezeTop), top: abs(sanctuaryTop + 0.4), mat: 'whitewash', cap: 'marbleAshlar', stamp: 'none' }));
  }
  for (const rr of [porch, hall]) sanctuary.push(...battlementRect(T, rr[0] - 0.9, rr[1] - 0.9, rr[2] + 0.9, rr[3] + 0.9, sanctuaryTop + 0.4, 'gold'));
  // Engaged columns: four on the front, three on each flank of the porch, each with a gilded capital.
  const capH = 2.4, shaftTop = friezeBottom - capH;
  const engaged = [-cu(45.5), -cu(21), cu(21), cu(45.5)].map((y) => [cu(73) + 0.35, y]);
  for (const x of [cu(54.5), cu(62), cu(69.5)]) {
    engaged.push([x, cu(50) + 0.35]);
    engaged.push([x, -cu(50) - 0.35]);
  }
  for (const c of engaged) {
    sanctuary.push(S.columns({ from: T.p(c), to: T.p(c), count: 1, diameter: 2.3, bottom: abs(levelPriests), height: shaftTop - levelPriests, mat: 'marble' }));
    sanctuary.push(S.prism({ poly: T.rect(c[0] - 1.7, c[1] - 1.7, c[0] + 1.7, c[1] + 1.7), bottom: abs(shaftTop), top: abs(friezeBottom), mat: 'gold', stamp: 'none' }));
  }
  out.push(feature({
    id: 'tm-sanctuary', name: 'The Temple (sanctuary)', altName: 'Heikhal', area: TM, confidence: Confidence.textual, uncertainty: 20,
    summary: 'The Temple building: a porch 100 cubits wide and high in front of a narrower hall holding the Holy Place and the Holy of Holies, "narrow behind and broad in front, like a lion". Josephus says the front was covered with gold plates and the rest was of white stone, so that from a distance it looked like a snow-covered mountain. The four columns on the front follow the facade shown on coins of the Bar Kokhba revolt. It was burnt in August 70 CE and nothing of it has been identified. Its site is disputed; the model follows the reconstruction that puts the Holy of Holies on the rock beneath the Dome of the Rock, which is known only to about 15 m here.',
    dimensions: [dim('Length, width, height', '100 x 100 x 100 cubits (52.5 m)'), dim('Hall behind the porch', '70 cubits wide'),
      dim('Porch opening', '40 cubits high, 20 wide'), dim('Holy of Holies', '20 x 20 cubits')],
    citations: [cite('middot', '4:6-7; 3:6-7'), cite('war', '5.207-226'), cite('ant', '15.391-395'),
      cite('ritmeyer2006', 'location of the Temple'), cite('mildenberg1984', 'the Temple facade on the tetradrachms'),
      cite('holyland', 'form of the sanctuary: engaged columns with gilded capitals, framed doorway, gilded frieze, gold spikes on the roof'),
      cite('war', '5.208, 5.222-224 (front covered with gold; gold spikes on the roof)'),
      cite('wikicoords', 'Dome of the Rock')],
    anchor: T.p(cu(23), 0), major: true, shapes: sanctuary,
  }));

  // MARK: Antonia
  const rockTop = 750.0;
  const antonia = [
    S.prism({ poly: N.rect(12, 0, 122, 45), bottom: groundMin(-2), top: abs(rockTop), mat: 'rock', cap: 'rock' }),
    S.prism({ poly: N.rect(15, 3, 119, 42), bottom: abs(rockTop), top: abs(rockTop + cu(40)), mat: 'ashlar', cap: 'paving' }),
  ];
  for (const [x, y, h] of [[12, 0, 50], [110, 0, 70], [12, 33, 50], [110, 33, 50]]) {
    antonia.push(S.prism({ poly: N.rect(x, y, x + 12, y + 12), bottom: abs(rockTop), top: abs(rockTop + cu(h)), mat: 'ashlar', cap: 'paving' }));
  }
  out.push(feature({
    id: 'tm-antonia', name: 'Antonia Fortress', area: TM, confidence: Confidence.partial, uncertainty: 15,
    summary: "Herod's fortress at the north-west corner of the Temple Mount, garrisoned by a Roman cohort that watched the courts. Josephus describes a tower-like block on a rock 50 cubits high with a turret at each corner, the south-eastern one taller. The cut rock scarp it stood on survives along the north edge of the Haram; the building is restored from his text, and its extent follows Benoit's limit to the scarp.",
    dimensions: [dim('Rock', '50 cubits high (Josephus)'), dim('Walls', '40 cubits'), dim('Corner towers', '50 cubits; south-east 70 cubits'), dim('Footprint', 'c. 110 x 40 m on the scarp')],
    citations: [cite('war', '5.238-247'), cite('benoit1971', 'pp. 135-167'), cite('ritmeyer2006', 'the Antonia'), cite('nt', 'Acts 21:31-40')],
    anchor: N.p(67, 22), major: true, shapes: antonia,
  }));

  // MARK: Street along the Western Wall
  out.push(feature({
    id: 'tm-west-street', name: 'Herodian street along the Western Wall', area: TM, confidence: Confidence.excavated, uncertainty: 3,
    summary: 'The main north-south street of the city ran along the foot of the Western Wall, paved with large slabs and lined with shops. Its southern stretch was uncovered under the collapse of 70 CE, with the stones thrown down from above still lying on the paving.',
    dimensions: [dim('Width', 'c. 10 m'), dim('Paving slabs', 'up to 3 m long')],
    citations: [cite('reich2000', 'pp. 340-350'), cite('bendov1985', "the street below Robinson's Arch"), cite('mazar1975', 'the western wall excavations')],
    anchor: M.p(-6, 60), shapes: [S.ribbon({ path: [M.p(-6, -10), M.p(-6, 150), M.p(-6, 480)], width: 9, mat: 'paving' })],
  }));

  return out;
}
