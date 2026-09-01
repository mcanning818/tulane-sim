// Bakes Tulane uptown campus geometry from OpenStreetMap into local-meter JSON.
// Run once: `npm run fetch-osm`. Output is committed so the game never hits the network.
import {writeFileSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/world/campus.json');

// World origin: midpoint of the McAlister Place spine, the walk that connects the
// Academic Quad (south) to the LBC (north). Everything is meters from here.
const ORIGIN = {lat: 29.9374, lon: -90.1208};
// Fetch window: Gibson Hall / St. Charles at the south up through the Commons at the north.
const BBOX = [29.934, -90.125, 29.9412, -90.1185];

const QUERY = `[out:json][timeout:90];
(
  way["building"](${BBOX});
  way["highway"~"^(footway|path|pedestrian|steps|service|residential|tertiary|secondary|primary)$"](${BBOX});
  way["landuse"~"^(grass|recreation_ground)$"](${BBOX});
  way["leisure"~"^(park|pitch|garden)$"](${BBOX});
  node["natural"="tree"](${BBOX});
);
out geom;`;

// Equirectangular projection around ORIGIN. +X east, -Z north, Y up (three.js convention).
const M_PER_DEG_LAT = 110574;
const mPerDegLon = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);
const project = (lat, lon) => [
  +((lon - ORIGIN.lon) * mPerDegLon).toFixed(2),
  +(-(lat - ORIGIN.lat) * M_PER_DEG_LAT).toFixed(2),
];

const ringArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    a += x1 * z2 - x2 * z1;
  }
  return a / 2;
};

const centroidOf = (pts) => {
  let cx = 0;
  let cz = 0;
  for (const [x, z] of pts) {
    cx += x;
    cz += z;
  }
  return [+(cx / pts.length).toFixed(2), +(cz / pts.length).toFixed(2)];
};

// Storey height in meters; OSM `building:levels` when present, else a size-based guess.
const heightFor = (tags, area) => {
  const levels = parseFloat(tags['building:levels']);
  if (Number.isFinite(levels)) return +(levels * 4.2 + 1.5).toFixed(1);
  const explicit = parseFloat(tags.height);
  if (Number.isFinite(explicit)) return +explicit.toFixed(1);
  if (area > 3000) return 14;
  if (area > 900) return 11;
  if (area > 250) return 8;
  return 4.5;
};

const run = async () => {
  console.log('Querying Overpass for', BBOX.join(', '));
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'tulane-sim/0.1 (campus geometry bake; contact via repo)',
    },
    body: new URLSearchParams({data: QUERY}),
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
  const {elements} = await res.json();
  console.log(`  ${elements.length} elements`);

  const buildings = [];
  const paths = [];
  const greens = [];
  const trees = [];

  for (const el of elements) {
    const tags = el.tags ?? {};

    if (el.type === 'node' && tags.natural === 'tree') {
      const [x, z] = project(el.lat, el.lon);
      trees.push({x, z});
      continue;
    }
    if (el.type !== 'way' || !el.geometry) continue;

    const pts = el.geometry.map((g) => project(g.lat, g.lon));
    const closed =
      pts.length > 3 &&
      pts[0][0] === pts[pts.length - 1][0] &&
      pts[0][1] === pts[pts.length - 1][1];
    const ring = closed ? pts.slice(0, -1) : pts;

    if (tags.building && closed) {
      const signed = ringArea(ring);
      const area = Math.abs(signed);
      if (area < 25) continue; // sheds, sliver artifacts
      buildings.push({
        id: el.id,
        name: tags.name ?? null,
        kind: tags.building,
        levels: tags['building:levels'] ? parseInt(tags['building:levels'], 10) : null,
        height: heightFor(tags, area),
        area: +area.toFixed(1),
        centroid: centroidOf(ring),
        // Normalize to counter-clockwise so ExtrudeGeometry never flips normals.
        footprint: signed < 0 ? ring.slice().reverse() : ring,
      });
      continue;
    }

    if (tags.highway && !closed) {
      const major = ['primary', 'secondary', 'tertiary', 'residential'].includes(tags.highway);
      paths.push({
        id: el.id,
        kind: major ? 'road' : 'walk',
        width: major ? 9 : tags.highway === 'steps' ? 2.5 : 3.2,
        points: pts,
      });
      continue;
    }

    if (closed && (tags.landuse || tags.leisure)) {
      const signed = ringArea(ring);
      if (Math.abs(signed) < 100) continue;
      greens.push({
        id: el.id,
        name: tags.name ?? null,
        polygon: signed < 0 ? ring.slice().reverse() : ring,
      });
    }
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const b of buildings) {
    for (const [x, z] of b.footprint) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }

  const campus = {
    generatedAt: new Date().toISOString(),
    attribution: 'Building, path and tree geometry © OpenStreetMap contributors (ODbL)',
    origin: ORIGIN,
    bbox: BBOX,
    extent: {minX, maxX, minZ, maxZ},
    buildings: buildings.sort((a, b) => b.area - a.area),
    paths,
    greens,
    trees,
  };

  mkdirSync(dirname(OUT), {recursive: true});
  writeFileSync(OUT, JSON.stringify(campus, null, 1));
  console.log(
    `Wrote ${OUT}\n  ${buildings.length} buildings (${buildings.filter((b) => b.name).length} named)` +
      `, ${paths.length} paths, ${greens.length} green areas, ${trees.length} trees`,
  );
  console.log(`  extent ${(maxX - minX).toFixed(0)}m x ${(maxZ - minZ).toFixed(0)}m`);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
