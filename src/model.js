// Feature, Shape, Confidence, Citation.
import { Poly } from './geo.js';

/** How well a structure is attested. Drives the evidence overlay. */
export const Confidence = {
  excavated: {
    id: 0, key: 'excavated', letter: 'A', title: 'Standing or excavated in place', rgb: [0.20, 0.66, 0.36],
    explanation: 'The plan and position come from remains that still stand or were dug in situ. Upper parts may still be restored.',
  },
  partial: {
    id: 1, key: 'partial', letter: 'B', title: 'Excavated fragments plus texts', rgb: [0.22, 0.50, 0.90],
    explanation: 'Parts were excavated; the rest of the line or the superstructure is completed from ancient descriptions.',
  },
  textual: {
    id: 2, key: 'textual', letter: 'C', title: 'Known from texts only', rgb: [0.96, 0.60, 0.16],
    explanation: 'No identified remains. Size and layout follow Josephus or the Mishnah; the position is a scholarly reconstruction.',
  },
  representative: {
    id: 3, key: 'representative', letter: 'D', title: 'Representative infill', rgb: [0.62, 0.62, 0.64],
    explanation: 'Not an individual ancient structure. Typical buildings placed to show how the area was probably built up.',
  },
};
export const confidenceList = [Confidence.excavated, Confidence.partial, Confidence.textual, Confidence.representative];

export const Area = {
  templeMount: 'Temple Mount',
  walls: 'Walls and towers',
  upperCity: 'Upper City',
  lowerCity: 'Lower City',
  north: 'Northern quarters',
  outside: 'Outside the walls',
  setting: 'Setting',
};
export const areaList = Object.values(Area);

export const Mats = ['ashlar', 'limestone', 'plaster', 'roof', 'paving', 'marble', 'gold', 'timber', 'rock', 'water', 'dark',
  'foliage', 'whitewash', 'door', 'goldDoor', 'bronze', 'towerAshlar', 'cityWall', 'tile', 'marbleAshlar', 'recess',
  'bronzeDoor', 'sanctuaryDoor', 'nicanorDoor', 'nicanorSideDoor'];

export const cite = (key, locator) => ({ key, locator });
export const dim = (label, value) => ({ label, value });

// How an elevation is resolved for a shape.
export const abs = (v) => ({ t: 'abs', v });              // metres above sea level
export const groundMin = (v) => ({ t: 'groundMin', v });  // lowest ground under the shape, plus an offset
export const groundMax = (v) => ({ t: 'groundMax', v });  // highest ground under the shape, plus an offset
export const groundAt = (v) => ({ t: 'groundAt', v });    // ground at the centroid, plus an offset

// How a shape registers in the walk-mode collision grid: 'solid', 'none', or deck(thickness).
export const deck = (th) => ({ deck: th });

// Shape constructors. Defaults follow the Swift enum.
export const S = {
  prism: ({ poly, bottom, top, mat, cap = null, stamp = 'solid' }) => ({ kind: 'prism', poly, bottom, top, mat, cap, stamp }),
  wall: ({ path, height, thickness, mat = 'ashlar', towers = 0, towerSize = 10, towerExtra = 5, gates = [], merlons = true }) =>
    ({ kind: 'wall', path, height, thickness, mat, towers, towerSize, towerExtra, gates, merlons }),
  columns: ({ from, to, count, diameter, bottom, height, mat = 'marble' }) => ({ kind: 'columns', from, to, count, diameter, bottom, height, mat }),
  /** Flight of steps. `landings` level rests divide it into equal flights; with `parapet` (a height in metres) a solid stone
   *  balustrade of `side` masonry closes both flanks. With `soffit` the flight is carried on an arch and can be walked under. */
  stairs: ({ lowA, lowB, highA, highB, lowElev, highElev, steps, mat = 'paving', parapet = 0, landings = 0, side = 'ashlar', soffit = null }) =>
    ({ kind: 'stairs', lowA, lowB, highA, highB, lowElev, highElev, steps, mat, parapet, landings, side, soffit }),
  water: ({ poly, level }) => ({ kind: 'water', poly, level }),
  gable: ({ rect, eaves, rise, mat }) => ({ kind: 'gable', rect, eaves, rise, mat }),
  pyramid: ({ poly, bottom, height, mat }) => ({ kind: 'pyramid', poly, bottom, height, mat }),
  ribbon: ({ path, width, mat = 'paving' }) => ({ kind: 'ribbon', path, width, mat }),
  trees: ({ points }) => ({ kind: 'trees', points }),
  house: ({ poly, height, tint, room }) => ({ kind: 'house', poly, height, tint, room }),
  /** Masonry block pierced by a semicircular arch. With `ring`, only the band of voussoirs round the arch. */
  arch: ({ center, along, width, thickness, length, spring, top, ring = null, mat = 'ashlar' }) =>
    ({ kind: 'arch', center, along, width, thickness, length, spring, top, ring, mat }),
  /** Flat panel just in front of a wall face, its texture mapped exactly once across it. */
  panel: ({ a, b, outward, bottom, top, mat }) => ({ kind: 'panel', a, b, outward, bottom, top, mat }),
  /** Gateway on a wall face: stone jambs and lintel (or arch) standing proud, with a door or a dark opening inside. */
  portal: ({ a, b, outward, sill, height, arched = false, door = 'door', frame = 'limestone', pediment = false }) =>
    ({ kind: 'portal', a, b, outward, sill, height, arched, door, frame, pediment }),
};

/** A named structure with its sources. */
export function feature({ id, name, altName = null, area, confidence, uncertainty, summary, dimensions = [], citations,
  anchor, major = false, listed = true, shapes }) {
  return { id, name, altName, area, confidence, uncertainty, summary, dimensions, citations, anchor, major, listed, shapes };
}

/** Ground footprints of the solid parts, used to keep infill houses clear and by the tests. */
export function footprints(f) {
  const out = [];
  for (const s of f.shapes) {
    switch (s.kind) {
      case 'prism':
        if (s.stamp === 'none') continue;
        if (Math.abs(Poly.area(s.poly)) >= 12) out.push(s.poly);
        break;
      case 'water': out.push(s.poly); break;
      case 'pyramid': out.push(s.poly); break;
      case 'stairs': out.push([s.lowA, s.lowB, s.highB, s.highA]); break;
    }
  }
  return out;
}

/** Linear elements (walls, streets) with their half-width. */
export function corridors(f) {
  const out = [];
  for (const s of f.shapes) {
    if (s.kind === 'wall') out.push({ path: s.path, half: Math.max(s.thickness, s.towerSize) / 2 });
    else if (s.kind === 'ribbon') out.push({ path: s.path, half: s.width / 2 });
    else if (s.kind === 'columns') out.push({ path: [s.from, s.to], half: s.diameter });
  }
  return out;
}

/** Every vertex the feature uses, for bounds checks. */
export function allPoints(f) {
  const out = [f.anchor];
  for (const s of f.shapes) {
    switch (s.kind) {
      case 'prism': case 'water': case 'pyramid': case 'house': out.push(...s.poly); break;
      case 'wall': case 'ribbon': out.push(...s.path); break;
      case 'columns': out.push(s.from, s.to); break;
      case 'stairs': out.push(s.lowA, s.lowB, s.highA, s.highB); break;
      case 'gable': out.push(...s.rect); break;
      case 'trees': out.push(...s.points); break;
      case 'arch': out.push(s.center); break;
      case 'portal': case 'panel': out.push(s.a, s.b); break;
    }
  }
  return out;
}
