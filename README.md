# Tulane Sim

A third-person, Roblox-flavored open-world walk around Tulane's uptown campus, built
on real OpenStreetMap footprints. The game runs on React Three Fiber; Remotion
imports the exact same 3D scene to render cinematics and the trailer.

## Run it

```bash
npm install
npm run dev        # the game at http://localhost:5173 — click to lock the mouse
npm run studio     # Remotion Studio for the intro cinematic
npm run selftest   # headless checks: collision, placement, zones, dialogue
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
  CampusScene.tsx         <Campus/> and <CampusLights/> — one THREE.Group, ~12 draw calls
src/game/                 React Three Fiber: controller, pickups, NPCs, HUD, minimap
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
- **A new minigame**: register it in `src/game/minigames.ts`. The modal shell,
  pausing, and the dialogue hook already exist; only the round itself is missing.
- **More map**: widen `BBOX` in `scripts/fetch-osm.mjs` and re-run `npm run fetch-osm`.

## Status

v1 covers the Academic Quad → McAlister Place → LBC corridor: walking, collision,
zone discovery, 35 collectibles with map completion, minimap, one authored NPC with
a working dialogue tree, and one registered minigame that is still a stub. NPC
content and playable minigames are v2.

## Attribution

Building, path and tree geometry is © OpenStreetMap contributors, licensed ODbL.
The bake in `src/world/campus.json` is a derived database — keep this notice with it.
