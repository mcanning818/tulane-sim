import {buildingByName, campus} from '../world/campus';
import {isInsideAnyBuilding} from '../world/collision';

export type DialogueNode = {
  id: string;
  text: string;
  choices: {label: string; goto?: string; startMinigame?: string; end?: boolean}[];
};

export type Npc = {
  id: string;
  name: string;
  role: string;
  x: number;
  z: number;
  facing: number;
  shirt: string;
  root: string;
  nodes: Record<string, DialogueNode>;
};

const lbc = buildingByName('Lavin-Bernick')?.centroid ?? [30, -257];

/** Nearest outdoor walkway vertex to a landmark, so NPCs never stand inside a wall. */
const walkSpotNear = (target: readonly [number, number], minGap = 12): [number, number] => {
  let best: [number, number] = [target[0], target[1] + 40];
  let bestD = Infinity;
  for (const path of campus.paths) {
    if (path.kind !== 'walk') continue;
    for (const [x, z] of path.points) {
      const d = Math.hypot(x - target[0], z - target[1]);
      if (d < minGap || d > bestD) continue;
      if (isInsideAnyBuilding(x, z)) continue;
      best = [x, z];
      bestD = d;
    }
  }
  return best;
};

const rileySpot = walkSpotNear([lbc[0], lbc[1]]);

/**
 * v1 ships one authored NPC against the full dialogue-tree shape. Adding the rest
 * is data entry into this array, not a refactor.
 */
export const NPCS: Npc[] = [
  {
    id: 'riley',
    name: 'Riley',
    role: 'sophomore, perpetually outside the LBC',
    x: rileySpot[0],
    z: rileySpot[1],
    // Back to the LBC, facing whoever walks up the path.
    facing: Math.atan2(rileySpot[0] - lbc[0], rileySpot[1] - lbc[1]),
    shirt: '#1c6b4a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: "You're wandering. Everyone wanders their first week. What are you looking for?",
        choices: [
          {label: 'What is there to find out here?', goto: 'collect'},
          {label: 'Where does this walkway go?', goto: 'mcalister'},
          {label: 'Nothing. Just walking.', goto: 'walking'},
        ],
      },
      collect: {
        id: 'collect',
        text: 'People leave things everywhere. Beads in the oaks, tokens on the walk, a beignet somebody abandoned. Pick them up, you learn the campus without meaning to.',
        choices: [
          {label: 'Anything else worth doing?', goto: 'minigame'},
          {label: 'Got it. Thanks.', end: true},
        ],
      },
      mcalister: {
        id: 'mcalister',
        text: 'McAlister Place. Straight shot from the Academic Quad down south up to the LBC behind me. If you get lost, find it and pick a direction.',
        choices: [
          {label: 'What is on the Quad?', goto: 'quad'},
          {label: 'Good enough.', end: true},
        ],
      },
      quad: {
        id: 'quad',
        text: 'Gibson Hall and about a century of live oaks. Everybody takes the same photo there. Take it anyway.',
        choices: [{label: 'I will.', end: true}],
      },
      walking: {
        id: 'walking',
        text: 'Respectable. That is most of what anyone does here.',
        choices: [
          {label: 'Actually — anything to do?', goto: 'minigame'},
          {label: 'See you around.', end: true},
        ],
      },
      minigame: {
        id: 'minigame',
        text: 'There is a thing people run down the streetcar line. Want to try it?',
        choices: [
          {label: 'Sure, run it', startMinigame: 'streetcar-dash'},
          {label: 'Maybe later', end: true},
        ],
      },
    },
  },
];

export const npcById = (id: string) => NPCS.find((n) => n.id === id);
