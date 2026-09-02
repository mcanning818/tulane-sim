import {buildingByName, walkSpotNear, ZONES} from '../world/campus';
import {isInsideAnyBuilding} from '../world/collision';
import type {Vec2} from '../world/types';

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

const blocked = (x: number, z: number) => isInsideAnyBuilding(x, z);
const taken: Vec2[] = [];

/** One NPC per zone, each parked on a real walkway and turned to face the path. */
const spotIn = (zoneId: string, landmark?: string): Vec2 => {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const anchor = landmark ? (buildingByName(landmark)?.centroid ?? zone.center) : zone.center;
  const spot = walkSpotNear(anchor, {minGap: 14, maxGap: zone.radius, exclude: taken, blocked});
  taken.push(spot);
  return spot;
};

const facingAwayFrom = (spot: Vec2, anchor: Vec2) => Math.atan2(spot[0] - anchor[0], spot[1] - anchor[1]);

const lbc = buildingByName('Lavin-Bernick')?.centroid ?? [30, -257];
const gibson = buildingByName('Gibson Hall')?.centroid ?? [-189, 221];
const boggs = buildingByName('Boggs')?.centroid ?? [-6, -40];
const tilton = buildingByName('Howard Tilton')?.centroid ?? [-130, -282];

const rileySpot = spotIn('lbc', 'Lavin-Bernick');
const marisolSpot = spotIn('academic-quad');
const cliffSpot = spotIn('gibson', 'Gibson Hall');
const taeSpot = spotIn('mcalister');
const okonkwoSpot = spotIn('science', 'Boggs');
const juneSpot = spotIn('library', 'Howard Tilton');

export const NPCS: Npc[] = [
  {
    id: 'riley',
    name: 'Riley',
    role: 'sophomore, perpetually outside the LBC',
    x: rileySpot[0],
    z: rileySpot[1],
    facing: facingAwayFrom(rileySpot, lbc as Vec2),
    shirt: '#1c6b4a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: "You're wandering. Everyone wanders their first week. What are you looking for?",
        choices: [
          {label: 'What is there to find out here?', goto: 'collect'},
          {label: 'Where does this walkway go?', goto: 'mcalister'},
          {label: 'Is there anything to actually do?', goto: 'race'},
        ],
      },
      collect: {
        id: 'collect',
        text: 'People leave things everywhere. Beads in the oaks, tokens on the walk, a beignet somebody abandoned. Pick them up, you learn the campus without meaning to.',
        choices: [
          {label: 'Anything else worth doing?', goto: 'race'},
          {label: 'Got it. Thanks.', end: true},
        ],
      },
      mcalister: {
        id: 'mcalister',
        text: 'McAlister Place. Straight shot from the Academic Quad in the south up to the LBC behind me. If you get lost, find it and pick a direction.',
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
      race: {
        id: 'race',
        text: 'Streetcar Dash. Start at Gibson, hit every checkpoint up McAlister, finish here at the LBC before the streetcar would have done it. Nobody official sanctions this.',
        choices: [
          {label: "Let's run it", startMinigame: 'streetcar-dash'},
          {label: 'Maybe later', end: true},
        ],
      },
    },
  },
  {
    id: 'marisol',
    name: 'Marisol',
    role: 'art history TA, grading under an oak',
    x: marisolSpot[0],
    z: marisolSpot[1],
    facing: facingAwayFrom(marisolSpot, gibson as Vec2),
    shirt: '#8a4a7d',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: 'Careful where you step, I have forty midterms weighted down with a shoe. Do you need something, or are you just admiring the trees?',
        choices: [
          {label: 'The trees, honestly', goto: 'oaks'},
          {label: 'What is this building?', goto: 'gibson'},
          {label: 'Sorry — carry on', end: true},
        ],
      },
      oaks: {
        id: 'oaks',
        text: 'Live oaks. They spread sideways instead of up, which is why the Quad feels like a room. Some of these were here before the university moved uptown.',
        choices: [
          {label: 'Anything hidden out here?', goto: 'hint'},
          {label: 'Nice. Thanks.', end: true},
        ],
      },
      gibson: {
        id: 'gibson',
        text: 'Gibson Hall, 1894, the stone face the school shows St. Charles Avenue. Everything behind it is newer and knows it.',
        choices: [
          {label: 'Anything hidden out here?', goto: 'hint'},
          {label: 'Got it.', end: true},
        ],
      },
      hint: {
        id: 'hint',
        text: 'People drop things under the oaks and never come back for them. Walk the edges of the lawn instead of cutting across and you will find more than you expect.',
        choices: [{label: 'Worth a try', end: true}],
      },
    },
  },
  {
    id: 'cliff',
    name: 'Cliff',
    role: 'grounds crew, twenty-two years on these oaks',
    x: cliffSpot[0],
    z: cliffSpot[1],
    facing: facingAwayFrom(cliffSpot, gibson as Vec2),
    shirt: '#3f6f2a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: 'Morning. Mind the roots — they buckle the walk every few years and we patch it every few years.',
        choices: [
          {label: 'You take care of all this?', goto: 'job'},
          {label: 'What is worth seeing?', goto: 'tour'},
        ],
      },
      job: {
        id: 'job',
        text: 'Twenty-two years. The buildings change names, the trees do not. Katrina took some of them. The ones left, we look after.',
        choices: [
          {label: 'What is worth seeing?', goto: 'tour'},
          {label: 'Thanks for the work', end: true},
        ],
      },
      tour: {
        id: 'tour',
        text: 'Walk north from here and you cross the whole campus in ten minutes. Quad, then McAlister, then the LBC where the students pile up. Everything else hangs off that line.',
        choices: [{label: 'North it is', end: true}],
      },
    },
  },
  {
    id: 'tae',
    name: 'Tae',
    role: 'flyering for a club that meets irregularly',
    x: taeSpot[0],
    z: taeSpot[1],
    facing: facingAwayFrom(taeSpot, [0, 0] as Vec2),
    shirt: '#c25a2a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: 'Hey — do you like free food, or do you like it enough to run for it?',
        choices: [
          {label: 'Explain the running part', goto: 'run'},
          {label: 'What club is this?', goto: 'club'},
          {label: 'Neither, thanks', end: true},
        ],
      },
      club: {
        id: 'club',
        text: 'We meet Thursdays. Sometimes. The flyer says 7pm but that is aspirational. Anyway — the food thing is real.',
        choices: [
          {label: 'Tell me about the food thing', goto: 'run'},
          {label: 'I will pass', end: true},
        ],
      },
      run: {
        id: 'run',
        text: 'Somebody dropped a whole order of beignets across the walkways. Powdered sugar everywhere. Get them before the birds do and I will call it an event.',
        choices: [
          {label: 'Start the clock', startMinigame: 'beignet-run'},
          {label: 'Let the birds have them', end: true},
        ],
      },
    },
  },
  {
    id: 'okonkwo',
    name: 'Dr. Okonkwo',
    role: 'chemistry, between a lecture and a lab',
    x: okonkwoSpot[0],
    z: okonkwoSpot[1],
    facing: facingAwayFrom(okonkwoSpot, boggs as Vec2),
    shirt: '#2f5f8a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: 'If you are looking for the organic lab, it is not where the sign says it is. If you are not, I have four minutes.',
        choices: [
          {label: 'What is this part of campus?', goto: 'district'},
          {label: 'Why is the sign wrong?', goto: 'sign'},
          {label: 'I will let you go', end: true},
        ],
      },
      district: {
        id: 'district',
        text: 'Boggs, and the buildings around it. Engineering and chemistry. You can smell which is which by August.',
        choices: [
          {label: 'Anything to do around here?', goto: 'advice'},
          {label: 'Understood', end: true},
        ],
      },
      sign: {
        id: 'sign',
        text: 'The building was renumbered in a renovation and the sign was not. It has been eleven years. I have stopped filing the ticket.',
        choices: [
          {label: 'Anything to do around here?', goto: 'advice'},
          {label: 'Fair enough', end: true},
        ],
      },
      advice: {
        id: 'advice',
        text: 'Walk it. Genuinely. Students spend four years here and never see the north end of campus. Go look at the LBC, then go look at the library, then decide which one you are.',
        choices: [{label: 'On my way', end: true}],
      },
    },
  },
  {
    id: 'june',
    name: 'June',
    role: 'fourth floor of Howard-Tilton, allegedly since Tuesday',
    x: juneSpot[0],
    z: juneSpot[1],
    facing: facingAwayFrom(juneSpot, tilton as Vec2),
    shirt: '#5a5f8a',
    root: 'start',
    nodes: {
      start: {
        id: 'start',
        text: 'What time is it. Actually do not tell me. What day is it — no, do not tell me that either.',
        choices: [
          {label: 'Are you okay?', goto: 'okay'},
          {label: 'What is this building?', goto: 'library'},
        ],
      },
      okay: {
        id: 'okay',
        text: 'I am eleven pages in and the argument fell apart on page four. So: no, but productively.',
        choices: [
          {label: 'Where should I go instead?', goto: 'advice'},
          {label: 'Good luck', end: true},
        ],
      },
      library: {
        id: 'library',
        text: 'Howard-Tilton. Fourth floor is silent, second floor is where people go to be seen studying. Choose according to your goals.',
        choices: [
          {label: 'Where should I go instead?', goto: 'advice'},
          {label: 'Noted', end: true},
        ],
      },
      advice: {
        id: 'advice',
        text: 'Outside. Anywhere outside. Go find something on the ground and bring it back so I can live through you.',
        choices: [{label: 'I will do that', end: true}],
      },
    },
  },
];

export const npcById = (id: string) => NPCS.find((n) => n.id === id);
