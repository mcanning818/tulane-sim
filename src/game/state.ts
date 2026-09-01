import {useSyncExternalStore} from 'react';
import {ZONES} from '../world/campus';
import {COLLECTIBLES} from './collectibles';

export type Toast = {id: string; title: string; blurb: string; at: number};

export type GameState = {
  collected: string[];
  discovered: string[];
  zoneId: string | null;
  toast: Toast | null;
  dialogueNpc: string | null;
  nearbyNpc: string | null;
  minigameId: string | null;
  paused: boolean;
};

let state: GameState = {
  collected: [],
  discovered: [],
  zoneId: null,
  toast: null,
  dialogueNpc: null,
  nearbyNpc: null,
  minigameId: null,
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

/** Live player transform. Deliberately outside React so the HUD never re-renders per frame. */
export const player = {x: 0, z: 0, yaw: 0, speed: 0};

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

/** Called every frame by the controller; only touches the store on an actual change. */
export const setNearbyNpc = (npcId: string | null) => {
  if (state.nearbyNpc !== npcId) set({nearbyNpc: npcId});
};

export const openDialogue = (npcId: string) => set({dialogueNpc: npcId, paused: true});
export const closeDialogue = () => set({dialogueNpc: null, paused: false});
export const openMinigame = (id: string) => set({minigameId: id, dialogueNpc: null, paused: true});
export const closeMinigame = () => set({minigameId: null, paused: false});

export const completionPct = (s: GameState) =>
  Math.round((s.collected.length / COLLECTIBLES.length) * 100);
