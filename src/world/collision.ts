import {campus} from './campus';
import type {Vec2} from './types';

/**
 * Kinematic circle-vs-polygon collision on the XZ plane. No physics engine: the
 * world is static and blocky, so a uniform grid of footprints plus a push-out is
 * both enough and fully deterministic, which matters for Remotion replay.
 */
const CELL = 30;
const key = (cx: number, cz: number) => `${cx},${cz}`;

type Collider = {poly: Vec2[]; minX: number; maxX: number; minZ: number; maxZ: number};

const grid = new Map<string, Collider[]>();

for (const b of campus.buildings) {
  const xs = b.footprint.map((p) => p[0]);
  const zs = b.footprint.map((p) => p[1]);
  const collider: Collider = {
    poly: b.footprint,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
  for (let cx = Math.floor(collider.minX / CELL); cx <= Math.floor(collider.maxX / CELL); cx++) {
    for (let cz = Math.floor(collider.minZ / CELL); cz <= Math.floor(collider.maxZ / CELL); cz++) {
      const k = key(cx, cz);
      const bucket = grid.get(k);
      if (bucket) bucket.push(collider);
      else grid.set(k, [collider]);
    }
  }
}

const inside = (x: number, z: number, poly: Vec2[]): boolean => {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit;
  }
  return hit;
};

/** Closest point on the polygon's boundary, plus the squared distance to it. */
const closestOnBoundary = (x: number, z: number, poly: Vec2[]) => {
  let bestX = poly[0][0];
  let bestZ = poly[0][1];
  let bestD = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    const dx = xj - xi;
    const dz = zj - zi;
    const lenSq = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - xi) * dx + (z - zi) * dz) / lenSq));
    const px = xi + t * dx;
    const pz = zi + t * dz;
    const d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < bestD) {
      bestD = d;
      bestX = px;
      bestZ = pz;
    }
  }
  return {x: bestX, z: bestZ, distSq: bestD};
};

export const resolveCollision = (x: number, z: number, radius: number): Vec2 => {
  let px = x;
  let pz = z;

  // Several passes: OSM footprints overlap in places, so being pushed out of one
  // building can drop you into its neighbour. Each pass visits a given building at
  // most once — a large footprint is registered in many grid cells, and hitting it
  // twice in one pass makes it push the player back and forth by its own radius.
  for (let pass = 0; pass < 4; pass++) {
    const seen = new Set<Collider>();
    let moved = false;
    const cx = Math.floor(px / CELL);
    const cz = Math.floor(pz / CELL);

    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gz = cz - 1; gz <= cz + 1; gz++) {
        for (const c of grid.get(key(gx, gz)) ?? []) {
          if (seen.has(c)) continue;
          seen.add(c);
          if (px < c.minX - radius || px > c.maxX + radius) continue;
          if (pz < c.minZ - radius || pz > c.maxZ + radius) continue;
          const isInside = inside(px, pz, c.poly);
          const near = closestOnBoundary(px, pz, c.poly);
          const dist = Math.sqrt(near.distSq);
          if (!isInside && dist >= radius) continue;
          const dirX = isInside ? near.x - px : px - near.x;
          const dirZ = isInside ? near.z - pz : pz - near.z;
          const len = Math.hypot(dirX, dirZ) || 1;
          const push = isInside ? dist + radius : radius - dist;
          px += (dirX / len) * push;
          pz += (dirZ / len) * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return [px, pz];
};

export const isInsideAnyBuilding = (x: number, z: number): boolean => {
  const cx = Math.floor(x / CELL);
  const cz = Math.floor(z / CELL);
  return (grid.get(key(cx, cz)) ?? []).some((c) => inside(x, z, c.poly));
};
