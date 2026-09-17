# Tulane Sim

**[Play it in your browser →](https://mcanning818.github.io/tulane-sim/)** Desktop only: keyboard and mouse.

A third-person, Roblox-flavored open-world walk around Tulane's uptown campus, built
on real OpenStreetMap footprints. The game runs on React Three Fiber; Remotion
imports the exact same 3D scene to render cinematics and the trailer.

## Run it

```bash
npm install
npm run dev        # the game at http://localhost:5173 — click to lock the mouse
npm run studio     # Remotion Studio for the intro cinematic
npm run selftest   # headless checks: collision, placement, zones, dialogue, race fairness
npm run measure    # A* walking distance per minigame, used to set par times
npm run trailer    # render the intro to out/tulane-trailer.mp4
npm run fetch-osm  # re-bake campus geometry from OpenStreetMap
```

Controls: **WASD** move · **Shift** sprint · **Space** jump · **mouse** look ·
**scroll** zoom · **E** talk · **Esc** release the cursor.

## How it is put together

```
scripts/fetch-osm.mjs     Overpass query -> src/world/campus.json (committed; no runtime network)
src/world/                SHARED by the game and Remotion
  campus.json             239 buildings, 213 paths, greens, trees, in local meters
  campus.ts               typed access, landmark lookup, zone definitions
  geometry.ts             extrusion, path ribbons, deterministic tree scatter
  collision.ts            grid-accelerated circle-vs-polygon resolution
  navgrid.ts              lazy 2.5m walkability grid + A*, for true walking distance
  CampusScene.tsx         <Campus/> and <CampusLights/> — one THREE.Group, ~12 draw calls
src/game/                 React Three Fiber: controller, pickups, NPCs, minigames, HUD, minimap
src/remotion/             @remotion/three compositions that import <Campus/>
```

Because the cinematic and the playable map are the same component over the same
JSON, the trailer can never show a campus the game does not have.

### Coordinates

Everything is meters from a world origin on McAlister Place
(29.9374 N, 90.1208 W): **+x east, +z south, +y up**. Gibson Hall sits at about
(-189, 221), the LBC at (30, -257). The projection is equirectangular around the
origin, which is accurate to well under a meter across a campus this size.

## Extending it

- **A new zone**: add an entry to `ZONES` in `src/world/campus.ts`. Collectibles,
  minimap reveal, and the discovery toast all key off that list automatically.
- **A new NPC**: append to `NPCS` in `src/game/npcs.ts`. Use `walkSpotNear()` to
  put them on a real walkway instead of hand-typing coordinates. The dialogue tree
  is `{text, choices[]}` where a choice can `goto` a node, `end`, or
  `startMinigame`.
- **A new minigame**: add a definition to `MINIGAMES` in `src/game/minigames.ts`.
  Two kinds exist: `route` (ordered checkpoints against a par time) and `gather`
  (scattered targets against a countdown). The briefing card, countdown, in-world
  beacons, live clock, results screen and best-time storage are all driven off that
  definition — a new round is data, not new systems.
- **More map**: widen `BBOX` in `scripts/fetch-osm.mjs` and re-run `npm run fetch-osm`.

### Tuning a race

Par times are measured, not guessed. `npm run measure` walks each round with A*
over the navigation grid and reports true walking distance and a perfect-sprint
time; the limits in `minigames.ts` are that time times about 1.45. `npm run
selftest` fails if a limit drifts outside 1.25x-1.8x of perfect, so a route can
never quietly become unwinnable — or trivial — when the checkpoints move.

## Status

**v1** — the Academic Quad → McAlister Place → LBC corridor: walking, collision,
zone discovery, collectibles with map completion, minimap, one NPC, one stubbed
minigame.

**v2** — six NPCs, one per zone, each with an authored dialogue tree; 41
collectibles; and two minigames that actually play:

- **Streetcar Dash** — 793m from Gibson Hall to the LBC, four checkpoints in
  order, 105s par.
- **Beignet Run** — ten beignets scattered around McAlister Place, 85s on the
  clock.

Rounds run in the live world with the normal controller: briefing card, 3-2-1,
in-world beacons, a live clock, results, and a best time kept in `localStorage`.

Still open: NPC schedules and movement (everyone stands still), interiors, and
audio.

## Attribution

Building, path and tree geometry is © OpenStreetMap contributors, licensed ODbL.
The bake in `src/world/campus.json` is a derived database — keep this notice with it.
