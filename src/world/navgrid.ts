import {campus} from './campus';
import {isInsideAnyBuilding} from './collision';
import type {Vec2} from './types';

/**
 * A coarse walkability grid over the campus with A* on top. Used to measure true
 * walking distance — which is what a fair minigame par time has to be based on,
 * since straight-line distance ignores the buildings you have to go around.
 *
 * Built lazily: nothing pays for it unless something asks for a path.
 */
const CELL = 2.5;
const MARGIN = 40;

type Grid = {
  cols: number;
  rows: number;
  originX: number;
  originZ: number;
  open: Uint8Array;
};

let grid: Grid | null = null;

const build = (): Grid => {
  const originX = campus.extent.minX - MARGIN;
  const originZ = campus.extent.minZ - MARGIN;
  const cols = Math.ceil((campus.extent.maxX - campus.extent.minX + MARGIN * 2) / CELL);
  const rows = Math.ceil((campus.extent.maxZ - campus.extent.minZ + MARGIN * 2) / CELL);
  const open = new Uint8Array(cols * rows);
  for (let cx = 0; cx < cols; cx++) {
    for (let cz = 0; cz < rows; cz++) {
      const x = originX + (cx + 0.5) * CELL;
      const z = originZ + (cz + 0.5) * CELL;
      open[cz * cols + cx] = isInsideAnyBuilding(x, z) ? 0 : 1;
    }
  }
  return {cols, rows, originX, originZ, open};
};

const getGrid = (): Grid => (grid ??= build());

const toCell = (g: Grid, p: Vec2): number => {
  const cx = Math.min(g.cols - 1, Math.max(0, Math.floor((p[0] - g.originX) / CELL)));
  const cz = Math.min(g.rows - 1, Math.max(0, Math.floor((p[1] - g.originZ) / CELL)));
  return cz * g.cols + cx;
};

/** Nearest walkable cell, for targets that sit a hair inside a footprint. */
const nearestOpen = (g: Grid, index: number): number => {
  if (g.open[index]) return index;
  const cx0 = index % g.cols;
  const cz0 = Math.floor(index / g.cols);
  for (let r = 1; r <= 8; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const cx = cx0 + dx;
        const cz = cz0 + dz;
        if (cx < 0 || cz < 0 || cx >= g.cols || cz >= g.rows) continue;
        const i = cz * g.cols + cx;
        if (g.open[i]) return i;
      }
    }
  }
  return -1;
};

const NEIGHBORS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** Walking distance in meters between two world points, or Infinity if unreachable. */
export const pathDistance = (from: Vec2, to: Vec2): number => {
  const g = getGrid();
  const start = nearestOpen(g, toCell(g, from));
  const goal = nearestOpen(g, toCell(g, to));
  if (start < 0 || goal < 0) return Infinity;
  if (start === goal) return Math.hypot(to[0] - from[0], to[1] - from[1]);

  const size = g.cols * g.rows;
  const dist = new Float32Array(size).fill(Infinity);
  const done = new Uint8Array(size);
  const goalX = goal % g.cols;
  const goalZ = Math.floor(goal / g.cols);
  const heuristic = (i: number) =>
    Math.hypot((i % g.cols) - goalX, Math.floor(i / g.cols) - goalZ) * CELL;

  // Binary heap keyed on f = g + h.
  const heap: number[] = [start];
  const fScore = new Float32Array(size).fill(Infinity);
  dist[start] = 0;
  fScore[start] = heuristic(start);

  const push = (node: number) => {
    heap.push(node);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (fScore[heap[parent]] <= fScore[heap[i]]) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = (): number => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < heap.length && fScore[heap[l]] < fScore[heap[smallest]]) smallest = l;
        if (r < heap.length && fScore[heap[r]] < fScore[heap[smallest]]) smallest = r;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  while (heap.length) {
    const current = pop();
    if (done[current]) continue;
    if (current === goal) return dist[goal];
    done[current] = 1;
    const cx = current % g.cols;
    const cz = Math.floor(current / g.cols);
    for (const [dx, dz, cost] of NEIGHBORS) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= g.cols || nz >= g.rows) continue;
      const n = nz * g.cols + nx;
      if (!g.open[n] || done[n]) continue;
      const next = dist[current] + cost * CELL;
      if (next >= dist[n]) continue;
      dist[n] = next;
      fScore[n] = next + heuristic(n);
      push(n);
    }
  }
  return Infinity;
};

export const isReachable = (from: Vec2, to: Vec2): boolean => Number.isFinite(pathDistance(from, to));
