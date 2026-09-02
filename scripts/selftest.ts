/**
 * Headless checks for the parts of the game that are pure math: collision
 * resolution, spawn safety, collectible placement and zone coverage.
 * Bundled through Vite (so TS + the JSON import resolve) and run in node.
 */
import {campus, buildingByName, hash01, ZONES, zoneAt} from '../src/world/campus';
import {isInsideAnyBuilding, resolveCollision} from '../src/world/collision';
import {COLLECTIBLES} from '../src/game/collectibles';
import {NPCS} from '../src/game/npcs';
import {MINIGAMES, minigameById} from '../src/game/minigames';
import {
  beginRun,
  closeRun,
  finishRun,
  getState,
  openMinigame,
  player,
  registerHit,
  startRunning,
} from '../src/game/state';
import {isReachable, pathDistance} from '../src/world/navgrid';
import type {Vec2} from '../src/world/types';

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
check('one NPC per zone', NPCS.length === ZONES.length, `${NPCS.length} NPCs, ${ZONES.length} zones`);
check(
  'no two NPCs share a spot',
  NPCS.every((a, i) => NPCS.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) > 10)),
);
check(
  'every startMinigame choice points at a real game',
  NPCS.every((n) =>
    Object.values(n.nodes).every((node) =>
      node.choices.every((c) => !c.startMinigame || Boolean(minigameById(c.startMinigame))),
    ),
  ),
);
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

/** True walking distance for a round, via A* over the navigation grid. */
const tourDistance = (game: (typeof MINIGAMES)[number]) => {
  let total = 0;
  let from: Vec2 = game.startAt;
  if (game.kind === 'route') {
    for (const t of game.targets) {
      total += pathDistance(from, t);
      from = t;
    }
    return total;
  }
  const left = [...game.targets];
  while (left.length) {
    let best = 0;
    let bestD = Infinity;
    left.forEach((t, i) => {
      const d = pathDistance(from, t);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    total += bestD;
    from = left[best];
    left.splice(best, 1);
  }
  return total;
};

console.log('\nminigames');
for (const game of MINIGAMES) {
  check(`${game.name}: start line is outdoors`, !isInsideAnyBuilding(game.startAt[0], game.startAt[1]));
  check(`${game.name}: targets are outdoors`, game.targets.every((t) => !isInsideAnyBuilding(t[0], t[1])));
  check(
    `${game.name}: targets are reachable-sized`,
    game.targets.every((t) => {
      const [rx, rz] = resolveCollision(t[0], t[1], 1.2);
      return Math.hypot(rx - t[0], rz - t[1]) < 1.2;
    }),
  );
  check(
    `${game.name}: no two targets overlap`,
    game.targets.every((a, i) =>
      game.targets.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[1] - b[1]) > 12),
    ),
  );

  check(
    `${game.name}: every target is reachable on foot`,
    game.targets.every((t) => isReachable(game.startAt, t)),
  );

  const distance = tourDistance(game);
  const perfect = distance / 11; // sprint speed
  const ratio = game.seconds / perfect;
  check(
    `${game.name}: the clock is fair`,
    ratio >= 1.25 && ratio <= 1.8,
    `${distance.toFixed(0)}m, perfect ${perfect.toFixed(1)}s, limit ${game.seconds}s (${ratio.toFixed(2)}x)`,
  );
}

console.log('\nrun lifecycle');
{
  const dash = minigameById('streetcar-dash')!;
  openMinigame('streetcar-dash');
  check('briefing pauses the world', getState().run?.status === 'briefing' && getState().paused);
  check('target count matches the route', getState().run?.total === dash.targets.length);

  player.teleportTo = null;
  beginRun();
  check('start moves the player to the start line', String(player.teleportTo) === String(dash.startAt));
  check('countdown before the clock', getState().run?.status === 'countdown');

  startRunning();
  check('running unpauses the world', getState().run?.status === 'running' && !getState().paused);

  registerHit(0);
  registerHit(0);
  check('a checkpoint only counts once', getState().run?.taken.length === 1);

  for (let i = 1; i < dash.targets.length; i++) registerHit(i);
  const finished = getState().run;
  check('last checkpoint ends the round', finished?.status === 'done');
  check('an instant route beats par', finished?.success === true, `${finished?.elapsed}s vs par ${dash.seconds}s`);
  check('finishing re-pauses the world', getState().paused);

  registerHit(0);
  check('hits after the finish are ignored', getState().run?.taken.length === dash.targets.length);

  closeRun();
  check('closing clears the run', getState().run === null && !getState().paused);

  openMinigame('beignet-run');
  beginRun();
  startRunning();
  registerHit(0);
  finishRun(false);
  const timedOut = getState().run;
  check('running out of time is a loss', timedOut?.status === 'done' && timedOut.success === false);
  check('a lost gather keeps the partial count', timedOut?.taken.length === 1);
  closeRun();
}

console.log(`\n${failures === 0 ? 'all checks passed' : `${failures} check(s) failed`}\n`);
process.exit(failures === 0 ? 0 : 1);
