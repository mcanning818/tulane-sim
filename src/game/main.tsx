import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {getState, player} from './state';
import {COLLECTIBLES} from './collectibles';

if (import.meta.env.DEV) {
  // Dev handle for poking at the sim from the console: __game.player, __game.state().
  (window as unknown as Record<string, unknown>).__game = {player, state: getState, COLLECTIBLES};
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
