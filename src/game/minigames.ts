import {buildingByName, spreadOnWalks, walkSpotNear, ZONES} from '../world/campus';
import {isInsideAnyBuilding} from '../world/collision';
import type {Vec2} from '../world/types';

export type MinigameKind = 'route' | 'gather';

export type Minigame = {
  id: string;
  kind: MinigameKind;
  name: string;
  blurb: string;
  rules: string;
  /** Where the player is placed when the round starts. */
  startAt: Vec2;
  /** Checkpoints in order for a route, or scattered targets for a gather. */
  targets: Vec2[];
  /** Route: the time to beat. Gather: the time you get. */
  seconds: number;
  targetColor: string;
};

const blocked = isInsideAnyBuilding;

const gibson = (buildingByName('Gibson Hall')?.centroid ?? [-189, 221]) as Vec2;
const lbc = (buildingByName('Lavin-Bernick')?.centroid ?? [30, -257]) as Vec2;
const boggs = (buildingByName('Boggs')?.centroid ?? [-6, -40]) as Vec2;
const quad = ZONES.find((z) => z.id === 'academic-quad')!.center;

/** South-to-north along the spine: Gibson, the Quad, McAlister, Boggs, the LBC. */
const routeAnchors: Vec2[] = [gibson, quad, [0, 0], boggs, lbc];
const routeTaken: Vec2[] = [];
const route = routeAnchors.map((anchor) => {
  const spot = walkSpotNear(anchor, {minGap: 16, exclude: routeTaken, blocked});
  routeTaken.push(spot);
  return spot;
});

/**
 * Time limits come from `npm run measure`, which walks each route with A* over the
 * navigation grid and divides true walking distance by sprint speed. The limits
 * below are that perfect time times ~1.45, which leaves room for a human line but
 * not for sightseeing. `npm run selftest` fails if they drift out of that band.
 *
 * Streetcar Dash: 793m of walkway, 72.1s perfect.
 * Beignet Run:    654m nearest-neighbour tour, 59.5s perfect.
 */
const STREETCAR_PAR = 105;
const BEIGNET_LIMIT = 85;

const beignetZone = ZONES.find((z) => z.id === 'mcalister')!;

export const MINIGAMES: Minigame[] = [
  {
    id: 'streetcar-dash',
    kind: 'route',
    name: 'Streetcar Dash',
    blurb: 'Gibson Hall to the LBC: four checkpoints and about 790 meters of walkway, the whole length of campus.',
    rules: `Hit every checkpoint in order. Beat ${STREETCAR_PAR} seconds and you have beaten the streetcar.`,
    startAt: route[0],
    targets: route.slice(1),
    seconds: STREETCAR_PAR,
    targetColor: '#e6b422',
  },
  {
    id: 'beignet-run',
    kind: 'gather',
    name: 'Beignet Run',
    blurb: 'Ten beignets went across the walkways around McAlister Place. The birds are already interested.',
    rules: `Collect all ten inside ${BEIGNET_LIMIT} seconds. Order does not matter.`,
    startAt: walkSpotNear(beignetZone.center, {minGap: 8, blocked}),
    targets: spreadOnWalks(beignetZone.center, beignetZone.radius, 10, {
      minSpacing: 26,
      blocked,
      seed: 41,
    }),
    seconds: BEIGNET_LIMIT,
    targetColor: '#f6e7c8',
  },
];

export const minigameById = (id: string) => MINIGAMES.find((m) => m.id === id);

const bestKey = (id: string) => `tulane-sim.best.${id}`;

/** Best result per game, kept in this browser only. Storage can throw in private mode. */
export const readBest = (id: string): number | null => {
  try {
    const raw = window.localStorage.getItem(bestKey(id));
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const writeBest = (id: string, seconds: number) => {
  try {
    const current = readBest(id);
    if (current === null || seconds < current) window.localStorage.setItem(bestKey(id), String(seconds));
  } catch {
    // No persistence available; the run still counts for this session.
  }
};
