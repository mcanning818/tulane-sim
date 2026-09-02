import raw from './campus.json';
import type {Building, CampusData, Green, Vec2} from './types';

export const campus = raw as unknown as CampusData;

export const buildingByName = (needle: string): Building | undefined =>
  campus.buildings.find((b) => b.name?.toLowerCase().includes(needle.toLowerCase()));

export const greenByName = (needle: string): Green | undefined =>
  campus.greens.find((g) => g.name?.toLowerCase().includes(needle.toLowerCase()));

/** Deterministic 0..1 hash so a building always gets the same brick tone. */
export const hash01 = (n: number): number => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

export const polygonCenter = (poly: Vec2[]): Vec2 => {
  let x = 0;
  let z = 0;
  for (const p of poly) {
    x += p[0];
    z += p[1];
  }
  return [x / poly.length, z / poly.length];
};

export const pointInPolygon = (x: number, z: number, poly: Vec2[]): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};

/**
 * Nearest outdoor walkway vertex to a point, so NPCs, checkpoints and race starts
 * always land somewhere a player can actually stand. `exclude` keeps two callers
 * from picking the same spot.
 */
export const walkSpotNear = (
  target: Vec2,
  opts: {minGap?: number; maxGap?: number; exclude?: Vec2[]; blocked?: (x: number, z: number) => boolean} = {},
): Vec2 => {
  const {minGap = 10, maxGap = Infinity, exclude = [], blocked} = opts;
  let best: Vec2 = [target[0], target[1] + minGap];
  let bestD = Infinity;
  for (const path of campus.paths) {
    if (path.kind !== 'walk') continue;
    for (const [x, z] of path.points) {
      const d = Math.hypot(x - target[0], z - target[1]);
      if (d < minGap || d > maxGap || d >= bestD) continue;
      if (blocked?.(x, z)) continue;
      if (exclude.some((e) => Math.hypot(e[0] - x, e[1] - z) < 12)) continue;
      best = [x, z];
      bestD = d;
    }
  }
  return best;
};

/**
 * `count` well-spaced outdoor points on walkways within `radius` of a center.
 * Strides through the candidate list rather than taking the first N, which would
 * cluster everything onto whichever footway happened to be fetched first.
 */
export const spreadOnWalks = (
  center: Vec2,
  radius: number,
  count: number,
  opts: {minSpacing?: number; exclude?: Vec2[]; blocked?: (x: number, z: number) => boolean; seed?: number} = {},
): Vec2[] => {
  const {minSpacing = 20, exclude = [], blocked, seed = 1} = opts;
  const candidates: Vec2[] = [];
  for (const path of campus.paths) {
    if (path.kind !== 'walk') continue;
    for (const [x, z] of path.points) {
      if (Math.hypot(x - center[0], z - center[1]) > radius) continue;
      if (blocked?.(x, z)) continue;
      candidates.push([x, z]);
    }
  }

  const chosen: Vec2[] = [];
  const fits = (spot: Vec2) =>
    ![...chosen, ...exclude].some((e) => Math.hypot(e[0] - spot[0], e[1] - spot[1]) < minSpacing);
  const take = (spot: Vec2) => chosen.push([+spot[0].toFixed(2), +spot[1].toFixed(2)]);

  for (let i = 0; i < candidates.length && chosen.length < count; i++) {
    const spot = candidates[Math.floor(hash01(i * 9.71 + center[0] + seed) * candidates.length)];
    if (fits(spot)) take(spot);
  }
  // The strided pass can come up short in a zone with few footway vertices, so
  // top up in order rather than silently handing back a thin zone.
  for (let i = 0; i < candidates.length && chosen.length < count; i++) {
    if (fits(candidates[i])) take(candidates[i]);
  }
  return chosen;
};

export type Zone = {
  id: string;
  label: string;
  blurb: string;
  center: Vec2;
  radius: number;
};

/**
 * The v1 playable corridor: the Academic Quad at the south end of McAlister Place
 * running north to the LBC. Radii are generous so zone entry feels forgiving.
 */
export const ZONES: Zone[] = [
  {
    id: 'academic-quad',
    label: 'The Academic Quad',
    blurb: 'Gibson Hall, live oaks, and the oldest lawn on campus.',
    center: greenByName('Academic Quad')
      ? polygonCenter(greenByName('Academic Quad')!.polygon)
      : [-120, 230],
    radius: 110,
  },
  {
    id: 'gibson',
    label: 'Gibson Hall & St. Charles',
    blurb: 'The 1894 stone face Tulane shows the streetcar line.',
    center: buildingByName('Gibson Hall')?.centroid ?? [-189, 221],
    radius: 90,
  },
  {
    id: 'mcalister',
    label: 'McAlister Place',
    blurb: 'The pedestrian spine. Everyone crosses it eventually.',
    center: [0, 0],
    radius: 120,
  },
  {
    id: 'lbc',
    label: 'The LBC',
    blurb: 'Lavin-Bernick Center — food, couches, and the Quad out front.',
    center: buildingByName('Lavin-Bernick')?.centroid ?? [30, -257],
    radius: 120,
  },
  {
    id: 'science',
    label: 'Science District',
    blurb: 'Boggs, Israel, and the smell of the chem building.',
    center: buildingByName('Boggs')?.centroid ?? [-6, -40],
    radius: 90,
  },
  {
    id: 'library',
    label: 'Howard-Tilton',
    blurb: 'Where the semester goes to die. Fourth floor is quiet.',
    center: buildingByName('Howard Tilton')?.centroid ?? [-130, -282],
    radius: 90,
  },
];

export const zoneAt = (x: number, z: number): Zone | null => {
  let best: Zone | null = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(zone.center[0] - x, zone.center[1] - z);
    if (d < zone.radius && d < bestD) {
      best = zone;
      bestD = d;
    }
  }
  return best;
};
