import {campus, hash01, ZONES} from '../world/campus';
import {isInsideAnyBuilding} from '../world/collision';

export type CollectibleType = {
  type: string;
  label: string;
  flavor: string;
  color: string;
  shape: 'coin' | 'ring' | 'chunk';
};

const TYPES: CollectibleType[] = [
  {type: 'beignet', label: 'Beignet', flavor: 'Still warm. The powdered sugar is on your hoodie now.', color: '#f6e7c8', shape: 'chunk'},
  {type: 'token', label: 'Streetcar Token', flavor: 'St. Charles line. Exact change, no bills.', color: '#e6b422', shape: 'coin'},
  {type: 'beads', label: 'Throw Beads', flavor: 'Caught, not bought. There is a difference.', color: '#7b3fa0', shape: 'ring'},
  {type: 'baby', label: 'King Cake Baby', flavor: 'You are buying next week. Those are the rules.', color: '#f2f2f2', shape: 'chunk'},
  {type: 'flag', label: 'Wave Flag', flavor: 'Roll Wave. Someone left it on the Quad after the game.', color: '#5ad2f0', shape: 'chunk'},
  {type: 'chicory', label: 'Chicory Coffee', flavor: 'Bitter in a way you eventually start to like.', color: '#6b4630', shape: 'coin'},
  {type: 'acorn', label: 'Live Oak Acorn', flavor: 'The oaks were here first and will be here after.', color: '#8a6a3b', shape: 'chunk'},
];

export type Collectible = CollectibleType & {
  id: string;
  x: number;
  z: number;
  zoneId: string;
};

/**
 * Pickups sit on real walking paths inside each zone, spaced out and never inside
 * a building. Placement is derived from the baked OSM data, so it is identical on
 * every machine and every run without hand-authoring 40 coordinates.
 */
const place = (): Collectible[] => {
  const out: Collectible[] = [];

  for (const zone of ZONES) {
    const candidates: [number, number][] = [];
    for (const path of campus.paths) {
      if (path.kind !== 'walk') continue;
      for (const [x, z] of path.points) {
        const d = Math.hypot(x - zone.center[0], z - zone.center[1]);
        if (d > zone.radius * 0.85) continue;
        if (isInsideAnyBuilding(x, z)) continue;
        candidates.push([x, z]);
      }
    }

    const target = zone.radius > 100 ? 8 : 6;
    let placed = 0;
    for (let i = 0; i < candidates.length && placed < target; i++) {
      // Stride through the candidate list rather than taking the first N, which
      // would cluster every pickup onto whichever footway got fetched first.
      const idx = Math.floor(hash01(i * 9.71 + zone.center[0]) * candidates.length);
      const [x, z] = candidates[idx];
      if (out.some((c) => Math.hypot(c.x - x, c.z - z) < 22)) continue;
      const type = TYPES[(placed + Math.floor(hash01(idx) * TYPES.length)) % TYPES.length];
      out.push({...type, id: `${zone.id}-${placed}`, x: +x.toFixed(2), z: +z.toFixed(2), zoneId: zone.id});
      placed++;
    }
  }

  return out;
};

export const COLLECTIBLES: Collectible[] = place();

export const collectiblesByZone = (zoneId: string) => COLLECTIBLES.filter((c) => c.zoneId === zoneId);
