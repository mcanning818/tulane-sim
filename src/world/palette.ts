// Flat, saturated, no-PBR palette. Everything reads at a glance from 12m up.
export const PALETTE = {
  sky: '#8fc6ea',
  fog: '#bcd9ec',
  ground: '#5f8f4a',
  quad: '#79b054',
  walk: '#d9cdb4',
  road: '#4a4a52',
  walls: ['#b9604a', '#cd7a58', '#d8c7a8', '#a07a66'],
  roofs: ['#7d6a72', '#8a7a80', '#6b8296'],
  trunk: '#5b4032',
  canopy: ['#3f7a3a', '#4c8c40', '#356b34'],
  player: {torso: '#0f7a4f', head: '#e8c39e', limbs: '#1c3f8f', shoes: '#2b2b2b'},
  accent: '#5ad2f0', // Tulane wave blue, used for pickups and UI
  olive: '#0b6b3a',
} as const;
