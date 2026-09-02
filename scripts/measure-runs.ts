/** Measures true walking distance for each minigame so par times are data, not vibes. */
import {MINIGAMES} from '../src/game/minigames';
import {pathDistance} from '../src/world/navgrid';
import type {Vec2} from '../src/world/types';

const SPRINT = 11;

for (const game of MINIGAMES) {
  let total = 0;
  let from: Vec2 = game.startAt;
  const legs: string[] = [];

  if (game.kind === 'route') {
    for (const t of game.targets) {
      const d = pathDistance(from, t);
      legs.push(d.toFixed(0));
      total += d;
      from = t;
    }
  } else {
    // Nearest-neighbour tour, which is roughly how a player will actually do it.
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
      legs.push(bestD.toFixed(0));
      total += bestD;
      from = left[best];
      left.splice(best, 1);
    }
  }

  const sprintTime = total / SPRINT;
  console.log(`\n${game.name} (${game.kind})`);
  console.log(`  legs (m): ${legs.join(' + ')}`);
  console.log(`  walkable distance: ${total.toFixed(0)}m`);
  console.log(`  perfect sprint: ${sprintTime.toFixed(1)}s`);
  console.log(`  declared limit: ${game.seconds}s (${(game.seconds / sprintTime).toFixed(2)}x perfect)`);
  console.log(`  suggested limit (1.4x): ${Math.ceil(sprintTime * 1.4)}s`);
}
