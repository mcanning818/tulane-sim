import {useSyncExternalStore} from 'react';
import {ZONES} from '../world/campus';
import {COLLECTIBLES} from './collectibles';
import {minigameById, readBest, writeBest} from './minigames';

export type Toast = {id: string; title: string; blurb: string; at: number};

export type RunStatus = 'briefing' | 'countdown' | 'running' | 'done';

export type Run = {
  gameId: string;
  status: RunStatus;
  /** Indices into the minigame's target list that have been reached. */
  taken: number[];
  total: number;
  startedAt: number;
  elapsed: number;
  success: boolean;
  best: number | null;
};

export type GameState = {
  collected: string[];
  discovered: string[];
  zoneId: string | null;
  toast: Toast | null;
  dialogueNpc: string | null;
  nearbyNpc: string | null;
  run: Run | null;
  paused: boolean;
};

let state: GameState = {
  collected: [],
  discovered: [],
  zoneId: null,
  toast: null,
  dialogueNpc: null,
  nearbyNpc: null,
  run: null,
  paused: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getState = () => state;
export const useGame = <T,>(select: (s: GameState) => T): T =>
  useSyncExternalStore(subscribe, () => select(state));

const set = (patch: Partial<GameState>) => {
  state = {...state, ...patch};
  emit();
};

/**
 * Live player transform, deliberately outside React so the HUD never re-renders
 * per frame. `teleportTo` is a request the controller consumes on its next frame.
 */
export const player = {x: 0, z: 0, yaw: 0, speed: 0, teleportTo: null as [number, number] | null};

export const teleport = (x: number, z: number) => {
  player.teleportTo = [x, z];
};

export const collect = (id: string) => {
  if (state.collected.includes(id)) return;
  const item = COLLECTIBLES.find((c) => c.id === id);
  set({
    collected: [...state.collected, id],
    toast: item
      ? {id: `pickup-${id}`, title: `Found: ${item.label}`, blurb: item.flavor, at: Date.now()}
      : state.toast,
  });
};

export const enterZone = (zoneId: string | null) => {
  if (zoneId === state.zoneId) return;
  if (!zoneId) {
    set({zoneId: null});
    return;
  }
  const zone = ZONES.find((z) => z.id === zoneId);
  const isNew = !state.discovered.includes(zoneId);
  set({
    zoneId,
    discovered: isNew ? [...state.discovered, zoneId] : state.discovered,
    toast:
      isNew && zone
        ? {id: `zone-${zoneId}`, title: `Discovered: ${zone.label}`, blurb: zone.blurb, at: Date.now()}
        : state.toast,
  });
};

export const clearToast = (id: string) => {
  if (state.toast?.id === id) set({toast: null});
};

export const setNearbyNpc = (npcId: string | null) => {
  if (state.nearbyNpc !== npcId) set({nearbyNpc: npcId});
};

export const openDialogue = (npcId: string) => set({dialogueNpc: npcId, paused: true});
export const closeDialogue = () => set({dialogueNpc: null, paused: false});

/** Briefing card. The round itself does not start until beginRun(). */
export const openMinigame = (gameId: string) => {
  const game = minigameById(gameId);
  if (!game) return;
  set({
    dialogueNpc: null,
    paused: true,
    run: {
      gameId,
      status: 'briefing',
      taken: [],
      total: game.targets.length,
      startedAt: 0,
      elapsed: 0,
      success: false,
      best: readBest(gameId),
    },
  });
};

/** Move the player to the start line and run the 3-2-1. */
export const beginRun = () => {
  const run = state.run;
  const game = run ? minigameById(run.gameId) : undefined;
  if (!run || !game) return;
  teleport(game.startAt[0], game.startAt[1]);
  // startedAt doubles as the countdown clock until the round actually begins.
  set({run: {...run, status: 'countdown', taken: [], elapsed: 0, success: false, startedAt: Date.now()}});
};

export const startRunning = () => {
  if (!state.run) return;
  set({run: {...state.run, status: 'running', startedAt: Date.now()}, paused: false});
};

export const registerHit = (index: number) => {
  const run = state.run;
  if (!run || run.status !== 'running' || run.taken.includes(index)) return;
  const taken = [...run.taken, index];
  if (taken.length >= run.total) {
    set({run: {...run, taken}});
    finishRun(true);
    return;
  }
  set({run: {...run, taken}});
};

export const finishRun = (success: boolean) => {
  const run = state.run;
  const game = run ? minigameById(run.gameId) : undefined;
  if (!run || !game) return;
  const elapsed = (Date.now() - run.startedAt) / 1000;
  // A route is only a win if it also beat par; a gather is a win on completion.
  const won = success && (game.kind === 'route' ? elapsed <= game.seconds : true);
  if (success) writeBest(run.gameId, +elapsed.toFixed(2));
  set({
    paused: true,
    run: {
      ...run,
      status: 'done',
      elapsed: +elapsed.toFixed(2),
      success: won,
      best: readBest(run.gameId),
    },
  });
};

export const closeRun = () => set({run: null, paused: false});

export const completionPct = (s: GameState) =>
  Math.round((s.collected.length / COLLECTIBLES.length) * 100);
