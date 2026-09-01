/**
 * Headless checks for the parts of the game that are pure math: collision
 * resolution, spawn safety, collectible placement and zone coverage.
 * Bundled through Vite (so TS + the JSON import resolve) and run in node.
 */
import {campus, buildingByName, hash01, ZONES, zoneAt} from '../src/world/campus';
import {isInsideAnyBuilding, resolveCollision} from '../src/world/collision';
import {COLLECTIBLES} from '../src/game/collectibles';
import {NPCS} from '../src/game/npcs';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log('\ncampus data');
check('buildings baked', campus.buildings.length > 200, `${campus.buildings.length} buildings`);
check('named landmarks present', campus.buildings.filter((b) => b.name).length >= 30);
check('LBC in data', Boolean(buildingByName('Lavin-Bernick')));
check('Gibson Hall in data', Boolean(buildingByName('Gibson Hall')));
check('Academic Quad green', campus.greens.some((g) => g.name === 'Academic Quad'));

console.log('\nspawn and collision');
check('spawn is outdoors', !isInsideAnyBuilding(0, 40));
const spawnResolved = resolveCollision(0, 40, 0.95);
check('spawn needs no push-out', Math.hypot(spawnResolved[0], spawnResolved[1] - 40) < 0.001);

let entered = 0;
let pushed = 0;
let samples = 0;
for (let i = 0; i < 6000; i++) {
  const x = -300 + hash01(i * 1.31) * 600;
  const z = -480 + hash01(i * 2.77) * 900;
  // Points that start inside a wall are not a state play can reach; the guarantee
  // that matters is that a point starting outside never resolves to inside.
  if (isInsideAnyBuilding(x, z)) continue;
  samples++;
  const [rx, rz] = resolveCollision(x, z, 0.95);
  if (rx !== x || rz !== z) pushed++;
  if (isInsideAnyBuilding(rx, rz)) entered++;
}
check('outdoor points never resolve indoors', entered === 0, `${samples} samples, ${pushed} pushed off walls, ${entered} entered`);

// Charge at building walls the way a sprinting player would and make sure no step
// tunnels through geometry.
let tunnelled = 0;
let charges = 0;
for (let i = 0; i < 400; i++) {
  const target = campus.buildings[Math.floor(hash01(i * 3.91) * campus.buildings.length)];
  let cx = target.centroid[0] + (hash01(i * 5.13) - 0.5) * 160;
  let cz = target.centroid[1] + (hash01(i * 7.29) - 0.5) * 160;
  if (isInsideAnyBuilding(cx, cz)) continue;
  charges++;
  for (let step = 0; step < 260; step++) {
    const dx = target.centroid[0] - cx;
    const dz = target.centroid[1] - cz;
    const len = Math.hypot(dx, dz) || 1;
    // 0.37m per step is a sprint (11 m/s) at 30fps, the worst case the game allows.
    const [nx, nz] = resolveCollision(cx + (dx / len) * 0.37, cz + (dz / len) * 0.37, 0.95);
    cx = nx;
    cz = nz;
    if (isInsideAnyBuilding(cx, cz)) {
      tunnelled++;
      break;
    }
  }
}
check('sprinting into walls never tunnels', tunnelled === 0, `${charges} charges, ${tunnelled} breached`);

// Walk the controller's integration straight at the LBC and make sure sliding along
// walls never leaves the player embedded in geometry.
const lbc = buildingByName('Lavin-Bernick')!.centroid;
let px = 0;
let pz = 40;
let embedded = 0;
for (let step = 0; step < 3000; step++) {
  const dx = lbc[0] - px;
  const dz = lbc[1] - pz;
  const len = Math.hypot(dx, dz) || 1;
  const [nx, nz] = resolveCollision(px + (dx / len) * 0.12, pz + (dz / len) * 0.12, 0.95);
  px = nx;
  pz = nz;
  if (isInsideAnyBuilding(px, pz)) embedded++;
}
check('walker never embeds in a wall', embedded === 0, `ended ${Math.hypot(lbc[0] - px, lbc[1] - pz).toFixed(0)}m from the LBC`);

console.log('\ncollectibles');
check('enough pickups', COLLECTIBLES.length >= 30, `${COLLECTIBLES.length} placed`);
check('none inside a building', COLLECTIBLES.every((c) => !isInsideAnyBuilding(c.x, c.z)));
check(
  'none needs a push-out on pickup',
  COLLECTIBLES.every((c) => {
    const [rx, rz] = resolveCollision(c.x, c.z, 1.2);
    return Math.hypot(rx - c.x, rz - c.z) < 1.2;
  }),
);
let tooClose = 0;
for (let i = 0; i < COLLECTIBLES.length; i++) {
  for (let j = i + 1; j < COLLECTIBLES.length; j++) {
    if (Math.hypot(COLLECTIBLES[i].x - COLLECTIBLES[j].x, COLLECTIBLES[i].z - COLLECTIBLES[j].z) < 20) tooClose++;
  }
}
check('pickups are spaced out', tooClose === 0, `${tooClose} pairs under 20m`);
check('unique ids', new Set(COLLECTIBLES.map((c) => c.id)).size === COLLECTIBLES.length);

console.log('\nzones');
for (const zone of ZONES) {
  const inZone = COLLECTIBLES.filter((c) => c.zoneId === zone.id);
  check(
    `${zone.label}`,
    inZone.length >= 4 && Boolean(zoneAt(zone.center[0], zone.center[1])),
    `${inZone.length} pickups, center resolves to "${zoneAt(zone.center[0], zone.center[1])?.id}"`,
  );
}

console.log('\nnpcs');
for (const npc of NPCS) {
  check(`${npc.name} stands outdoors`, !isInsideAnyBuilding(npc.x, npc.z));
  check(`${npc.name} dialogue tree is connected`, (() => {
    const seen = new Set<string>();
    const walk = (id: string): boolean => {
      if (seen.has(id)) return true;
      seen.add(id);
      const node = npc.nodes[id];
      if (!node) return false;
      return node.choices.every((c) => (c.goto ? walk(c.goto) : true));
    };
    return walk(npc.root) && seen.size === Object.keys(npc.nodes).length;
  })(), `${Object.keys(npc.nodes).length} nodes`);
}

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
