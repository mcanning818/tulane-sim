import {spreadOnWalks, hash01, ZONES} from '../world/campus';
import {isInsideAnyBuilding} from '../world/collision';
import type {Vec2} from '../world/types';

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
 * Pickups sit on real walking paths inside each zone, derived from the baked OSM
 * data so placement is identical on every machine without hand-authoring 35
 * coordinates.
 */
const place = (): Collectible[] => {
  const out: Collectible[] = [];
  const used: Vec2[] = [];

  for (const zone of ZONES) {
    const target = zone.radius > 100 ? 8 : 6;
    // Full radius, not 85%: the dense districts have few footways and the tighter
    // window left the Science District with half the pickups of the Quad.
    const spots = spreadOnWalks(zone.center, zone.radius, target, {
      minSpacing: 22,
      exclude: used,
      blocked: isInsideAnyBuilding,
    });
    spots.forEach(([x, z], i) => {
      used.push([x, z]);
      const type = TYPES[(i + Math.floor(hash01(x * 3.1 + z * 7.7) * TYPES.length)) % TYPES.length];
      out.push({...type, id: `${zone.id}-${i}`, x, z, zoneId: zone.id});
    });
  }

  return out;
};

export const COLLECTIBLES: Collectible[] = place();

export const collectiblesByZone = (zoneId: string) => COLLECTIBLES.filter((c) => c.zoneId === zoneId);
