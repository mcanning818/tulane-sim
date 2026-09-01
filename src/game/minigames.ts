export type Minigame = {
  id: string;
  name: string;
  blurb: string;
  status: 'prototype' | 'ready';
};

/** Registry shape is final; the games themselves land in v2. */
export const MINIGAMES: Minigame[] = [
  {
    id: 'streetcar-dash',
    name: 'Streetcar Dash',
    blurb: 'Beat the St. Charles streetcar from Gibson Hall to the LBC without touching a road.',
    status: 'prototype',
  },
];

export const minigameById = (id: string) => MINIGAMES.find((m) => m.id === id);
