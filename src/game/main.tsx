import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {beginRun, closeRun, getState, openMinigame, player, teleport} from './state';
import {COLLECTIBLES} from './collectibles';
import {MINIGAMES} from './minigames';
import {NPCS} from './npcs';

if (import.meta.env.DEV) {
  // Dev handle for poking at the sim from the console: __game.player, __game.state(),
  // __game.teleport(x, z), __game.openMinigame('streetcar-dash').
  (window as unknown as Record<string, unknown>).__game = {
    player,
    state: getState,
    teleport,
    openMinigame,
    beginRun,
    closeRun,
    COLLECTIBLES,
    MINIGAMES,
    NPCS,
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
