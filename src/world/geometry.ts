import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {campus, hash01, pointInPolygon} from './campus';
import {PALETTE} from './palette';
import type {Vec2} from './types';

/**
 * Footprints live in (x = east, z = south). THREE.Shape is 2D in XY, so we mirror
 * z and reverse the ring to keep it counter-clockwise, then lay the extrusion flat
 * with rotateX(-90deg) which maps shape-y back onto world +z and depth onto +y.
 */
const shapeFrom = (ring: Vec2[]): THREE.Shape => {
  const pts = ring.map(([x, z]) => new THREE.Vector2(x, -z)).reverse();
  return new THREE.Shape(pts);
};

const STONE = /gibson|dinwiddie|tilton|norman mayer|bobet|richardson memorial|mcalister aud/i;

const wallTone = (id: number, name: string | null): number => {
  if (name && STONE.test(name)) return 2;
  const h = hash01(id);
  return h < 0.42 ? 0 : h < 0.78 ? 1 : 3;
};

export type ColoredGeometry = {color: string; geometry: THREE.BufferGeometry};

export const buildBuildings = (): {walls: ColoredGeometry[]; roofs: ColoredGeometry[]} => {
  const wallBuckets: THREE.BufferGeometry[][] = PALETTE.walls.map(() => []);
  const roofBuckets: THREE.BufferGeometry[][] = PALETTE.roofs.map(() => []);

  for (const b of campus.buildings) {
    if (b.footprint.length < 3) continue;
    const shape = shapeFrom(b.footprint);

    const walls = new THREE.ExtrudeGeometry(shape, {depth: b.height, bevelEnabled: false});
    walls.rotateX(-Math.PI / 2);
    walls.deleteAttribute('uv');
    wallBuckets[wallTone(b.id, b.name)].push(walls);

    // A separate flat cap on top gives every building a readable roof color.
    const roof = new THREE.ShapeGeometry(shape);
    roof.rotateX(-Math.PI / 2);
    roof.translate(0, b.height + 0.06, 0);
    roof.deleteAttribute('uv');
    roofBuckets[Math.floor(hash01(b.id * 7.13) * PALETTE.roofs.length)].push(roof);
  }

  const pack = (buckets: THREE.BufferGeometry[][], colors: readonly string[]) =>
    buckets
      .map((geos, i) => ({color: colors[i], geometry: geos.length ? mergeGeometries(geos, false) : null}))
      .filter((g): g is ColoredGeometry => g.geometry !== null);

  return {walls: pack(wallBuckets, PALETTE.walls), roofs: pack(roofBuckets, PALETTE.roofs)};
};

/** Flat ribbon mesh along each polyline, with a patch quad at every joint. */
export const buildPaths = (kind: 'walk' | 'road', y: number): THREE.BufferGeometry | null => {
  const verts: number[] = [];
  const quad = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number) => {
    verts.push(ax, y, az, bx, y, bz, cx, y, cz, ax, y, az, cx, y, cz, dx, y, dz);
  };

  for (const path of campus.paths) {
    if (path.kind !== kind) continue;
    const half = path.width / 2;
    for (let i = 0; i < path.points.length - 1; i++) {
      const [x1, z1] = path.points[i];
      const [x2, z2] = path.points[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      const nx = (-dz / len) * half;
      const nz = (dx / len) * half;
      quad(x1 + nx, z1 + nz, x2 + nx, z2 + nz, x2 - nx, z2 - nz, x1 - nx, z1 - nz);
      if (i > 0) {
        quad(x1 - half, z1 - half, x1 + half, z1 - half, x1 + half, z1 + half, x1 - half, z1 + half);
      }
    }
  }

  if (!verts.length) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  return geo;
};

export const buildGreens = (): THREE.BufferGeometry | null => {
  const geos = campus.greens
    .filter((g) => g.polygon.length >= 3)
    .map((g) => {
      const geo = new THREE.ShapeGeometry(shapeFrom(g.polygon));
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.04, 0);
      geo.deleteAttribute('uv');
      return geo;
    });
  return geos.length ? mergeGeometries(geos, false) : null;
};

export type TreeInstance = {x: number; z: number; scale: number; tone: number};

/**
 * OSM only maps 23 individual trees here, which is nowhere near what the Quad
 * actually looks like, so we deterministically scatter live oaks across the green
 * areas and skip anything that lands inside a building.
 */
export const buildTrees = (): TreeInstance[] => {
  const trees: TreeInstance[] = campus.trees.map((t, i) => ({
    x: t.x,
    z: t.z,
    scale: 0.9 + hash01(i * 3.7) * 0.5,
    tone: Math.floor(hash01(i * 5.1) * PALETTE.canopy.length),
  }));

  let seed = 0;
  for (const green of campus.greens) {
    const xs = green.polygon.map((p) => p[0]);
    const zs = green.polygon.map((p) => p[1]);
    const step = 16;
    for (let x = Math.min(...xs); x < Math.max(...xs); x += step) {
      for (let z = Math.min(...zs); z < Math.max(...zs); z += step) {
        seed++;
        const jx = x + (hash01(seed * 1.7) - 0.5) * step * 0.9;
        const jz = z + (hash01(seed * 2.3) - 0.5) * step * 0.9;
        if (!pointInPolygon(jx, jz, green.polygon)) continue;
        if (hash01(seed * 4.1) > 0.62) continue;
        if (campus.buildings.some((b) => pointInPolygon(jx, jz, b.footprint))) continue;
        trees.push({
          x: +jx.toFixed(2),
          z: +jz.toFixed(2),
          scale: 1 + hash01(seed * 6.9) * 0.7,
          tone: Math.floor(hash01(seed * 8.3) * PALETTE.canopy.length),
        });
      }
    }
  }
  return trees;
};
