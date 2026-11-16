// Walls and towers, the Upper City, Lower City and northern quarters, and the tombs outside.
import { Geo, Frame, Poly, cu, add, sub, mul, dist, sum } from '../geo.js';
import { S, feature, cite, dim, abs, groundMin, groundAt, Area, Confidence } from '../model.js';
import {
  mount, south, north, firstWall, secondWall, thirdWall, phasael, hippicus, mariamne, psephinus,
  gateEssene, gateSiloam, gateGennath, gateSecondNorth, gateWomensTowers, cityGate, wallPrisms, ring, decal, scatter,
  siloamFrame, bethesdaFrame, towersPoolFrame, helenaFrame, sunkSpec, insideCity,
} from './cityBase.js';
import { terrain } from './terrain.js';

// MARK: - Walls, towers and gates

export function wallFeatures() {
  const H = terrain();
  const out = [];
  const gEssene = cityGate(firstWall, gateEssene, 12, 4.5);
  const gSiloam = cityGate(firstWall, gateSiloam, 12, 4.5);
  const gGennath = cityGate(firstWall, gateGennath, 12, 4.5);
  const gSecond = cityGate(secondWall, gateSecondNorth, 10, 4);
  const gWomen = cityGate(thirdWall, gateWomensTowers, 13, 5.25);

  out.push(feature({
    id: 'wall-first', name: 'First Wall', altName: 'the Old Wall', area: Area.walls, confidence: Confidence.partial, uncertainty: 25,
    summary: 'The Hasmonean wall round the Upper and Lower City, which Josephus thought the work of David and Solomon. Stretches have been dug at the Citadel, along the present west wall of the Old City, on the south scarp of Mount Zion, across the mouth of the Tyropoeon and on the crest above the Kidron. The line between those points is interpolated.',
    dimensions: [dim('Towers', '60 (Josephus)'), dim('Thickness where excavated', 'c. 4 to 7 m'), dim('Length as modelled', `${(Poly.length(firstWall) / 1000).toFixed(1)} km`)],
    citations: [cite('war', '5.142-145; 5.158'), cite('bliss1898', 'the southern wall and its gates'), cite('amiran1970', 'pp. 9-17'),
      cite('broshi1994', 'pp. 147-155'), cite('avigad1983', 'the First Wall in the Jewish Quarter'), cite('kenyon1974', 'the eastern crest'),
      cite('shiloh1984', 'Area G'), cite('neaehl', 's.v. Jerusalem, the Second Temple period walls')],
    anchor: [-674, -200], major: true,
    shapes: [S.wall({ path: firstWall, height: 12, thickness: 4.5, mat: 'cityWall', towers: 60, towerSize: 10.5, towerExtra: 8,
      gates: [gEssene.at, gSiloam.at, gGennath.at, mount.p(-7, 170)], merlons: true })],
  }));

  out.push(feature({
    id: 'wall-second', name: 'Second Wall', area: Area.walls, confidence: Confidence.textual, uncertainty: 120,
    summary: "Josephus gives it one sentence: it began at the Gennath Gate in the First Wall, enclosed only the northern quarter and ended at the Antonia. No stretch has been securely identified, and its course is the most disputed line in the city's plan. The model takes a middle course that leaves the quarry at the later Church of the Holy Sepulchre outside, as the excavations there require.",
    dimensions: [dim('Towers', '14 (Josephus)')],
    citations: [cite('war', '5.146; 5.158'), cite('avigad1983', 'the Gennath Gate'), cite('gibson1994', 'the quarry and the Second Wall'),
      cite('bahat1990', 'maps of the Second Temple period city')],
    anchor: [-408, 400],
    shapes: [S.wall({ path: secondWall, height: 10, thickness: 4, mat: 'cityWall', towers: 14, towerSize: 10.5, towerExtra: 8, gates: [gSecond.at], merlons: true })],
  }));

  out.push(feature({
    id: 'wall-third', name: 'Third Wall', altName: "Agrippa's Wall", area: Area.walls, confidence: Confidence.partial, uncertainty: 60,
    summary: "Begun by Agrippa I about 41-44 CE to enclose the new northern suburb, stopped on Claudius's orders and finished in haste in 66. The model follows the line of massive masonry traced by Sukenik and Mayer some 450 m north of the present Old City wall, re-excavated in the 1970s and met again in the Russian Compound in 2016 with Roman ballista stones in front of it. A minority view (Kenyon, Hamilton) puts the Third Wall on the line of the present north wall instead; on that view the city was smaller than shown here. The western and eastern legs are interpolated.",
    dimensions: [dim('Height', '20 cubits plus battlements, 25 in all (13 m)'), dim('Thickness', '10 cubits (5.25 m)'),
      dim('Towers', '90, each 20 cubits square, 200 cubits apart'), dim('Width where excavated', 'c. 4.2 to 4.5 m')],
    citations: [cite('war', '5.147-160'), cite('sukenik1930', 'whole report'), cite('benarieh1974', 'pp. 97-107'),
      cite('avner2016', 'whole article'), cite('kenyon1974', 'the north wall'), cite('hamilton1944', 'pp. 1-54')],
    anchor: [-150, 1140], major: true,
    shapes: [S.wall({ path: thirdWall, height: 13, thickness: 5.25, mat: 'cityWall', towers: 90, towerSize: 10.5, towerExtra: 10.5, gates: [gWomen.at], merlons: true })],
  }));

  const tower = (c, tiers) => {
    const g = H.height(c);
    return tiers.map(([side, top], i) => S.prism({ poly: Poly.rect(c, side, side, 0.03),
      bottom: i === 0 ? groundMin(-2) : abs(g + tiers[i - 1][1]), top: abs(g + top), mat: 'towerAshlar', cap: 'paving' }));
  };

  out.push(feature({
    id: 'tower-phasael', name: 'Phasael Tower', altName: '"Tower of David"', area: Area.walls, confidence: Confidence.partial, uncertainty: 20,
    summary: 'The largest of the three towers Herod built to guard his palace, named for his brother. The solid base of one of them still stands sixteen courses high in the Citadel as the "Tower of David"; whether it is Phasael or Hippicus is debated. The upper storeys follow Josephus.',
    dimensions: [dim('Base', '40 cubits square, 40 high, solid'), dim('Total height', 'c. 90 cubits (47 m)'), dim('Surviving base', '22.6 x 18.3 m, c. 20 m high')],
    citations: [cite('war', '5.166-169'), cite('geva1981', 'pp. 57-65'), cite('amiran1970', 'pp. 9-17'), cite('wikicoords', 'Tower of David'),
      cite('photos', 'hasmonean-tower.jpg: stone colours and block proportions of the masonry texture')],
    anchor: phasael, major: true, shapes: tower(phasael, [[21, 21], [17, 37], [12, 47.25]]),
  }));

  out.push(feature({
    id: 'tower-hippicus', name: 'Hippicus Tower', area: Area.walls, confidence: Confidence.textual, uncertainty: 40,
    summary: 'The tower at the north-west corner of the First Wall, from which Josephus starts his description of all three walls. Named for a friend of Herod. Its exact spot within the Citadel area is not fixed.',
    dimensions: [dim('Base', '25 cubits square, 30 high, solid'), dim('Total height', '80 cubits (42 m)')],
    citations: [cite('war', '5.163-165; 5.144; 5.147'), cite('geva1981', 'pp. 57-65')],
    anchor: hippicus, shapes: tower(hippicus, [[13.1, 15.75], [11, 42]]),
  }));

  out.push(feature({
    id: 'tower-mariamne', name: 'Mariamne Tower', area: Area.walls, confidence: Confidence.textual, uncertainty: 40,
    summary: "The smallest and most richly fitted of Herod's three towers, named for his wife. Titus left the three standing as a monument when he razed the city.",
    dimensions: [dim('Base', '20 cubits square, 20 high, solid'), dim('Total height', '55 cubits (29 m)')],
    citations: [cite('war', '5.170-171; 7.1-2')],
    anchor: mariamne, shapes: tower(mariamne, [[10.5, 10.5], [9, 28.9]]),
  }));

  out.push(feature({
    id: 'tower-psephinus', name: 'Psephinus Tower', area: Area.walls, confidence: Confidence.textual, uncertainty: 150,
    summary: 'The octagonal tower at the north-west angle of the Third Wall, from which Josephus says one could see Arabia at sunrise and the sea. Its site depends on the Third Wall line; on the Sukenik-Mayer line it falls near the Russian Compound.',
    dimensions: [dim('Height', '70 cubits (36.75 m)'), dim('Plan', 'octagonal')],
    citations: [cite('war', '5.159-160; 5.147'), cite('avner2016', 'the Russian Compound excavation')],
    anchor: psephinus,
    shapes: [S.prism({ poly: Poly.circle(psephinus, 9, 8), bottom: groundMin(-2), top: groundAt(36.75), mat: 'towerAshlar', cap: 'paving' })],
  }));

  out.push(feature({
    id: 'gate-gennath', name: 'Gennath (Garden) Gate', area: Area.walls, confidence: Confidence.partial, uncertainty: 80,
    summary: 'The gate in the First Wall where the Second Wall began. Avigad proposed that a gate found in the northern line of the First Wall in the Jewish Quarter is this one; others put it nearer the Citadel.',
    citations: [cite('war', '5.146'), cite('avigad1983', 'the Gennath Gate')],
    anchor: gGennath.at, shapes: gGennath.shapes,
  }));
  out.push(feature({
    id: 'gate-essene', name: 'Gate of the Essenes', area: Area.walls, confidence: Confidence.partial, uncertainty: 30,
    summary: 'A gate at the south-west corner of the city, named by Josephus. Bliss and Dickie found a gate with three superimposed sills on the south-west slope of Mount Zion; Pixner re-excavated it and dated the lowest sill to the Herodian period.',
    citations: [cite('war', '5.145'), cite('bliss1898', 'the gate on Mount Zion'), cite('pixner1989', 'pp. 85-95')],
    anchor: gEssene.at, shapes: gEssene.shapes,
  }));
  out.push(feature({
    id: 'gate-siloam', name: 'Gate below Siloam', area: Area.walls, confidence: Confidence.partial, uncertainty: 30,
    summary: 'A gate at the southern tip of the city, where the wall crossed the mouth of the Tyropoeon on a dam below the pools. Bliss and Dickie traced the gate and the paved street leading up from it.',
    citations: [cite('bliss1898', 'the gate at the south-east angle and the dam wall'), cite('war', '5.145')],
    anchor: gSiloam.at, shapes: gSiloam.shapes,
  }));
  out.push(feature({
    id: 'gate-womens-towers', name: "Gate by the Women's Towers", area: Area.walls, confidence: Confidence.textual, uncertainty: 150,
    summary: 'A gate in the Third Wall facing the tomb of Queen Helena, from which the defenders made their first sortie against Titus. Placed here on the wall opposite the tomb; no remains are known.',
    citations: [cite('war', '5.55; 5.110')],
    anchor: gWomen.at, shapes: gWomen.shapes,
  }));
  out.push(feature({
    id: 'gate-second-north', name: 'North gate of the Second Wall (hypothetical)', area: Area.walls, confidence: Confidence.representative, uncertainty: 150,
    summary: 'A wall of this length must have had a gate towards the north, and reconstructions usually put one near the later Damascus Gate. Its place here is a guess, included so the quarter can be entered on foot.',
    citations: [cite('war', '5.146'), cite('bahat1990', 'maps of the Second Temple period city')],
    anchor: gSecond.at, shapes: gSecond.shapes,
  }));
  return out;
}

// MARK: - Upper City, Lower City, northern quarters

export function cityFeatures() {
  const H = terrain();
  const M = mount;
  const out = [];

  // Herod's palace
  const P = Frame.north([-668, -300], [0, 1]);
  const podium = P.rect(0, 0, 128, 330);
  const pod = H.groundMax(podium) + 0.3;
  const palace = [S.prism({ poly: podium, bottom: groundMin(-2), top: abs(pod), mat: 'ashlar', cap: 'paving' })];
  palace.push(...wallPrisms(P, [[1.2, 1.2], [126.8, 1.2], [126.8, 328.8], [1.2, 328.8]], { closed: true, t: 2.4, bottom: pod, top: pod + cu(30), mat: 'ashlar', gaps: [[[126.8, 165], 6]] }));
  for (const [y0, y1] of [[30, 98], [232, 300]]) {
    palace.push(S.prism({ poly: P.rect(16, y0, 112, y1), bottom: abs(pod), top: abs(pod + 18), mat: 'limestone', cap: 'roof' }));
    palace.push(S.gable({ rect: P.rect(16, y0, 112, y1), eaves: abs(pod + 18), rise: 5, mat: 'tile' }));
  }
  for (const x of [24, 104]) palace.push(S.columns({ from: P.p(x, 110), to: P.p(x, 220), count: 25, diameter: 0.9, bottom: abs(pod), height: 7, mat: 'marble' }));
  for (const y of [110, 220]) palace.push(S.columns({ from: P.p(28.6, y), to: P.p(99.4, y), count: 16, diameter: 0.9, bottom: abs(pod), height: 7, mat: 'marble' }));
  palace.push(S.water({ poly: P.rect(44, 128, 84, 146), level: abs(pod + 0.15) }));
  palace.push(S.water({ poly: P.rect(44, 184, 84, 202), level: abs(pod + 0.15) }));
  const palaceTrees = [];
  for (let x = 32; x <= 96; x += 8) for (const y of [118, 156, 165, 174, 212]) palaceTrees.push(P.p(x, y));
  palace.push(S.trees({ points: palaceTrees }));
  out.push(feature({
    id: 'herod-palace', name: "Herod's Palace", area: Area.upperCity, confidence: Confidence.partial, uncertainty: 30,
    summary: 'The royal palace on the highest part of the Western Hill, later the residence of the Roman governors when in Jerusalem. Josephus describes two great wings named for Augustus and Agrippa, banqueting halls, colonnades, groves, canals and ponds, all within a wall 30 cubits high. Only the substructure survives: a podium of retaining walls and fill traced for some 300 m south of the Citadel. Everything above it is restored from his description.',
    dimensions: [dim('Podium', 'c. 300 to 350 m north-south, up to 130 m wide'), dim('Enclosing wall', '30 cubits high (15.75 m)')],
    citations: [cite('war', '5.176-183'), cite('broshi1994', 'pp. 147-155'), cite('reem2018', 'the Qishle excavation'), cite('netzer2006', 'the palace in Jerusalem')],
    anchor: P.p(64, 165), major: true, shapes: palace,
  }));

  // Excavated houses of the Upper City
  const block = (c, w, d, h, mat = 'plaster') => S.prism({ poly: Poly.rect(c, w, d, M.angle), bottom: groundMin(-1), top: groundAt(h), mat, cap: 'roof' });
  const mansion = Geo.local(31.77525, 35.23208);
  out.push(feature({
    id: 'palatial-mansion', name: 'Palatial Mansion', altName: 'Herodian Quarter', area: Area.upperCity, confidence: Confidence.excavated, uncertainty: 15,
    summary: 'The largest of the priestly houses excavated in the Jewish Quarter: two storeys round a paved courtyard, with frescoed and stuccoed reception rooms above and a basement of ritual baths and cisterns below. It burned in 70 CE. The preserved plan is simplified here to two blocks.',
    dimensions: [dim('Floor area', 'c. 600 m2'), dim('Storeys', '2, plus basement')],
    citations: [cite('avigad1983', 'the Palatial Mansion'), cite('geva2000', 'final reports'), cite('wikicoords', 'Herodian Quarter')],
    anchor: mansion, shapes: [block(mansion, 30, 20, 7.5), block(sum(mansion, mul(M.v, 13), mul(M.u, 7)), 16, 9, 4.5)],
  }));

  const burnt = add(mansion, [26, 50]);
  out.push(feature({
    id: 'burnt-house', name: 'Burnt House', altName: 'House of Kathros', area: Area.upperCity, confidence: Confidence.excavated, uncertainty: 30,
    summary: 'The basement workshop of a house destroyed in the fire of 70 CE, found under a layer of ash with a spear and the arm bones of a young woman. A stone weight inscribed "of Bar Kathros" links it to a high-priestly family named in the Talmud.',
    dimensions: [dim('Excavated area', 'c. 55 m2')],
    citations: [cite('avigad1983', 'the Burnt House'), cite('geva2000', 'final reports'), cite('war', '6.403-407 (the burning of the Upper City)')],
    anchor: burnt, shapes: [block(burnt, 12, 11, 6.5)],
  }));

  const hasmonean = [-205, 98];
  out.push(feature({
    id: 'hasmonean-palace', name: 'Hasmonean Palace', area: Area.upperCity, confidence: Confidence.textual, uncertainty: 100,
    summary: 'The old royal house of the Hasmoneans, used in the 60s CE by Agrippa II, who added a dining room from which he could watch the Temple sacrifices until the priests built a wall to block the view. Josephus places it on the edge of the Upper City above the Xystus. No remains are identified.',
    citations: [cite('ant', '20.189-193'), cite('war', '2.344')],
    anchor: hasmonean,
    shapes: [block(hasmonean, 52, 34, 11, 'limestone'), block(sum(hasmonean, mul(M.u, 20), mul(M.v, 6)), 14, 14, 17, 'limestone')],
  }));

  const xystusRect = Poly.rect([-152, 96], 34, 64, M.angle);
  const xystusE = H.groundMax(xystusRect) + 0.2;
  out.push(feature({
    id: 'xystus', name: 'Xystus', area: Area.upperCity, confidence: Confidence.textual, uncertainty: 80,
    summary: 'A colonnaded open space, probably a Hellenistic exercise ground, below the Hasmonean palace at the west end of the bridge to the Temple. Agrippa II addressed the people here in 66 CE. Known only from Josephus.',
    citations: [cite('war', '2.344; 5.144; 6.325')],
    anchor: [-152, 96],
    shapes: [
      S.prism({ poly: xystusRect, bottom: groundMin(-1), top: abs(xystusE), mat: 'paving', cap: 'paving' }),
      S.columns({ from: sum(xystusRect[0], mul(M.u, 2), mul(M.v, 2)), to: sum(xystusRect[3], mul(M.u, 2), mul(M.v, -2)), count: 14, diameter: 0.9, bottom: abs(xystusE), height: 6.5, mat: 'marble' }),
      S.columns({ from: sum(xystusRect[1], mul(M.u, -2), mul(M.v, 2)), to: sum(xystusRect[2], mul(M.u, -2), mul(M.v, -2)), count: 14, diameter: 0.9, bottom: abs(xystusE), height: 6.5, mat: 'marble' }),
    ],
  }));

  const councilPoly = M.rect(-36, 124, -14, 148);
  out.push(feature({
    id: 'council-house', name: 'Council house', altName: 'Boule', area: Area.upperCity, confidence: Confidence.textual, uncertainty: 60,
    summary: "Josephus places the council chamber next to the Xystus where the First Wall met the Temple Mount. A finely built Herodian hall beside Wilson's Arch has been proposed as this building; the identification is not settled.",
    citations: [cite('war', '5.144; 6.354'), cite('warren1884', "the hall south of Wilson's Arch"), cite('onn2011', 'preliminary report')],
    anchor: Poly.centroid(councilPoly),
    shapes: [S.prism({ poly: councilPoly, bottom: groundMin(-1), top: groundAt(13), mat: 'limestone', cap: 'roof' })],
  }));

  // Lower City
  const street = [siloamFrame.p(0, 43), [22, -430], [5, -300], [-8, -180], [-12, -60], M.p(-6, -10)];
  out.push(feature({
    id: 'stepped-street', name: 'Stepped street from Siloam', altName: 'Pilgrimage road', area: Area.lowerCity, confidence: Confidence.excavated, uncertainty: 15,
    summary: 'A paved, stepped street climbing 600 m from the Pool of Siloam to the foot of the Temple Mount, with a drainage channel beneath it in which refugees hid in 70 CE. More than a hundred coins sealed under its paving end around 30/31 CE, so it was built under Pontius Pilate rather than Herod.',
    dimensions: [dim('Length', 'c. 600 m'), dim('Width', 'c. 8 m'), dim('Latest coin under the paving', '30/31 CE')],
    citations: [cite('szanton2019', 'pp. 147-166'), cite('reich2011', 'the stepped street and the drainage channel'), cite('bliss1898', 'the paved street')],
    anchor: [5, -300], major: true, shapes: [S.ribbon({ path: street, width: 8, mat: 'paving' })],
  }));

  const sil = sunkSpec('siloam'), silL = H.sunk.siloam;
  const silMid = siloamFrame.rect(-27, -29, 27, 29);
  const siloam = [
    ...ring(sil.outer, silMid, abs(silL.floor - 3), abs(silL.rim), 'limestone', 'paving'),
    ...ring(silMid, sil.inner, abs(silL.floor - 3), abs(silL.rim - 1.2), 'limestone', 'paving'),
    S.water({ poly: sil.inner, level: abs(silL.floor) }),
  ];
  out.push(feature({
    id: 'siloam', name: 'Pool of Siloam', area: Area.lowerCity, confidence: Confidence.excavated, uncertainty: 20,
    summary: "A large stepped pool at the lowest point of the city, fed from the Gihon spring through Hezekiah's tunnel, and probably used for ritual immersion by pilgrims before they climbed to the Temple. Three flights of five steps along one side were uncovered in 2004; the rest of the outline is estimated.",
    dimensions: [dim('Exposed side', 'c. 50 m'), dim('Estimated size', 'c. 50 x 60 m'), dim('Steps', 'three flights of five')],
    citations: [cite('reich2005', 'pp. 91-96'), cite('reich2011', 'the Second Temple period pool'), cite('nt', 'John 9:7'), cite('war', '5.140; 5.145'), cite('wikicoords', 'Pool of Siloam')],
    anchor: siloamFrame.origin, major: true, shapes: siloam,
  }));

  const adiabene = [52, -150];
  out.push(feature({
    id: 'adiabene-palace', name: 'Large building at Givati', altName: 'Adiabene palace?', area: Area.lowerCity, confidence: Confidence.partial, uncertainty: 40,
    summary: 'A monumental building of at least two storeys with a wing of ritual baths, destroyed in 70 CE, excavated in the Givati car park. Its excavators suggest it is one of the palaces that Queen Helena of Adiabene and her family built in the Lower City; that is a proposal, not a proof. Its position here is approximate.',
    citations: [cite('benami2011', 'pp. 231-239'), cite('war', '4.567; 5.252-253; 6.355')],
    anchor: adiabene, shapes: [block(adiabene, 46, 30, 9.5, 'limestone')],
  }));

  const synagogue = [102, -470];
  out.push(feature({
    id: 'theodotus-synagogue', name: 'Synagogue of Theodotus', area: Area.lowerCity, confidence: Confidence.textual, uncertainty: 80,
    summary: 'A Greek inscription found in a cistern at the south end of the ridge records that Theodotus, priest and head of the synagogue, built a synagogue for reading the Law, with a guest house and water installations for visitors from abroad. The building itself was not found; a hall is placed near the findspot.',
    citations: [cite('weill1920', 'the Theodotus inscription'), cite('reich2011', "Weill's excavations")],
    anchor: synagogue, shapes: [block(synagogue, 20, 12, 6.5, 'limestone')],
  }));

  const ophel = [[40, -62, 18, 12], [150, -66, 22, 14], [228, -40, 20, 16]].map(([x, y, w, d]) =>
    S.prism({ poly: Poly.rect(south.p(x, y), w, d, south.angle), bottom: groundMin(-1), top: groundAt(5), mat: 'limestone', cap: 'roof' }));
  out.push(feature({
    id: 'ophel', name: 'Ophel buildings and ritual baths', area: Area.lowerCity, confidence: Confidence.excavated, uncertainty: 15,
    summary: 'Between the southern steps and the houses of the Lower City the excavations found public buildings and many stepped immersion pools, cut in the rock for pilgrims purifying themselves before entering the gates. Three buildings stand for the group; their plans are schematic.',
    citations: [cite('mazar1975', 'the Ophel'), cite('bendov1985', 'ritual baths south of the Temple Mount')],
    anchor: south.p(150, -66), shapes: ophel,
  }));

  // Northern quarters
  const B = bethesdaFrame;
  const bS = H.sunk.bethesdaS;
  const bethesda = [];
  for (const r of [[-40, -63, -25, 61], [25, -63, 40, 61], [-25, -63, 25, -48], [-25, -4, 25, 4], [-25, 46, 25, 61], [-25, 4, -22, 46], [22, 4, 25, 46]]) {
    bethesda.push(S.prism({ poly: B.rect(...r), bottom: abs(bS.floor - 4), top: abs(bS.rim), mat: 'limestone', cap: 'paving' }));
  }
  bethesda.push(S.water({ poly: sunkSpec('bethesdaS').inner, level: abs(bS.floor) }));
  bethesda.push(S.water({ poly: sunkSpec('bethesdaN').inner, level: abs(bS.floor) }));
  // Five porticoes: four sides and the dike between the pools.
  for (const [a, b, n] of [[[-29, -52], [-29, 50], 23], [[29, -52], [29, 50], 23], [[-25, -52], [25, -52], 12], [[-25, 50], [25, 50], 12], [[-23, 0], [23, 0], 11]]) {
    bethesda.push(S.columns({ from: B.p(a), to: B.p(b), count: n, diameter: 0.8, bottom: abs(bS.rim), height: 6.2, mat: 'limestone' }));
  }
  for (const r of [[-32, -55, -26, 53], [26, -55, 32, 53], [-26, -55, 26, -49], [-26, 47, 26, 53], [-26, -3, 26, 3]]) {
    bethesda.push(S.prism({ poly: B.rect(...r), bottom: abs(bS.rim + 6.2), top: abs(bS.rim + 6.8), mat: 'timber', cap: 'roof', stamp: 'none' }));
  }
  out.push(feature({
    id: 'bethesda', name: 'Pools of Bethesda', altName: 'Sheep Pool', area: Area.north, confidence: Confidence.excavated, uncertainty: 20,
    summary: 'Two large rock-cut basins divided by a dike 6.5 m wide, in the valley north of the Temple Mount. The Gospel of John speaks of a pool with five porticoes, which fits four sides and the dike; fragments of columns were found, but the colonnades are restored. Gibson reads the southern basin, with steps across its whole width, as an immersion pool fed from the northern one.',
    dimensions: [dim('Both basins', 'c. 95 x 50 to 60 m'), dim('Depth', 'c. 13 m'), dim('Dike', '6.5 m wide')],
    citations: [cite('gibson2005', 'pp. 270-293'), cite('nt', 'John 5:2'), cite('gurevich2017', 'pp. 103-134'), cite('wikicoords', 'Pool of Bethesda')],
    anchor: B.origin, major: true, shapes: bethesda,
  }));

  const simplePool = (id) => {
    const spec = sunkSpec(id), lv = H.sunk[id];
    return [...ring(spec.outer, spec.inner, abs(lv.floor - 4), abs(lv.rim), 'limestone', 'paving'), S.water({ poly: spec.inner, level: abs(lv.floor) })];
  };
  out.push(feature({
    id: 'pool-israel', name: 'Pool of Israel', altName: "Birket Isra'il", area: Area.north, confidence: Confidence.excavated, uncertainty: 15,
    summary: "A deep reservoir built across the valley against the north wall of the Temple Mount, closed on the east by a dam. It served both as a water store and as a moat on the Mount's weakest side. It stood open until it was filled in in the 1930s.",
    dimensions: [dim('Length', 'c. 110 m'), dim('Width', 'c. 38 m'), dim('Depth', 'up to c. 26 m')],
    citations: [cite('warren1884', 'Birket Israil'), cite('gurevich2017', 'pp. 103-134'), cite('wikicoords', 'Birket Israel')],
    anchor: north.p(245, 26), shapes: simplePool('israel'),
  }));
  out.push(feature({
    id: 'struthion', name: 'Struthion Pool', area: Area.north, confidence: Confidence.excavated, uncertainty: 15,
    summary: 'An open rock-cut pool in the ditch at the north-west corner of the Antonia; the Fifth Legion raised its siege ramp "through the middle of the pool called Struthion". It survives under the Convent of the Sisters of Zion, vaulted over in the second century.',
    dimensions: [dim('Length', '52 m'), dim('Width', '14 m')],
    citations: [cite('war', '5.467'), cite('benoit1971', 'pp. 135-167'), cite('gurevich2017', 'pp. 103-134'), cite('wikicoords', 'Struthion Pool')],
    anchor: mount.p(-12, 527), shapes: simplePool('struthion'),
  }));
  out.push(feature({
    id: 'towers-pool', name: 'Pool of the Towers', altName: 'Amygdalon / "Hezekiah\'s Pool"', area: Area.north, confidence: Confidence.partial, uncertainty: 20,
    summary: "A reservoir north of Herod's towers, where the Tenth Legion built a siege ramp in 70 CE. It is identified with the pool that still exists in the Christian Quarter, which has not been excavated to its original floor.",
    dimensions: [dim('Size today', 'c. 73 x 44 m')],
    citations: [cite('war', '5.468'), cite('gurevich2017', 'pp. 103-134'), cite('wikicoords', "Hezekiah's Pool")],
    anchor: towersPoolFrame.origin, shapes: simplePool('towers'),
  }));

  const golgotha = Geo.local(31.77833, 35.22972);
  out.push(feature({
    id: 'golgotha', name: 'Quarry outside the Second Wall', altName: 'traditional Golgotha', area: Area.north, confidence: Confidence.partial, uncertainty: 20,
    summary: 'Excavations under the Church of the Holy Sepulchre and the Muristan found a large stone quarry worked from the Iron Age and abandoned by the first century, when it held gardens and rock-cut tombs. Tombs mean the spot lay outside the city wall at that time. A knob of poor rock left by the quarrymen is the traditional Golgotha.',
    citations: [cite('gibson1994', 'the quarry and the rock of Golgotha'), cite('nt', 'John 19:17, 41-42'), cite('wikicoords', 'Church of the Holy Sepulchre')],
    anchor: golgotha,
    shapes: [
      S.prism({ poly: Poly.rect(add(golgotha, [12, -6]), 9, 7, 0.3), bottom: groundMin(-1), top: groundAt(5), mat: 'rock', cap: 'rock' }),
      S.prism({ poly: Poly.rect(add(golgotha, [-22, 6]), 6, 40, 0.1), bottom: groundMin(-1), top: groundAt(3.5), mat: 'rock', cap: 'rock' }),
      S.prism({ poly: Poly.rect(add(golgotha, [-4, 26]), 34, 6, 0.1), bottom: groundMin(-1), top: groundAt(3), mat: 'rock', cap: 'rock' }),
    ],
  }));
  return out;
}

// MARK: - Tombs and gardens outside the walls

export function outsideFeatures() {
  const H = terrain();
  const out = [];
  const ang = mount.angle;
  const west = [-1, 0];

  const absalom = Geo.local(31.77696, 35.23896);
  const ga = H.height(absalom);
  out.push(feature({
    id: 'tomb-absalom', name: 'Tomb of Absalom', altName: 'Yad Avshalom', area: Area.outside, confidence: Confidence.excavated, uncertainty: 10,
    summary: 'A first-century funerary monument in the Kidron valley: a cube cut free from the cliff, dressed with Ionic half-columns and a Doric frieze, crowned by a built drum and a concave cone. It stands complete.',
    dimensions: [dim('Base', '6.8 m square'), dim('Height', 'c. 20 m')],
    citations: [cite('avigad1954', 'the Tomb of Absalom'), cite('kloner2007', 'Kidron valley monuments'), cite('wikicoords', 'Tomb of Absalom')],
    anchor: absalom, major: true,
    shapes: [
      S.prism({ poly: Poly.rect(absalom, 6.8, 6.8, ang), bottom: groundMin(-1), top: abs(ga + 8), mat: 'rock' }),
      S.prism({ poly: Poly.rect(absalom, 6.0, 6.0, ang), bottom: abs(ga + 8), top: abs(ga + 10), mat: 'limestone', stamp: 'none' }),
      S.prism({ poly: Poly.circle(absalom, 3.0, 16), bottom: abs(ga + 10), top: abs(ga + 12.5), mat: 'limestone', stamp: 'none' }),
      S.pyramid({ poly: Poly.circle(absalom, 3.1, 16), bottom: abs(ga + 12.5), height: 7.5, mat: 'limestone' }),
    ],
  }));

  const zech = Geo.local(31.77624, 35.23912);
  const gz = H.height(zech);
  out.push(feature({
    id: 'tomb-zechariah', name: 'Tomb of Zechariah', area: Area.outside, confidence: Confidence.excavated, uncertainty: 10,
    summary: 'A solid monolith cut from the cliff, with Ionic half-columns, an Egyptian cornice and a pyramid roof. It has no chamber and probably served as the marker for the adjoining tomb of the Bene Hezir.',
    dimensions: [dim('Base', 'c. 5.5 m square'), dim('Height', 'c. 12 m')],
    citations: [cite('avigad1954', 'the Tomb of Zechariah'), cite('kloner2007', 'Kidron valley monuments'), cite('wikicoords', 'Tomb of Zechariah')],
    anchor: zech,
    shapes: [
      S.prism({ poly: Poly.rect(zech, 5.5, 5.5, ang), bottom: groundMin(-1), top: abs(gz + 7.5), mat: 'rock' }),
      S.pyramid({ poly: Poly.rect(zech, 5.7, 5.7, ang), bottom: abs(gz + 7.5), height: 4.5, mat: 'rock' }),
    ],
  }));

  const hezir = Geo.local(31.77645, 35.23913);
  const gh = H.height(hezir);
  out.push(feature({
    id: 'tomb-bene-hezir', name: 'Tomb of the Bene Hezir', area: Area.outside, confidence: Confidence.excavated, uncertainty: 10,
    summary: 'A rock-cut tomb with a porch of two Doric columns. A Hebrew inscription on the architrave names six brothers of the priestly family of Hezir. It is the oldest of the Kidron monuments, of the second century BCE, and was in use through the first century CE.',
    citations: [cite('avigad1954', 'the Tomb of the Bene Hezir and its inscription'), cite('kloner2007', 'Kidron valley monuments'), cite('wikicoords', 'Tomb of Benei Hezir')],
    anchor: hezir,
    shapes: [
      S.prism({ poly: Poly.rect(add(hezir, [3, 0]), 6, 13, ang), bottom: groundMin(-1), top: abs(gh + 8.5), mat: 'rock', cap: 'rock' }),
      decal(add(hezir, [0, -3.2]), add(hezir, [0, 3.2]), { outward: west, bottom: gh + 3, top: gh + 6.2 }),
      decal(add(hezir, [0, -3.8]), add(hezir, [0, 3.8]), { outward: west, depth: 0.35, bottom: gh + 6.2, top: gh + 7.2, mat: 'limestone' }),
      S.columns({ from: add(hezir, [-0.6, -1.1]), to: add(hezir, [-0.6, 1.1]), count: 2, diameter: 0.6, bottom: abs(gh + 3), height: 3.2, mat: 'rock' }),
    ],
  }));

  // Tomb of Queen Helena
  const Hf = helenaFrame;
  const hel = sunkSpec('helena'), hl = H.sunk.helena;
  const helena = ring(hel.outer, hel.inner, abs(hl.floor - 2), abs(hl.rim), 'rock', 'rock');
  helena.push(S.prism({ poly: hel.inner, bottom: abs(hl.floor - 2), top: abs(hl.floor), mat: 'rock', cap: 'paving' }));
  helena.push(S.stairs({ lowA: Hf.p(3.5, -13), lowB: Hf.p(3.5, -9), highA: Hf.p(13.5, -13), highB: Hf.p(13.5, -9), lowElev: abs(hl.floor), highElev: abs(hl.rim), steps: 16, mat: 'rock' }));
  helena.push(decal(Hf.p(-13.5, -5.5), Hf.p(-13.5, 5.5), { outward: Hf.u, bottom: hl.floor, top: hl.floor + 4.3 }));
  helena.push(decal(Hf.p(-13.5, -13), Hf.p(-13.5, 13), { outward: Hf.u, depth: 0.35, bottom: hl.floor + 4.3, top: hl.floor + 6.3, mat: 'limestone' }));
  helena.push(S.columns({ from: Hf.p(-12.8, -2), to: Hf.p(-12.8, 2), count: 2, diameter: 0.8, bottom: abs(hl.floor), height: 4.3, mat: 'limestone' }));
  for (const y of [-9, 0, 9]) helena.push(S.pyramid({ poly: Poly.rect(Hf.p(-17, y), 5, 5, 0), bottom: abs(hl.rim), height: 7, mat: 'limestone' }));
  out.push(feature({
    id: 'tomb-helena', name: 'Tomb of Queen Helena of Adiabene', altName: '"Tombs of the Kings"', area: Area.outside, confidence: Confidence.excavated, uncertainty: 15,
    summary: 'The grandest tomb of Second Temple Jerusalem, built about 50 CE for the royal family of Adiabene, who had converted to Judaism. A broad stair leads down to a court cut 8 m into the rock, with a carved portico and a rolling stone closing the chambers. Josephus says three pyramids stood over it, three stades from the city; they are restored above the facade.',
    dimensions: [dim('Court', 'c. 27 x 26 m, 8 m deep'), dim('Facade', 'c. 28 m wide'), dim('Stair', '9 m wide')],
    citations: [cite('ant', '20.95'), cite('war', '5.55; 5.119; 5.147'), cite('kon1947', 'whole report'), cite('kloner2007', 'catalogue, northern necropolis'), cite('wikicoords', 'Tombs of the Kings')],
    anchor: Hf.origin, major: true, shapes: helena,
  }));

  const herodTomb = Geo.local(31.77400, 35.22406);
  const ght = H.height(herodTomb);
  out.push(feature({
    id: 'tomb-herod-family', name: '"Herod\'s family tomb"', area: Area.outside, confidence: Confidence.partial, uncertainty: 40,
    summary: 'A tomb of fine ashlar-lined chambers closed by a rolling stone, found west of the city in 1892, with the base of a monument in front. It is commonly identified with the "monuments of Herod" that Josephus mentions in the siege, but a round structure of Roman-style masonry north of the Damascus Gate is a rival candidate. The monument above ground is conjectural.',
    citations: [cite('war', '5.108; 5.507'), cite('netzer1983', 'pp. 163-175'), cite('kloner2007', 'catalogue, western necropolis'), cite('wikicoords', "Herod's family tomb")],
    anchor: herodTomb,
    shapes: [
      S.prism({ poly: Poly.rect(herodTomb, 14, 14, 0.2), bottom: groundMin(-1), top: abs(ght + 2.5), mat: 'ashlar', cap: 'paving' }),
      S.prism({ poly: Poly.rect(herodTomb, 8, 8, 0.2), bottom: abs(ght + 2.5), top: abs(ght + 8), mat: 'limestone', stamp: 'none' }),
      S.pyramid({ poly: Poly.rect(herodTomb, 8.2, 8.2, 0.2), bottom: abs(ght + 8), height: 5, mat: 'limestone' }),
    ],
  }));

  const akeldama = Geo.local(31.76841, 35.23288);
  const akShapes = [];
  for (const dx of [-24, 0, 26]) {
    const c = add(akeldama, [dx, dx * 0.12]);
    const g = H.height(c);
    akShapes.push(S.prism({ poly: Poly.rect(add(c, [0, -3]), 10, 6, 0.12), bottom: groundMin(-1), top: abs(g + 5), mat: 'rock', cap: 'rock' }));
    akShapes.push(decal(add(c, [-1.6, 0.05]), add(c, [1.6, 0.4]), { outward: [-0.12, 1], bottom: g + 0.8, top: g + 3.4 }));
  }
  out.push(feature({
    id: 'akeldama', name: 'Akeldama tombs', area: Area.outside, confidence: Confidence.excavated, uncertainty: 30,
    summary: 'Rock-cut family tombs of the first century on the south slope of the Hinnom valley, some with finely carved facades and chambers. Three excavated caves held ossuaries inscribed in Greek and Aramaic, including a family from Syria. Three facades stand for the group.',
    citations: [cite('avni1996', 'whole report'), cite('kloner2007', 'catalogue, Hinnom valley'), cite('wikicoords', 'Akeldama')],
    anchor: akeldama, shapes: akShapes,
  }));

  // Trees
  const tombs = [absalom, zech, hezir, helenaFrame.origin];
  const clear = (p) => !tombs.some((t) => dist(t, p) < 45) && !insideCity(p);
  const olives = scatter([[470, 900], [1000, 900], [1000, -350], [600, -350], [450, 0], [450, 500]], 28, 0.6, 11).filter(clear);
  const northGardens = scatter([[-900, 1250], [280, 1250], [330, 1650], [-900, 1650]], 26, 0.45, 12).filter(clear);
  out.push(feature({
    id: 'gardens', name: 'Olive groves and gardens', area: Area.setting, confidence: Confidence.representative, uncertainty: 200,
    summary: "Trees stand for the cultivated belt round the city: olives on the hill that takes its name from them, and the gardens, hedges and orchards north of the walls that Titus's army levelled to bring up the legions. Individual trees are placed at random.",
    citations: [cite('war', '5.57; 5.106-108; 6.5-8'), cite('nt', 'John 18:1; Luke 22:39')],
    anchor: [700, 300], listed: false, shapes: [S.trees({ points: [...olives, ...northGardens] })],
  }));
  return out;
}
